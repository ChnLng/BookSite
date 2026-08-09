import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { createProductDocumentGrant, productDocumentGrantCookieName } from "@/lib/product-document-grants";
import {
  canViewMimeType,
  type ProductDocumentRecord,
  type ProductKind,
} from "@/lib/product-documents";
import { productDocumentSelect, resolveDocumentProduct } from "@/lib/product-documents-server";
import { hasPurchasedBook, hasPurchasedResource } from "@/lib/purchase-access";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RouteContext = { params: Promise<{ kind: string; id: string; documentId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { kind, id, documentId } = await context.params;
  const productKind = kind as ProductKind;
  if (productKind !== "book" && productKind !== "resource") {
    return NextResponse.json({ ok: false, message: "Type de produit invalide." }, { status: 400 });
  }
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 });
  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });

  try {
    const body = await request.json().catch(() => ({})) as { mode?: string };
    const mode = body.mode === "view" ? "view" : "download";
    const product = await resolveDocumentProduct(supabase, productKind, id);
    if (!product || !product.visible || product.deletedAt) {
      return NextResponse.json({ ok: false, message: "Produit introuvable." }, { status: 404 });
    }

    const productColumn = productKind === "book" ? "book_id" : "resource_id";
    const { data, error } = await supabase
      .from("product_documents")
      .select(productDocumentSelect)
      .eq("id", documentId)
      .eq(productColumn, product.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const document = data as ProductDocumentRecord | null;
    if (!document || !document.visible || document.deleted_at) {
      return NextResponse.json({ ok: false, message: "Document introuvable." }, { status: 404 });
    }
    if (mode === "download" && document.delivery_mode === "view") {
      return NextResponse.json({ ok: false, message: "Ce document est disponible uniquement en lecture." }, { status: 403 });
    }
    if (mode === "view" && (document.delivery_mode === "download" || !canViewMimeType(document.mime_type, document.file_extension))) {
      return NextResponse.json({ ok: false, message: "Ce format n'est pas disponible en lecture en ligne." }, { status: 403 });
    }

    const purchased = productKind === "book"
      ? await hasPurchasedBook(supabase, { userId: user.id, email: user.email, bookId: product.slug })
      : await hasPurchasedResource(supabase, {
          userId: user.id,
          email: user.email,
          resourceId: product.id,
          resourceSlug: product.slug,
        });
    if (!purchased) return NextResponse.json({ ok: false, message: "Accès non autorisé." }, { status: 403 });

    const grant = createProductDocumentGrant({
      productKind,
      productId: product.id,
      documentId,
      mode,
      userId: user.id,
    });
    const query = new URLSearchParams({ mode });
    const response = NextResponse.json({
      ok: true,
      url: `/api/products/${productKind}/${encodeURIComponent(product.id)}/documents/${encodeURIComponent(documentId)}?${query.toString()}`,
      expiresAt: grant.expiresAt,
    });
    response.cookies.set({
      name: productDocumentGrantCookieName(documentId, mode),
      value: `${user.id}.${grant.expiresAt}.${grant.signature}`,
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "strict",
      path: `/api/products/${productKind}/${encodeURIComponent(product.id)}/documents/${encodeURIComponent(documentId)}`,
      maxAge: Math.max(1, grant.expiresAt - Math.floor(Date.now() / 1000)),
    });
    return response;
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Accès impossible." }, { status: 500 });
  }
}
