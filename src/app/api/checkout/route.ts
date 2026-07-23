import Stripe from "stripe";
import { NextResponse } from "next/server";
import { books, donationOptions } from "@/data/books";
import { bookAssetExtensions, bookCoverPath, bookPdfPath } from "@/lib/book-assets";
import { applyDiscount } from "@/lib/promo";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

type CheckoutBook = {
  id: string;
  titleFr: string;
  synopsisFr: string;
  priceEur: number;
  pdfFile: string;
  coverImage: string;
};

function resolveAssetUrl(assetPath: string, origin: string) {
  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const normalized = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return new URL(normalized, origin).toString();
}

async function resolveBook(bookId: string): Promise<CheckoutBook | null> {
  const supabase = getSupabaseServiceClient();

  if (supabase) {
    const { data } = await supabase
      .from("books")
      .select("slug, title_fr, synopsis_fr, price_eur, pdf_file, cover_image")
      .or(`slug.eq.${bookId},id.eq.${bookId}`)
      .maybeSingle();

    if (data) {
      const slug = data.slug || bookId;
      return {
        id: slug,
        titleFr: data.title_fr,
        synopsisFr: data.synopsis_fr || "",
        priceEur: Number(data.price_eur ?? 0),
        pdfFile: data.pdf_file || bookPdfPath(slug),
        coverImage: data.cover_image || bookCoverPath(slug, bookAssetExtensions[slug] || "jpg"),
      };
    }
  }

  const fallback = books.find((item) => item.id === bookId);

  if (!fallback) {
    return null;
  }

  return {
    id: fallback.id,
    titleFr: fallback.titleFr,
    synopsisFr: fallback.synopsisFr,
    priceEur: fallback.priceEur,
    pdfFile: bookPdfPath(fallback.id),
    coverImage: bookCoverPath(fallback.id, bookAssetExtensions[fallback.id] || "jpg"),
  };
}

async function resolvePromoDiscount(promoCode?: string) {
  if (!promoCode?.trim()) {
    return 0;
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return 0;
  }

  const { data } = await supabase
    .from("promo_codes")
    .select("discount_percent, valid_from, valid_until, active")
    .eq("code", promoCode.trim().toUpperCase())
    .maybeSingle();

  if (!data || !data.active) {
    return 0;
  }

  const now = new Date();
  const start = new Date(data.valid_from);
  const end = new Date(data.valid_until);

  if (now < start || now > end) {
    return 0;
  }

  return Number(data.discount_percent);
}

export async function POST(request: Request) {
  if (!stripeSecretKey) {
    return NextResponse.json({
      ok: false,
      message: "STRIPE_SECRET_KEY manquant. L'interface locale reste visible.",
    });
  }

  const payload = await request.json();
  const kind = String(payload.kind || "book");
  const origin = request.headers.get("origin") || "http://localhost:3000";
  const stripe = new Stripe(stripeSecretKey);

  if (kind === "donation") {
    const donation = donationOptions.find((item) => item.id === payload.id);
    const amount = donation?.amount ?? 5;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/account?success=1`,
      cancel_url: `${origin}/?cancel=1`,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Donation ${donation?.label ?? "Visd AR"}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
    });

    return NextResponse.json({ ok: true, url: session.url });
  }

  const book = await resolveBook(String(payload.id || ""));

  if (!book) {
    return NextResponse.json({ ok: false, message: "Livre introuvable." }, { status: 404 });
  }

  const discountPercent = await resolvePromoDiscount(payload.promoCode);
  const finalPrice = applyDiscount(book.priceEur, discountPercent);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${origin}/account?success=1`,
    cancel_url: `${origin}/catalogue?cancel=1`,
    customer_email: payload.email || undefined,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: book.titleFr,
            description: book.synopsisFr,
              images: [resolveAssetUrl(book.coverImage, origin)],
          },
          unit_amount: Math.round(finalPrice * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      bookId: book.id,
      bookTitle: book.titleFr,
      pdfFile: book.pdfFile,
      promoCode: payload.promoCode ? String(payload.promoCode).trim().toUpperCase() : "",
      discountPercent: String(discountPercent),
    },
  });

  return NextResponse.json({ ok: true, url: session.url });
}
