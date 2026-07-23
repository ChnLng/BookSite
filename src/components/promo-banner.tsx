"use client";

import { Percent, X } from "lucide-react";
import type { PromoCode } from "@/lib/promo";

type PromoBannerProps = {
  promo: PromoCode;
  onDismiss?: () => void;
};

export function PromoBanner({ promo, onDismiss }: PromoBannerProps) {
  const message =
    promo.bannerTextFr ||
    promo.bannerTextZh ||
    `Code ${promo.code} : -${promo.discountPercent}% en cours`;

  return (
    <div className="promo-float-banner" role="status">
      <div className="promo-float-inner glass">
        <Percent size={18} />
        <div className="promo-float-copy">
          <strong>{promo.code}</strong>
          <span>{message}</span>
        </div>
        {onDismiss ? (
          <button className="promo-float-close" type="button" aria-label="Fermer" onClick={onDismiss}>
            <X size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
