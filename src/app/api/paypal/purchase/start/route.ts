import { NextResponse } from "next/server";
import { books as fallbackBooks } from "@/data/books";
import { getUserFromRequest } from "@/lib/auth-request";
import { isUuid } from "@/lib/database-identifiers";
import { applyDiscount } from "@/lib/promo";
import { paypalAccessToken, paypalBaseUrl } from "@/lib/paypal-server";
import { hasPurchasedBook, hasPurchasedResource } from "@/lib/purchase-access";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { getPlayTestingApp, playTestingApplicationUrl } from "@/lib/play-testing";

type ResolvedBook = {
  kind: "book";
  id: string;
  titleFr: string;
  priceEur: number;
};

type ResolvedResource = {
  kind: "resource";
  id: string;
  slug: string;
  titleFr: string;
  priceEur: number;
};

type ResolvedPurchase = ResolvedBook | ResolvedResource;

async function resolveBook(bookId: string): Promise<ResolvedBook | null> {
  const supabase = getSupabaseServiceClient();

  if (supabase) {
    const query = supabase
      .from("books")
      .select("id, slug, title_fr, pdf_file, price_eur")
      .limit(1);
    const { data } = await (isUuid(bookId) ? query.eq("id", bookId) : query.eq("slug", bookId)).maybeSingle();

    if (data) {
      const slug = data.slug || bookId;
      const fallback = fallbackBooks.find((book) => book.id === slug || book.id === bookId);
      return {
        kind: "book",
        id: slug,
        titleFr: data.title_fr,
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
    priceEur: fallback.priceEur,
  };
}

async function resolveResource(resourceId: string): Promise<ResolvedResource | null> {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const resourceQuery = supabase
    .from("resource_items")
    .select("id, slug, title_fr, visible, price_eur")
    .limit(1);
  const { data: resource } = await (isUuid(resourceId) ? resourceQuery.eq("id", resourceId) : resourceQuery.eq("slug", resourceId)).maybeSingle();

  if (!resource || resource.visible === false) {
    return null;
  }

  return {
    kind: "resource",
    id: resource.id,
    slug: resource.slug || resource.id,
    titleFr: resource.title_fr || resource.slug || resource.id,
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

function requestOrigin(request: Request) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ ok: false, message: "Connectez-vous avant de procéder au paiement." }, { status: 401 });
  }
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        kind?: "book" | "resource";
        itemId?: string;
        promoCode?: string;
      }
    | null;

  const kind = payload?.kind === "resource" ? "resource" : "book";
  const itemId = String(payload?.itemId || "").trim();
  const promoCode = String(payload?.promoCode || "")
    .trim()
    .toUpperCase();

  if (!itemId) {
    return NextResponse.json({ ok: false, message: "Produit manquant." }, { status: 400 });
  }

  let purchase: ResolvedPurchase | null = null;
  if (kind === "resource") {
    purchase = await resolveResource(itemId);
  } else {
    purchase = await resolveBook(itemId);
  }

  if (!purchase) {
    return NextResponse.json({ ok: false, message: "Produit introuvable." }, { status: 404 });
  }
  const testingApp = purchase.kind === "resource" ? getPlayTestingApp(purchase.id) || getPlayTestingApp(purchase.slug) : null;
  if (testingApp) return NextResponse.json({ ok: false, message: "Cette application est proposée gratuitement pendant son test fermé.", applicationUrl: playTestingApplicationUrl(testingApp) }, { status: 409 });

  const alreadyOwned = purchase.kind === "book"
    ? await hasPurchasedBook(supabase, {
        userId: user.id,
        email: user.email,
        bookId: purchase.id,
      })
    : await hasPurchasedResource(supabase, {
        userId: user.id,
        email: user.email,
        resourceId: purchase.id,
        resourceSlug: purchase.slug,
      });

  if (alreadyOwned) {
    return NextResponse.json(
      {
        ok: false,
        alreadyOwned: true,
        message: "Vous possédez déjà ce produit. Retrouvez-le dans Ma page.",
        accountUrl: "/account",
      },
      { status: 409 },
    );
  }

  const amount = await expectedPrice(purchase.priceEur, promoCode);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, message: "Montant invalide." }, { status: 400 });
  }

  const origin = requestOrigin(request);
  const itemSlug = purchase.kind === "resource" ? purchase.slug : purchase.id;
  const path = purchase.kind === "resource" ? `/outils/${encodeURIComponent(itemSlug)}` : `/livres/${encodeURIComponent(itemSlug)}`;
  const returnUrl = new URL(path, origin);
  returnUrl.searchParams.set("success", "1");
  if (promoCode) returnUrl.searchParams.set("promo", promoCode);

  const cancelUrl = new URL(path, origin);
  cancelUrl.searchParams.set("cancel", "1");
  if (promoCode) cancelUrl.searchParams.set("promo", promoCode);

  try {
    const accessToken = await paypalAccessToken();
    const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: itemSlug,
            description: purchase.titleFr?.slice(0, 127) || itemSlug,
            amount: {
              currency_code: "EUR",
              value: amount.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: returnUrl.toString(),
          cancel_url: cancelUrl.toString(),
          landing_page: "BILLING",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          locale: "fr-FR",
          brand_name: "Visd AR",
        },
      }),
      cache: "no-store",
    });

    const data = (await response.json().catch(() => null)) as any;

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, message: data?.message || "Impossible de démarrer le paiement PayPal." },
        { status: 400 },
      );
    }

    const approvalUrl = String(data?.links?.find((link: any) => link?.rel === "approve")?.href || "").trim();
    const orderId = String(data?.id || "").trim();

    if (!approvalUrl || !orderId) {
      return NextResponse.json({ ok: false, message: "Lien PayPal indisponible." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      orderId,
      approvalUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Erreur PayPal." },
      { status: 500 },
    );
  }
}
