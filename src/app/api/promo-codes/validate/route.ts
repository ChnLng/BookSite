import { NextResponse } from "next/server";
import { applyDiscount } from "@/lib/promo";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type PromoValidationRow = {
  id: string;
  code: string;
  discount_type?: string | null;
  discount_value?: number | string | null;
  expires_at?: string | null;
  is_active?: boolean | null;
  discount_percent?: number | string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  active?: boolean | null;
};

function asNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
    return NextResponse.json(
      { ok: false, message: "Code promo invalide, veuillez verifier et reessayer." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service promo indisponible." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, message: "Code promo invalide, veuillez verifier et reessayer." },
      { status: 404 },
    );
  }

  const promo = data as PromoValidationRow;
  const isActive = Boolean(promo.is_active ?? promo.active);

  if (!isActive) {
    return NextResponse.json(
      { ok: false, message: "Code promo invalide, veuillez verifier et reessayer." },
      { status: 400 },
    );
  }

  const now = Date.now();
  const validFrom = promo.valid_from ? new Date(promo.valid_from).getTime() : null;
  const expiresAt = promo.expires_at ? new Date(promo.expires_at).getTime() : promo.valid_until ? new Date(promo.valid_until).getTime() : null;

  if ((validFrom && now < validFrom) || (expiresAt && now > expiresAt)) {
    return NextResponse.json(
      { ok: false, message: "Code promo invalide, veuillez verifier et reessayer." },
      { status: 400 },
    );
  }

  const discountType = String(
    promo.discount_type || (promo.discount_percent != null ? "percentage" : "free_share"),
  ).toLowerCase();
  const discountValue =
    discountType === "percentage"
      ? asNumber(promo.discount_value ?? promo.discount_percent)
      : asNumber(promo.discount_value);

  const discountedPrice =
    discountType === "free_share" ? 0 : applyDiscount(priceEur, discountValue);

  return NextResponse.json({
    ok: true,
    promo: {
      code: normalizedCode,
      discountType,
      discountValue,
      discountPercent: discountType === "percentage" ? discountValue : 100,
      discountedPrice,
      isFreeShare: discountType === "free_share",
    },
  });
}
