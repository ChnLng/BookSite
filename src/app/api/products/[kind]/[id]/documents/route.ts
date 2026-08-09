import { NextResponse } from "next/server";
import { type PublicProductDocument, type ProductDocumentRecord, type ProductKind } from "@/lib/product-documents";
import { productDocumentSelect, resolveDocumentProduct } from "@/lib/product-documents-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RouteContext = { params: Promise<{ kind: string; id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { kind, id } = await context.params;
  const productKind = kind as ProductKind;
  if (productKind !== "book" && productKind !== "resource") {
    return NextResponse.json({ ok: false, message: "Type de produit invalide." }, { status: 400 });
  }
  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });

  try {
    const product = await resolveDocumentProduct(supabase, productKind, id);
    if (!product || !product.visible || product.deletedAt) {
      return NextResponse.json({ ok: false, message: "Produit introuvable." }, { status: 404 });
    }
    const productColumn = productKind === "book" ? "book_id" : "resource_id";
    const { data, error } = await supabase
      .from("product_documents")
      .select(productDocumentSelect)
      .eq(productColumn, product.id)
      .eq("visible", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const documents = ((data || []) as ProductDocumentRecord[]).map<PublicProductDocument>((document) => ({
      id: document.id,
      labelFr: document.label_fr,
      labelZh: document.label_zh || "",
      fileName: document.file_name,
      fileExtension: document.file_extension,
      mimeType: document.mime_type,
      sizeBytes: Number(document.size_bytes || 0),
      deliveryMode: document.delivery_mode,
      sortOrder: document.sort_order,
    }));
    return NextResponse.json({ ok: true, documents });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Lecture impossible." }, { status: 500 });
  }
}
