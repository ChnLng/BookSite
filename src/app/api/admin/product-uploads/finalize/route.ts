import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { deletePaidAsset, sanitizePaidAssetFilename, uploadPaidAssetStream } from "@/lib/github-paid-admin";
import {
  adminUploadStagingBucketName,
  githubReleaseMaxAssetBytes,
  type DocumentDeliveryMode,
  type ProductDocumentRecord,
  type ProductKind,
} from "@/lib/product-documents";
import {
  productDocumentSelect,
  resolveCategoryDocumentRules,
  resolveDocumentProduct,
  validateDocumentAgainstRules,
} from "@/lib/product-documents-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;
  if (!user) return NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 });
  if (!await isAdminUser(user, accessToken)) {
    return NextResponse.json({ ok: false, message: "Accès admin requis." }, { status: 403 });
  }
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "SUPABASE_SERVICE_ROLE_KEY manquant." }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as {
    productKind?: ProductKind;
    productId?: string;
    documentId?: string;
    stagedPath?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    labelFr?: string;
    labelZh?: string;
    deliveryMode?: DocumentDeliveryMode;
    visible?: boolean;
    sortOrder?: number;
  } | null;
  const productKind = payload?.productKind;
  const productId = String(payload?.productId || "").trim();
  const stagedPath = String(payload?.stagedPath || "").trim();
  const fileName = String(payload?.fileName || "").trim();
  const expectedFileSize = Number(payload?.fileSize || 0);
  const deliveryMode = payload?.deliveryMode || "download";

  if ((productKind !== "book" && productKind !== "resource") || !productId || !stagedPath || !fileName) {
    return NextResponse.json({ ok: false, message: "Finalisation incomplète." }, { status: 400 });
  }
  if (!stagedPath.startsWith(`pending/${user.id}/`)) {
    return NextResponse.json({ ok: false, message: "Chemin temporaire invalide." }, { status: 400 });
  }
  if (!Number.isSafeInteger(expectedFileSize) || expectedFileSize <= 0 || expectedFileSize > githubReleaseMaxAssetBytes) {
    return NextResponse.json({ ok: false, message: "Taille de fichier invalide." }, { status: 400 });
  }

  let newAssetReference = "";
  let oldAssetReference = "";
  try {
    const product = await resolveDocumentProduct(supabase, productKind, productId);
    if (!product || product.deletedAt) {
      return NextResponse.json({ ok: false, message: "Produit introuvable." }, { status: 404 });
    }
    const rules = await resolveCategoryDocumentRules(supabase, product.categoryId, productKind);
    const extension = validateDocumentAgainstRules({
      fileName,
      mimeType: payload?.mimeType,
      deliveryMode,
      allowedFileTypes: rules.allowedFileTypes,
      allowedDeliveryModes: rules.allowedDeliveryModes,
    });

    let existingDocument: ProductDocumentRecord | null = null;
    if (payload?.documentId) {
      const { data, error } = await supabase
        .from("product_documents")
        .select(productDocumentSelect)
        .eq("id", payload.documentId)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw new Error(error.message);
      existingDocument = data as ProductDocumentRecord | null;
      const belongsToProduct = existingDocument && (
        (productKind === "book" && existingDocument.book_id === product.id) ||
        (productKind === "resource" && existingDocument.resource_id === product.id)
      );
      if (!existingDocument || !belongsToProduct) {
        return NextResponse.json({ ok: false, message: "Document à remplacer introuvable." }, { status: 404 });
      }
      oldAssetReference = existingDocument.asset_reference;
    }

    const { data: signedDownload, error: signedError } = await supabase.storage
      .from(adminUploadStagingBucketName)
      .createSignedUrl(stagedPath, 600);
    if (signedError || !signedDownload?.signedUrl) {
      throw new Error(signedError?.message || "Fichier temporaire introuvable.");
    }
    const stagedResponse = await fetch(signedDownload.signedUrl, { cache: "no-store" });
    if (!stagedResponse.ok || !stagedResponse.body) throw new Error("Lecture du fichier temporaire impossible.");
    const contentLength = Number(stagedResponse.headers.get("content-length") || expectedFileSize);
    if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > githubReleaseMaxAssetBytes) {
      throw new Error("Taille du fichier temporaire invalide.");
    }

    const uniqueName = sanitizePaidAssetFilename(
      `${productKind}-${product.slug}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${extension}`,
    );
    const uploaded = await uploadPaidAssetStream({
      body: stagedResponse.body,
      contentLength,
      contentType: payload?.mimeType || stagedResponse.headers.get("content-type") || "application/octet-stream",
      fileName: uniqueName,
    });
    newAssetReference = uploaded.assetReference;

    const documentPayload = {
      product_kind: productKind,
      book_id: productKind === "book" ? product.id : null,
      resource_id: productKind === "resource" ? product.id : null,
      category_id: rules.categoryId || product.categoryId,
      label_fr: String(payload?.labelFr || fileName).trim() || fileName,
      label_zh: String(payload?.labelZh || "").trim() || null,
      file_name: fileName,
      file_extension: extension.slice(1),
      mime_type: payload?.mimeType || stagedResponse.headers.get("content-type") || "application/octet-stream",
      size_bytes: contentLength,
      asset_reference: newAssetReference,
      delivery_mode: deliveryMode,
      visible: payload?.visible !== false,
      sort_order: Number(payload?.sortOrder || existingDocument?.sort_order || 10),
      version: (existingDocument?.version || 0) + 1,
      updated_at: new Date().toISOString(),
    };

    const result = existingDocument
      ? await supabase.from("product_documents").update(documentPayload).eq("id", existingDocument.id).select(productDocumentSelect).single()
      : await supabase.from("product_documents").insert(documentPayload).select(productDocumentSelect).single();
    if (result.error || !result.data) {
      await deletePaidAsset(newAssetReference).catch(() => undefined);
      throw new Error(result.error?.message || "Enregistrement du document impossible.");
    }

    let cleanupWarning = "";
    if (oldAssetReference && oldAssetReference !== newAssetReference) {
      try {
        await deletePaidAsset(oldAssetReference);
      } catch (error) {
        cleanupWarning = error instanceof Error ? error.message : "Ancien fichier à nettoyer manuellement.";
      }
    }

    return NextResponse.json({ ok: true, document: result.data, cleanupWarning });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Finalisation impossible." },
      { status: 500 },
    );
  } finally {
    await supabase.storage.from(adminUploadStagingBucketName).remove([stagedPath]).catch(() => undefined);
  }
}
