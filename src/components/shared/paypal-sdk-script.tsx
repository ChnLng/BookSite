"use client";

import Script from "next/script";
import { siteConfig } from "@/lib/site-config";

export function PayPalSdkScript() {
  return (
    <Script
      src={`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(siteConfig.paypalClientId)}&components=buttons,hosted-buttons&disable-funding=venmo&currency=EUR`}
      strategy="afterInteractive"
    />
  );
}
