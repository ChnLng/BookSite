import { NextResponse } from "next/server";
import { applyDiscount, isPromoActive, mapPromoRow, type PromoRow } from "@/lib/promo";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        code?: string;
        priceEur?: number;
      }
    | null;

  const normalizedCode = String(payload?.code || "").trim().toUpperCase();
  const priceEur = Number(payload?.priceEur || 0);

  if (!normalizedCode) {
    return NextResponse.json({ ok: false, message: "Code promo invalide." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service promo indisponible." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("promo_codes")
    .select("id, code, discount_percent, valid_from, valid_until, active, show_banner, banner_text_fr, banner_text_zh")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, message: "Code promo invalide." }, { status: 404 });
  }

  const promo = mapPromoRow(data as PromoRow);

  if (!isPromoActive(promo)) {
    return NextResponse.json({ ok: false, message: "Code promo invalide." }, { status: 400 });
  }

  const discountedPrice = applyDiscount(priceEur, promo.discountPercent);

  return NextResponse.json({
    ok: true,
    promo: {
      code: promo.code,
      discountPercent: promo.discountPercent,
      discountedPrice,
    },
  });
}
