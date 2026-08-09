import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import {
  adminUploadStagingBucketName,
  githubReleaseMaxAssetBytes,
  type DocumentDeliveryMode,
  type ProductKind,
} from "@/lib/product-documents";
import {
  resolveCategoryDocumentRules,
  resolveDocumentProduct,
  validateDocumentAgainstRules,
} from "@/lib/product-documents-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

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
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    deliveryMode?: DocumentDeliveryMode;
  } | null;
  const productKind = payload?.productKind;
  const productId = String(payload?.productId || "").trim();
  const fileName = String(payload?.fileName || "").trim();
  const fileSize = Number(payload?.fileSize || 0);
  const deliveryMode = payload?.deliveryMode || "download";

  if ((productKind !== "book" && productKind !== "resource") || !productId || !fileName) {
    return NextResponse.json({ ok: false, message: "Informations produit ou fichier incomplètes." }, { status: 400 });
  }
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > githubReleaseMaxAssetBytes) {
    return NextResponse.json({ ok: false, message: "Le fichier doit être inférieur à 2 Gio." }, { status: 400 });
  }

  try {
    const product = await resolveDocumentProduct(supabase, productKind, productId);
    if (!product || product.deletedAt) {
      return NextResponse.json({ ok: false, message: "Produit introuvable." }, { status: 404 });
    }
    const rules = await resolveCategoryDocumentRules(supabase, product.categoryId, productKind);
    validateDocumentAgainstRules({
      fileName,
      mimeType: payload?.mimeType,
      deliveryMode,
      allowedFileTypes: rules.allowedFileTypes,
      allowedDeliveryModes: rules.allowedDeliveryModes,
    });

    await supabase.storage.createBucket(adminUploadStagingBucketName, {
      public: false,
      allowedMimeTypes: null,
    });
    await supabase.storage.updateBucket(adminUploadStagingBucketName, {
      public: false,
      allowedMimeTypes: null,
    });

    const userStagingPrefix = `pending/${user.id}`;
    const { data: stagedEntries } = await supabase.storage
      .from(adminUploadStagingBucketName)
      .list(userStagingPrefix, { limit: 100, sortBy: { column: "created_at", order: "asc" } });
    const staleCutoff = Date.now() - 24 * 60 * 60 * 1000;
    const stalePaths = (stagedEntries || [])
      .filter((entry) => entry.id && entry.created_at && new Date(entry.created_at).getTime() < staleCutoff)
      .map((entry) => `${userStagingPrefix}/${entry.name}`);
    if (stalePaths.length > 0) {
      await supabase.storage.from(adminUploadStagingBucketName).remove(stalePaths);
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
    const stagedPath = `${userStagingPrefix}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const { data, error } = await supabase.storage
      .from(adminUploadStagingBucketName)
      .createSignedUploadUrl(stagedPath, { upsert: true });
    if (error || !data?.token) throw new Error(error?.message || "Lien d'upload indisponible.");

    return NextResponse.json({
      ok: true,
      bucket: adminUploadStagingBucketName,
      stagedPath,
      token: data.token,
      maxBytes: githubReleaseMaxAssetBytes,
      allowedFileTypes: rules.allowedFileTypes,
      allowedDeliveryModes: rules.allowedDeliveryModes,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Préparation impossible." },
      { status: 500 },
    );
  }
}
