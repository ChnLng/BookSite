import { NextResponse } from "next/server";
import { books as fallbackBooks } from "@/data/books";
import { bookPdfPath } from "@/lib/book-assets";
import { getUserFromRequest } from "@/lib/auth-request";
import { hasPurchasedBook } from "@/lib/purchase-access";
import { applyDiscount } from "@/lib/promo";
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
  const promoCode = String(payload?.promoCode || "").trim().toUpperCase();
  let resolvedPrice = basePrice;

  if (promoCode) {
    const { data: promo } = await supabase
      .from("promo_codes")
      .select("discount_type, discount_value, discount_percent, expires_at, valid_from, valid_until, is_active, active")
      .eq("code", promoCode)
      .maybeSingle();
    const now = Date.now();
    const validFrom = promo?.valid_from ? new Date(promo.valid_from).getTime() : null;
    const validUntil = promo?.expires_at
      ? new Date(promo.expires_at).getTime()
      : promo?.valid_until
        ? new Date(promo.valid_until).getTime()
        : null;
    const active = Boolean(promo && (promo.is_active ?? promo.active));
    const withinDates = (!validFrom || now >= validFrom) && (!validUntil || now <= validUntil);

    if (promo && active && withinDates) {
      const type = String(promo.discount_type || (promo.discount_percent != null ? "percentage" : "free_share"));
      resolvedPrice = type === "free_share"
        ? 0
        : applyDiscount(basePrice, Number(promo.discount_value ?? promo.discount_percent ?? 0));
    }
  }
  const resolvedPdf = book?.pdf_file || bookPdfPath(resolvedId);

  if ((book && book.visible === false) || (!book && !fallback)) {
    return NextResponse.json({ ok: false, message: "Livre introuvable." }, { status: 404 });
  }

  if (resolvedPrice > 0) {
    return NextResponse.json({ ok: false, message: "Ce livre doit etre achete." }, { status: 400 });
  }

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
      amount_paid: 0,
      currency: "EUR",
      payment_status: "free",
      paid_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Le livre est maintenant disponible dans votre espace lecteur.",
    readUrl: `/read/${resolvedId}`,
  });
}
