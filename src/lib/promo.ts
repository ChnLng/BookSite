export type PromoCode = {
  id: string;
  code: string;
  discountPercent: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
  showBanner: boolean;
  bannerTextFr: string | null;
  bannerTextZh: string | null;
};

export type PromoRow = {
  id: string;
  code: string;
  discount_percent: number;
  valid_from: string;
  valid_until: string;
  active: boolean;
  show_banner: boolean;
  banner_text_fr: string | null;
  banner_text_zh: string | null;
};

export function mapPromoRow(row: PromoRow): PromoCode {
  return {
    id: row.id,
    code: row.code,
    discountPercent: Number(row.discount_percent),
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    active: row.active,
    showBanner: row.show_banner,
    bannerTextFr: row.banner_text_fr,
    bannerTextZh: row.banner_text_zh,
  };
}

export function isPromoActive(promo: PromoCode, now = new Date()) {
  if (!promo.active) {
    return false;
  }

  const start = new Date(promo.validFrom);
  const end = new Date(promo.validUntil);

  return now >= start && now <= end;
}

export function applyDiscount(priceEur: number, discountPercent: number) {
  const discounted = priceEur * (1 - discountPercent / 100);
  return Math.max(0, Math.round(discounted * 100) / 100);
}
