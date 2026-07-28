import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { hasPurchasedResource } from "@/lib/purchase-access";
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

  const { data: resource } = await supabase
    .from("resource_items")
    .select("id, slug, title_fr, price_eur, visible")
    .or(`slug.eq.${id},id.eq.${id}`)
    .maybeSingle();

  if (!resource || resource.visible === false) {
    return NextResponse.json({ ok: false, message: "Ressource introuvable." }, { status: 404 });
  }

  const basePrice = Number(resource.price_eur || 0);
  const promoCode = String(payload?.promoCode || "").trim().toUpperCase();
  let price = basePrice;
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
    if (promo && Boolean(promo.is_active ?? promo.active) && (!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)) {
      const type = String(promo.discount_type || (promo.discount_percent != null ? "percentage" : "free_share"));
      price = type === "free_share" ? 0 : applyDiscount(basePrice, Number(promo.discount_value ?? promo.discount_percent ?? 0));
    }
  }

  if (price > 0) {
    return NextResponse.json({ ok: false, message: "Cette ressource doit etre achetee." }, { status: 400 });
  }

  const existing = await hasPurchasedResource(supabase, {
    userId: user.id,
    email: user.email,
    resourceId: resource.id,
  });

  if (!existing) {
    await supabase.from("downloads").insert({
      user_id: user.id,
      user_email: user.email || null,
      download_kind: "resource",
      resource_id: resource.id,
      resource_title: resource.title_fr || resource.slug || resource.id,
      download_url: null,
      amount_paid: 0,
      currency: "EUR",
      payment_status: "free",
      paid_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    ok: true,
    message: "La ressource est maintenant disponible dans votre espace.",
  });
}
