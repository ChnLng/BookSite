"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type GoogleAdsSlotProps = {
  className?: string;
  label?: string;
  slot: string;
};

export function GoogleAdsSlot({
  className,
  label = "Ads",
  slot,
}: GoogleAdsSlotProps) {
  const pathname = usePathname();
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !adRef.current) {
      return;
    }

    adRef.current.removeAttribute("data-loaded");

    let cancelled = false;
    let attempts = 0;

    const tryRenderAd = () => {
      if (!adRef.current || cancelled || adRef.current.dataset.loaded === "true") {
        return true;
      }

      if (!window.adsbygoogle) {
        return false;
      }

      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adRef.current.dataset.loaded = "true";
        return true;
      } catch {
        return false;
      }
    };

    if (tryRenderAd()) {
      return;
    }

    const intervalId = window.setInterval(() => {
      attempts += 1;

      if (tryRenderAd() || attempts >= 20) {
        window.clearInterval(intervalId);
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pathname, slot]);

  return (
    <aside className={className || "panel glass ad-slot-panel"}>
      <div className="badge">{label}</div>
      <div className="ad-slot-shell">
        <ins
          ref={adRef}
          className="adsbygoogle ad-slot-ins"
          style={{ display: "block" }}
          data-ad-client="ca-pub-6796254088003500"
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}
