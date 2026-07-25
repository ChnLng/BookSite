import { NextResponse } from "next/server";
import { books as fallbackBooks } from "@/data/books";
import { bookPdfPath } from "@/lib/book-assets";
import { getUserFromRequest } from "@/lib/auth-request";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type ResolvedBook = {
  id: string;
  titleFr: string;
  pdfFile: string;
};

async function resolveBook(bookId: string): Promise<ResolvedBook | null> {
  const supabase = getSupabaseServiceClient();

  if (supabase) {
    const { data } = await supabase
      .from("books")
      .select("id, slug, title_fr, price_eur, pdf_file, cover_image")
      .or(`slug.eq.${bookId},id.eq.${bookId}`)
      .maybeSingle();

    if (data) {
      const slug = data.slug || bookId;
      return {
        id: slug,
        titleFr: data.title_fr,
        pdfFile: data.pdf_file || bookPdfPath(slug),
      };
    }
  }

  const fallback = fallbackBooks.find((book) => book.id === bookId);

  if (!fallback) {
    return null;
  }

  return {
    id: fallback.id,
    titleFr: fallback.titleFr,
    pdfFile: bookPdfPath(fallback.id),
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
        orderId?: string;
        payerEmail?: string;
        payerName?: string;
      }
    | null;

  const bookId = String(payload?.bookId || "").trim();
  const orderId = String(payload?.orderId || "").trim();
  const payerEmail = String(payload?.payerEmail || "").trim();

  if (!bookId || !orderId) {
    return NextResponse.json({ ok: false, message: "Paiement PayPal incomplet." }, { status: 400 });
  }

  const book = await resolveBook(bookId);

  if (!book) {
    return NextResponse.json({ ok: false, message: "Livre introuvable." }, { status: 404 });
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
      readUrl: `/read/${book.id}`,
    });
  }

  const user = await getUserFromRequest(request);
  const purchaserEmail = user?.email || payerEmail || null;

  const { error } = await supabase.from("downloads").insert({
    user_id: user?.id || null,
    user_email: purchaserEmail,
    book_id: book.id,
    book_title: book.titleFr,
    download_url: book.pdfFile,
    paypal_order_id: orderId,
  });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    accountUrl: "/account",
    readUrl: `/read/${book.id}`,
  });
}
