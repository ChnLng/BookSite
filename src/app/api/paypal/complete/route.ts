import { NextResponse } from "next/server";
import { books as fallbackBooks } from "@/data/books";
import { bookPdfPath } from "@/lib/book-assets";
import { getUserFromRequest } from "@/lib/auth-request";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type ResolvedBook = {
  kind: "book";
  id: string;
  titleFr: string;
  downloadUrl: string;
};

type ResolvedResource = {
  kind: "resource";
  id: string;
  slug: string;
  titleFr: string;
  resourceFileId: string | null;
  downloadUrl: string | null;
};

type ResolvedPurchase = ResolvedBook | ResolvedResource;

async function resolveBook(bookId: string): Promise<ResolvedBook | null> {
  const supabase = getSupabaseServiceClient();

  if (supabase) {
    const { data } = await supabase
      .from("books")
      .select("id, slug, title_fr, pdf_file")
      .or(`slug.eq.${bookId},id.eq.${bookId}`)
      .maybeSingle();

    if (data) {
      const slug = data.slug || bookId;
      return {
        kind: "book",
        id: slug,
        titleFr: data.title_fr,
        downloadUrl: data.pdf_file || bookPdfPath(slug),
      };
    }
  }

  const fallback = fallbackBooks.find((book) => book.id === bookId);

  if (!fallback) {
    return null;
  }

  return {
    kind: "book",
    id: fallback.id,
    titleFr: fallback.titleFr,
    downloadUrl: bookPdfPath(fallback.id),
  };
}

async function resolveResource(resourceId: string): Promise<ResolvedResource | null> {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const { data: resource } = await supabase
    .from("resource_items")
    .select("id, slug, title_fr, visible")
    .or(`slug.eq.${resourceId},id.eq.${resourceId}`)
    .maybeSingle();

  if (!resource || resource.visible === false) {
    return null;
  }

  const { data: firstFile } = await supabase
    .from("resource_item_files")
    .select("id, file_path, file_url, external_url")
    .eq("resource_id", resource.id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    kind: "resource",
    id: resource.id,
    slug: resource.slug || resource.id,
    titleFr: resource.title_fr || resource.slug || resource.id,
    resourceFileId: firstFile?.id || null,
    downloadUrl: firstFile?.file_path || firstFile?.file_url || firstFile?.external_url || null,
  };
}

export async function POST(request: Request) {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        bookId?: string;
        resourceId?: string;
        orderId?: string;
        payerEmail?: string;
        amountPaid?: number;
        captureId?: string;
      }
    | null;

  const bookId = String(payload?.bookId || "").trim();
  const resourceId = String(payload?.resourceId || "").trim();
  const orderId = String(payload?.orderId || "").trim();
  const payerEmail = String(payload?.payerEmail || "").trim();
  const amountPaid = Number.isFinite(Number(payload?.amountPaid)) ? Math.max(0, Number(payload?.amountPaid)) : 0;
  const captureId = String(payload?.captureId || "").trim() || null;

  if ((!bookId && !resourceId) || !orderId) {
    return NextResponse.json({ ok: false, message: "Paiement PayPal incomplet." }, { status: 400 });
  }

  let purchase: ResolvedPurchase | null = null;

  if (resourceId) {
    purchase = await resolveResource(resourceId);
  } else if (bookId) {
    purchase = await resolveBook(bookId);
  }

  if (!purchase) {
    return NextResponse.json(
      { ok: false, message: resourceId ? "Ressource introuvable." : "Livre introuvable." },
      { status: 404 },
    );
  }

  const { data: existing } = await supabase
    .from("downloads")
    .select("id")
    .eq("paypal_order_id", orderId)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({
      ok: true,
      alreadyRecorded: true,
      accountUrl: "/account",
      readUrl: purchase.kind === "book" ? `/read/${purchase.id}` : undefined,
      resourceUrl: purchase.kind === "resource" ? `/outils/${purchase.slug}` : undefined,
    });
  }

  const user = await getUserFromRequest(request);
  const purchaserEmail = user?.email || payerEmail || null;

  const { error } =
    purchase.kind === "book"
      ? await supabase.from("downloads").insert({
          user_id: user?.id || null,
          user_email: purchaserEmail,
          book_id: purchase.id,
          book_title: purchase.titleFr,
          download_url: purchase.downloadUrl,
          paypal_order_id: orderId,
          amount_paid: amountPaid,
          currency: "EUR",
          payment_status: amountPaid > 0 ? "paid" : "free",
          paid_at: new Date().toISOString(),
          paypal_capture_id: captureId,
        })
      : await supabase.from("downloads").insert({
          user_id: user?.id || null,
          user_email: purchaserEmail,
          download_kind: "resource",
          resource_id: purchase.id,
          resource_title: purchase.titleFr,
          resource_file_id: purchase.resourceFileId,
          download_url: purchase.downloadUrl,
          paypal_order_id: orderId,
          amount_paid: amountPaid,
          currency: "EUR",
          payment_status: amountPaid > 0 ? "paid" : "free",
          paid_at: new Date().toISOString(),
          paypal_capture_id: captureId,
        });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    accountUrl: "/account",
    readUrl: purchase.kind === "book" ? `/read/${purchase.id}` : undefined,
    resourceUrl: purchase.kind === "resource" ? `/outils/${purchase.slug}` : undefined,
  });
}
