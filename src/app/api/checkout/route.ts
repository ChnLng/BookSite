import Stripe from "stripe";
import { NextResponse } from "next/server";
import { books as fallbackBooks, donationOptions } from "@/data/books";
import { getUserFromRequest } from "@/lib/auth-request";
import { bookPdfPath } from "@/lib/book-assets";
import { isUuid } from "@/lib/database-identifiers";
import { applyDiscount } from "@/lib/promo";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type CheckoutProduct = {
  kind: "book" | "resource";
  id: string;
  slug: string;
  title: string;
  priceEur: number;
  downloadUrl: string | null;
  resourceFileId?: string | null;
};

function siteOrigin(request: Request) {
  const configured = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured.startsWith("http") ? configured : `https://${configured}`;

  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

async function resolveBook(itemId: string): Promise<CheckoutProduct | null> {
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    const query = supabase
      .from("books")
      .select("id, slug, title_fr, pdf_file, price_eur, visible, deleted_at")
      .limit(1);
    const { data } = await (isUuid(itemId) ? query.eq("id", itemId) : query.eq("slug", itemId)).maybeSingle();

    if (data && data.visible !== false && !data.deleted_at) {
      const slug = data.slug || itemId;
      const fallback = fallbackBooks.find((book) => book.id === slug || book.id === itemId);
      return {
        kind: "book",
        id: slug,
        slug,
        title: data.title_fr || fallback?.titleFr || slug,
        priceEur: Number(data.price_eur ?? fallback?.priceEur ?? 0),
        downloadUrl: data.pdf_file || bookPdfPath(slug),
      };
    }

    if (data) return null;
  }

  const fallback = fallbackBooks.find((book) => book.id === itemId);
  return fallback
    ? {
        kind: "book",
        id: fallback.id,
        slug: fallback.id,
        title: fallback.titleFr,
        priceEur: fallback.priceEur,
        downloadUrl: bookPdfPath(fallback.id),
      }
    : null;
}

async function resolveResource(itemId: string): Promise<CheckoutProduct | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const resourceQuery = supabase
    .from("resource_items")
    .select("id, slug, title_fr, price_eur, visible, deleted_at")
    .limit(1);
  const { data: resource } = await (isUuid(itemId) ? resourceQuery.eq("id", itemId) : resourceQuery.eq("slug", itemId)).maybeSingle();

  if (!resource || resource.visible === false || resource.deleted_at) return null;

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
    title: resource.title_fr || resource.slug || resource.id,
    priceEur: Number(resource.price_eur || 0),
    downloadUrl: firstFile?.file_path || firstFile?.file_url || firstFile?.external_url || null,
    resourceFileId: firstFile?.id || null,
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

  const type = String(data.discount_type || (data.discount_percent != null ? "percentage" : "free_share"));
  if (type === "free_share") return 0;
  return applyDiscount(basePrice, Number(data.discount_value ?? data.discount_percent ?? 0));
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        kind?: "book" | "resource" | "donation";
        id?: string;
        promoCode?: string;
      }
    | null;
  const kind = payload?.kind || "book";
  const origin = siteOrigin(request);
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json(
      { ok: false, message: "Stripe n'est pas encore configuré." },
      { status: 503 },
    );
  }

  const stripe = new Stripe(secretKey);

  if (kind === "donation") {
    const donation = donationOptions.find((item) => item.id === payload?.id);
    const amount = donation?.amount ?? 5;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "fr",
      success_url: `${origin}/account?success=1`,
      cancel_url: `${origin}/?cancel=1`,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `Donation ${donation?.label ?? "Visd AR"}` },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
    });
    return NextResponse.json({ ok: true, url: session.url });
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Connectez-vous avant de procéder au paiement." },
      { status: 401 },
    );
  }

  const itemId = String(payload?.id || "").trim();
  if (!itemId) {
    return NextResponse.json({ ok: false, message: "Produit manquant." }, { status: 400 });
  }

  const product = kind === "resource" ? await resolveResource(itemId) : await resolveBook(itemId);
  if (!product) {
    return NextResponse.json({ ok: false, message: "Produit introuvable." }, { status: 404 });
  }

  const promoCode = String(payload?.promoCode || "").trim().toUpperCase();
  const amount = await expectedPrice(product.priceEur, promoCode);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { ok: false, message: "Ce produit ne nécessite pas de paiement Stripe." },
      { status: 400 },
    );
  }

  const productPath =
    product.kind === "book"
      ? `/livres/${encodeURIComponent(product.slug)}`
      : `/outils/${encodeURIComponent(product.slug)}`;
  const metadata: Record<string, string> = {
    downloadKind: product.kind,
    userId: user.id,
    userEmail: user.email || "",
    promoCode,
    downloadUrl: product.downloadUrl || "",
  };

  if (product.kind === "book") {
    metadata.bookId = product.slug;
    metadata.bookTitle = product.title;
  } else {
    metadata.resourceId = product.id;
    metadata.resourceSlug = product.slug;
    metadata.resourceTitle = product.title;
    metadata.resourceFileId = product.resourceFileId || "";
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "fr",
      submit_type: "pay",
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      success_url: `${origin}${productPath}?success=1&provider=stripe&stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${productPath}?cancel=1&provider=stripe`,
      payment_method_types: ["card"],
      metadata,
      payment_intent_data: { metadata },
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: product.title,
              description:
                product.kind === "book"
                  ? "Livre numérique — accès immédiat après paiement"
                  : "Contenu numérique — téléchargement après paiement",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
    });

    if (!session.url) {
      throw new Error("Lien de paiement Stripe indisponible.");
    }

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Impossible d'ouvrir le paiement Stripe.",
      },
      { status: 400 },
    );
  }
}
