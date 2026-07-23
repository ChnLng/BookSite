"use client";

import { useEffect, useRef } from "react";

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
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !adRef.current) {
      return;
    }

    if (adRef.current.dataset.loaded === "true") {
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      adRef.current.dataset.loaded = "true";
    } catch {
      // Google Ads may fail quietly in local/dev environments.
    }
  }, []);

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
