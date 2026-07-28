import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { getSupabaseRequestClient, getSupabaseServiceClient } from "@/lib/supabase-server";

async function adminClient(request: Request) {
  const user = await getUserFromRequest(request);
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;
  if (!user || !(await isAdminUser(user, token))) return null;
  return getSupabaseServiceClient() || getSupabaseRequestClient(token);
}

export async function GET(request: Request) {
  const supabase = await adminClient(request);
  if (!supabase) return NextResponse.json({ ok: false, message: "Acces admin requis." }, { status: 403 });

  const [sectionsResult, catalogResult, purchasesResult] = await Promise.all([
    supabase.from("content_sections").select("section_key, title, sort_order").eq("visible", true).order("sort_order"),
    supabase.from("product_report_catalog").select("product_kind, product_ref, category_key, product_name, product_sort_order, active").order("product_sort_order"),
    supabase.from("downloads").select("id, book_id, resource_id, user_email, amount_paid, currency, download_count, last_downloaded_at, created_at"),
  ]);
  const error = sectionsResult.error || catalogResult.error || purchasesResult.error;
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const purchases = purchasesResult.data || [];
  const products = (catalogResult.data || []).map((product) => {
    const rows = purchases.filter((row) => product.product_kind === "book"
      ? row.book_id === product.product_ref
      : product.product_kind === "resource" ? row.resource_id === product.product_ref : false);
    const byPurchase = [...rows].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    const lastPurchase = byPurchase[0];
    return {
      kind: product.product_kind,
      ref: product.product_ref,
      categoryKey: product.category_key,
      name: product.product_name,
      active: product.active,
      sales: rows.length,
      downloads: rows.reduce((sum, row) => sum + Number(row.download_count || 0), 0),
      revenue: rows.reduce((sum, row) => sum + Number(row.amount_paid || 0), 0),
      lastPurchasedAt: lastPurchase?.created_at || null,
      lastDownloadedAt: lastPurchase?.last_downloaded_at || null,
      lastBuyer: lastPurchase?.user_email || null,
      lastAmount: lastPurchase?.amount_paid == null ? null : Number(lastPurchase.amount_paid),
      currency: lastPurchase?.currency || "EUR",
    };
  });

  const sections = (sectionsResult.data || []).map((section) => {
    const sectionProducts = products.filter((product) => product.categoryKey === section.section_key);
    return {
      key: section.section_key,
      title: section.title,
      products: sectionProducts,
      sales: sectionProducts.reduce((sum, item) => sum + item.sales, 0),
      downloads: sectionProducts.reduce((sum, item) => sum + item.downloads, 0),
      revenue: sectionProducts.reduce((sum, item) => sum + item.revenue, 0),
    };
  });
  return NextResponse.json({ ok: true, sections });
}

export async function DELETE(request: Request) {
  const supabase = await adminClient(request);
  if (!supabase) return NextResponse.json({ ok: false, message: "Acces admin requis." }, { status: 403 });
  const payload = (await request.json().catch(() => null)) as { kind?: string; ref?: string } | null;
  const kind = String(payload?.kind || "");
  const ref = String(payload?.ref || "");
  if (!kind || !ref) return NextResponse.json({ ok: false, message: "Produit statistique manquant." }, { status: 400 });

  const deleteHistory = kind === "book"
    ? await supabase.from("downloads").delete().eq("book_id", ref)
    : kind === "resource" ? await supabase.from("downloads").delete().eq("resource_id", ref) : { error: null };
  if (deleteHistory.error) return NextResponse.json({ ok: false, message: deleteHistory.error.message }, { status: 500 });
  const { error } = await supabase.from("product_report_catalog").delete().eq("product_kind", kind).eq("product_ref", ref);
  return error ? NextResponse.json({ ok: false, message: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
