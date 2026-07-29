"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

declare global {
  interface Window {
    adsbygoogle?: unknown[] & {
      loaded?: boolean;
    };
  }
}

type GoogleAdsSlotProps = {
  client: string;
  className?: string;
  label?: string;
  slot: string;
};

export function GoogleAdsSlot({
  client,
  className,
  label = "Ads",
  slot,
}: GoogleAdsSlotProps) {
  const pathname = usePathname();
  const adRef = useRef<HTMLModElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "filled" | "unfilled" | "blocked">("idle");

  useEffect(() => {
    if (typeof window === "undefined" || !adRef.current) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let renderRequested = false;
    setStatus("loading");

    const updateStatusFromDom = () => {
      const current = adRef.current;

      if (!current) {
        return;
      }

      const adStatus = current.getAttribute("data-ad-status");

      if (adStatus === "filled") {
        setStatus("filled");
      } else if (adStatus === "unfilled") {
        setStatus("unfilled");
      }
    };

    const hasVisibleSize = () => {
      const current = adRef.current;

      if (!current) {
        return false;
      }

      const rect = current.getBoundingClientRect();
      return rect.width >= 120;
    };

    const tryRenderAd = () => {
      if (!adRef.current || cancelled || renderRequested) {
        return true;
      }

      if (!window.adsbygoogle || !hasVisibleSize()) {
        return false;
      }

      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        renderRequested = true;
        updateStatusFromDom();
        return true;
      } catch {
        setStatus("blocked");
        return false;
      }
    };

    const mutationObserver = new MutationObserver(() => {
      updateStatusFromDom();
    });

    mutationObserver.observe(adRef.current, {
      attributes: true,
      attributeFilter: ["data-ad-status"],
    });

    if (tryRenderAd()) {
      updateStatusFromDom();
    }

    const intervalId = window.setInterval(() => {
      attempts += 1;

      if (tryRenderAd() || attempts >= 24) {
        window.clearInterval(intervalId);
      }

      if (attempts >= 24 && adRef.current?.getAttribute("data-ad-status") !== "filled") {
        setStatus("blocked");
      }
    }, 500);

    return () => {
      cancelled = true;
      mutationObserver.disconnect();
      window.clearInterval(intervalId);
    };
  }, [pathname, slot]);

  return (
    <aside className={className || "panel glass ad-slot-panel"}>
      <div className="section-heading">
        <span className="section-heading-icon" aria-hidden="true">
          <Sparkles size={17} />
        </span>
        <h2 className="section-heading-text">{label}</h2>
      </div>
      <div className="ad-slot-shell">
        <ins
          key={`${pathname}-${slot}`}
          ref={adRef}
          className="adsbygoogle ad-slot-ins"
          style={{ display: "block", width: "100%", minHeight: 120 }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        {status !== "filled" ? (
          <div className="ad-slot-placeholder">
            <p className="tiny" style={{ margin: 0 }}>
              {status === "unfilled"
                ? "Annonce Google chargée, mais aucun contenu n'a encore été fourni pour cet espace."
                : status === "blocked"
                  ? "Le script Google AdSense ne s'est pas charge correctement ou la zone n'est pas encore eligible."
                  : "Chargement de l'annonce Google en cours..."}
            </p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
