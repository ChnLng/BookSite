import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { deletePaidAsset } from "@/lib/github-paid-admin";
import { canViewMimeType, type DocumentDeliveryMode, type ProductDocumentRecord, type ProductKind } from "@/lib/product-documents";
import {
  productDocumentSelect,
  resolveCategoryDocumentRules,
  resolveDocumentProduct,
} from "@/lib/product-documents-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

async function getAdminContext(request: Request) {
  const user = await getUserFromRequest(request);
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;
  if (!user) return { error: NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 }) };
  if (!await isAdminUser(user, accessToken)) {
    return { error: NextResponse.json({ ok: false, message: "Accès admin requis." }, { status: 403 }) };
  }
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { error: NextResponse.json({ ok: false, message: "SUPABASE_SERVICE_ROLE_KEY manquant." }, { status: 503 }) };
  }
  return { supabase };
}

export async function GET(request: Request) {
  const context = await getAdminContext(request);
  if (context.error || !context.supabase) return context.error;
  const { searchParams } = new URL(request.url);
  const productKind = searchParams.get("productKind") as ProductKind | null;
  const productId = searchParams.get("productId") || "";
  if ((productKind !== "book" && productKind !== "resource") || !productId) {
    return NextResponse.json({ ok: false, message: "Produit invalide." }, { status: 400 });
  }
  try {
    const product = await resolveDocumentProduct(context.supabase, productKind, productId);
    if (!product) return NextResponse.json({ ok: false, message: "Produit introuvable." }, { status: 404 });
    const productColumn = productKind === "book" ? "book_id" : "resource_id";
    const [{ data, error }, rules] = await Promise.all([
      context.supabase
        .from("product_documents")
        .select(productDocumentSelect)
        .eq(productColumn, product.id)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      resolveCategoryDocumentRules(context.supabase, product.categoryId, productKind),
    ]);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, documents: data || [], rules, product });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Lecture impossible." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const context = await getAdminContext(request);
  if (context.error || !context.supabase) return context.error;
  const payload = (await request.json().catch(() => null)) as {
    id?: string;
    labelFr?: string;
    labelZh?: string;
    deliveryMode?: DocumentDeliveryMode;
    visible?: boolean;
    sortOrder?: number;
  } | null;
  if (!payload?.id) return NextResponse.json({ ok: false, message: "Document manquant." }, { status: 400 });
  const { data: existing, error: readError } = await context.supabase
    .from("product_documents")
    .select(productDocumentSelect)
    .eq("id", payload.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (readError) return NextResponse.json({ ok: false, message: readError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, message: "Document introuvable." }, { status: 404 });

  const document = existing as ProductDocumentRecord;
  const rules = await resolveCategoryDocumentRules(context.supabase, document.category_id, document.product_kind);
  const nextDeliveryMode = payload.deliveryMode || document.delivery_mode;
  const permitted = nextDeliveryMode === "both"
    ? rules.allowedDeliveryModes.includes("download") && rules.allowedDeliveryModes.includes("view")
    : rules.allowedDeliveryModes.includes(nextDeliveryMode);
  if (!permitted) {
    return NextResponse.json({ ok: false, message: "Mode de livraison interdit pour cette catégorie." }, { status: 400 });
  }
  if (
    (nextDeliveryMode === "view" || nextDeliveryMode === "both")
    && !canViewMimeType(document.mime_type, document.file_extension)
  ) {
    return NextResponse.json({ ok: false, message: "Ce format ne peut être proposé qu'en téléchargement." }, { status: 400 });
  }
  const { data, error } = await context.supabase.from("product_documents").update({
    label_fr: payload.labelFr?.trim() || document.label_fr,
    label_zh: payload.labelZh?.trim() || null,
    delivery_mode: nextDeliveryMode,
    visible: payload.visible ?? document.visible,
    sort_order: Number(payload.sortOrder ?? document.sort_order),
    updated_at: new Date().toISOString(),
  }).eq("id", document.id).select(productDocumentSelect).single();
  return error
    ? NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    : NextResponse.json({ ok: true, document: data });
}

export async function DELETE(request: Request) {
  const context = await getAdminContext(request);
  if (context.error || !context.supabase) return context.error;
  const payload = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!payload?.id) return NextResponse.json({ ok: false, message: "Document manquant." }, { status: 400 });
  const { data, error } = await context.supabase
    .from("product_documents")
    .select(productDocumentSelect)
    .eq("id", payload.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, message: "Document introuvable." }, { status: 404 });

  const document = data as ProductDocumentRecord;
  const { error: deleteError } = await context.supabase.from("product_documents").update({
    visible: false,
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", document.id);
  if (deleteError) return NextResponse.json({ ok: false, message: deleteError.message }, { status: 500 });

  let cleanupWarning = "";
  try {
    await deletePaidAsset(document.asset_reference);
  } catch (cleanupError) {
    cleanupWarning = cleanupError instanceof Error ? cleanupError.message : "Fichier GitHub à nettoyer manuellement.";
  }
  return NextResponse.json({ ok: true, cleanupWarning });
}
