import { NextResponse } from "next/server";
import { books as fallbackBooks } from "@/data/books";
import { bookPdfPath } from "@/lib/book-assets";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { hasPurchasedBook } from "@/lib/purchase-access";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getUserFromRequest(request);
  const payload = (await request.json().catch(() => null)) as
    | {
        finalPrice?: number;
        promoCode?: string;
      }
    | null;

  if (!user) {
    return NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
  }

  const { data: book } = await supabase
    .from("books")
    .select("id, slug, title_fr, price_eur, visible, pdf_file")
    .or(`slug.eq.${id},id.eq.${id}`)
    .maybeSingle();

  const fallback = fallbackBooks.find((item) => item.id === id);
  const resolvedId = book?.slug || fallback?.id || id;
  const resolvedTitle = book?.title_fr || fallback?.titleFr || resolvedId;
  const basePrice = Number(book?.price_eur ?? fallback?.priceEur ?? 0);
  const requestedFinalPrice = Number(payload?.finalPrice);
  const resolvedPrice =
    Number.isFinite(requestedFinalPrice) && requestedFinalPrice >= 0 && requestedFinalPrice <= basePrice
      ? Math.round(requestedFinalPrice * 100) / 100
      : basePrice;
  const resolvedPdf = book?.pdf_file || bookPdfPath(resolvedId);

  if ((book && book.visible === false) || (!book && !fallback)) {
    return NextResponse.json({ ok: false, message: "Livre introuvable." }, { status: 404 });
  }

  if (resolvedPrice > 0) {
    return NextResponse.json({ ok: false, message: "Ce livre doit etre achete." }, { status: 400 });
  }

  const admin = await isAdminUser(user);

  if (!admin) {
    const existing = await hasPurchasedBook(supabase, {
      userId: user.id,
      email: user.email,
      bookId: resolvedId,
    });

    if (!existing) {
      await supabase.from("downloads").insert({
        user_id: user.id,
        user_email: user.email || null,
        book_id: resolvedId,
        book_title: resolvedTitle,
        download_url: resolvedPdf,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Le livre est maintenant disponible dans votre espace lecteur.",
    readUrl: `/read/${resolvedId}`,
  });
}
