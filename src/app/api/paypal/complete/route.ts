import { NextResponse } from "next/server";
import { books as fallbackBooks } from "@/data/books";
import { bookPdfPath } from "@/lib/book-assets";
import { getUserFromRequest } from "@/lib/auth-request";
import { paypalAccessToken, paypalBaseUrl } from "@/lib/paypal-server";
import { applyDiscount } from "@/lib/promo";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type ResolvedBook = {
  kind: "book";
  id: string;
  titleFr: string;
  downloadUrl: string;
  priceEur: number;
};

type ResolvedResource = {
  kind: "resource";
  id: string;
  slug: string;
  titleFr: string;
  resourceFileId: string | null;
  downloadUrl: string | null;
  priceEur: number;
};

type ResolvedPurchase = ResolvedBook | ResolvedResource;

async function resolveBook(bookId: string): Promise<ResolvedBook | null> {
  const supabase = getSupabaseServiceClient();

  if (supabase) {
    const { data } = await supabase
      .from("books")
      .select("id, slug, title_fr, pdf_file, price_eur")
      .or(`slug.eq.${bookId},id.eq.${bookId}`)
      .maybeSingle();

    if (data) {
      const slug = data.slug || bookId;
      const fallback = fallbackBooks.find((book) => book.id === slug || book.id === bookId);
      return {
        kind: "book",
        id: slug,
        titleFr: data.title_fr,
        downloadUrl: data.pdf_file || bookPdfPath(slug),
        priceEur: Number(data.price_eur ?? fallback?.priceEur ?? 0),
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
    priceEur: fallback.priceEur,
  };
}

async function resolveResource(resourceId: string): Promise<ResolvedResource | null> {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const { data: resource } = await supabase
    .from("resource_items")
    .select("id, slug, title_fr, visible, price_eur")
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
    priceEur: Number(resource.price_eur || 0),
  };
}

async function expectedPrice(basePrice: number, promoCode: string) {
  if (!promoCode) return basePrice;

  const supabase = getSupabaseServiceClient();
  if (!supabase) return basePrice;

  const { data } = await supabase
    .from("promo_codes")
    .select("discount_type, discount_value, discount_percent, expires_at, valid_from, valid_until, is_active, active")
    .eq("code", promoCode)
    .maybeSingle();

  if (!data || !Boolean(data.is_active ?? data.active)) return basePrice;

  const now = Date.now();
  const validFrom = data.valid_from ? new Date(data.valid_from).getTime() : null;
  const validUntil = data.expires_at
    ? new Date(data.expires_at).getTime()
    : data.valid_until
      ? new Date(data.valid_until).getTime()
      : null;

  if ((validFrom && now < validFrom) || (validUntil && now > validUntil)) return basePrice;

  const discountType = String(data.discount_type || (data.discount_percent != null ? "percentage" : "free_share"));
  if (discountType === "free_share") return 0;

  return applyDiscount(basePrice, Number(data.discount_value ?? data.discount_percent ?? 0));
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
        promoCode?: string;
      }
    | null;

  const bookId = String(payload?.bookId || "").trim();
  const resourceId = String(payload?.resourceId || "").trim();
  const orderId = String(payload?.orderId || "").trim();
  const promoCode = String(payload?.promoCode || "").trim().toUpperCase();

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

  let verifiedOrder: any;
  try {
    const accessToken = await paypalAccessToken();
    const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    verifiedOrder = await response.json();
    if (!response.ok || verifiedOrder?.status !== "COMPLETED") {
      throw new Error("Paiement PayPal non confirme.");
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Verification PayPal impossible." },
      { status: 400 },
    );
  }

  const unit = verifiedOrder.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const amountPaid = Number(capture?.amount?.value ?? unit?.amount?.value ?? NaN);
  const currency = String(capture?.amount?.currency_code ?? unit?.amount?.currency_code ?? "");
  const paidProductId = String(unit?.custom_id || "");
  const validProductIds = purchase.kind === "book" ? [purchase.id, bookId] : [purchase.id, purchase.slug, resourceId];
  const requiredAmount = await expectedPrice(purchase.priceEur, promoCode);

  if (
    capture?.status !== "COMPLETED" ||
    currency !== "EUR" ||
    !Number.isFinite(amountPaid) ||
    Math.abs(amountPaid - requiredAmount) > 0.001 ||
    !validProductIds.includes(paidProductId)
  ) {
    return NextResponse.json({ ok: false, message: "Les details du paiement PayPal ne correspondent pas au produit." }, { status: 400 });
  }

  const payerEmail = String(verifiedOrder.payer?.email_address || "").trim();
  const captureId = String(capture?.id || "").trim() || null;

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
          currency,
          payment_status: amountPaid > 0 ? "paid" : "free",
          paid_at: capture?.create_time || new Date().toISOString(),
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
          currency,
          payment_status: amountPaid > 0 ? "paid" : "free",
          paid_at: capture?.create_time || new Date().toISOString(),
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
