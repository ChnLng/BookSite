import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { getSupabaseRequestClient, getSupabaseServiceClient } from "@/lib/supabase-server";

async function requireAdmin(request: Request) {
  const user = await getUserFromRequest(request);
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;
  if (!user) return { error: NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 }) };
  if (!(await isAdminUser(user, token))) return { error: NextResponse.json({ ok: false, message: "Acces admin requis." }, { status: 403 }) };
  return { token };
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const supabase = getSupabaseServiceClient() || getSupabaseRequestClient(auth.token);
  if (!supabase) return NextResponse.json({ ok: false, message: "Supabase indisponible." }, { status: 503 });

  const [sectionsResult, booksResult, resourcesResult, linksResult, purchasesResult] = await Promise.all([
    supabase.from("content_sections").select("section_key, title, sort_order").eq("visible", true).order("sort_order"),
    supabase.from("books").select("id, slug, title_fr, title_zh, sort_order, deleted_at").is("deleted_at", null).order("sort_order"),
    supabase.from("resource_items").select("id, slug, title_fr, sort_order, deleted_at").is("deleted_at", null).order("sort_order"),
    supabase.from("partner_links").select("id, title_fr, sort_order, deleted_at").is("deleted_at", null).order("sort_order"),
    supabase.from("downloads").select("id, book_id, resource_id, user_email, book_title, resource_title, amount_paid, currency, download_count, last_downloaded_at, created_at"),
  ]);

  const error = sectionsResult.error || booksResult.error || resourcesResult.error || linksResult.error || purchasesResult.error;
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const purchases = purchasesResult.data || [];
  const summarize = (kind: "book" | "resource" | "link", id: string, slug?: string | null) => {
    const rows = purchases.filter((row) => kind === "book"
      ? row.book_id === id || row.book_id === slug
      : kind === "resource" ? row.resource_id === id : false);
    const latestPurchase = [...rows].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))[0];
    const latestDownload = [...rows].filter((row) => row.last_downloaded_at).sort((a, b) => String(b.last_downloaded_at).localeCompare(String(a.last_downloaded_at)))[0];
    return {
      sales: rows.length,
      downloads: rows.reduce((sum, row) => sum + Number(row.download_count || 0), 0),
      revenue: rows.reduce((sum, row) => sum + Number(row.amount_paid || 0), 0),
      lastPurchasedAt: latestPurchase?.created_at || null,
      lastDownloadedAt: latestDownload?.last_downloaded_at || null,
      lastBuyer: latestPurchase?.user_email || null,
      lastDownloader: latestDownload?.user_email || null,
      lastAmount: latestPurchase?.amount_paid == null ? null : Number(latestPurchase.amount_paid),
      currency: latestPurchase?.currency || "EUR",
    };
  };

  const productsBySection: Record<string, Array<Record<string, unknown>>> = {
    albums: (booksResult.data || []).map((book) => ({ id: book.id, name: `${book.title_zh || ""} ${book.title_fr || ""}`.trim(), sortOrder: book.sort_order || 0, ...summarize("book", book.id, book.slug) })),
    "coin-ludique": (resourcesResult.data || []).map((item) => ({ id: item.id, name: item.title_fr || item.slug || item.id, sortOrder: item.sort_order || 0, ...summarize("resource", item.id, item.slug) })),
    "liens-partenaires": (linksResult.data || []).map((item) => ({ id: item.id, name: item.title_fr || item.id, sortOrder: item.sort_order || 0, ...summarize("link", item.id) })),
  };

  const sections = (sectionsResult.data || []).map((section) => {
    const products = productsBySection[section.section_key] || [];
    return {
      key: section.section_key,
      title: section.title,
      sortOrder: section.sort_order,
      products,
      sales: products.reduce((sum, item) => sum + Number(item.sales || 0), 0),
      downloads: products.reduce((sum, item) => sum + Number(item.downloads || 0), 0),
      revenue: products.reduce((sum, item) => sum + Number(item.revenue || 0), 0),
    };
  });

  return NextResponse.json({ ok: true, sections });
}
