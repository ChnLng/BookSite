"use client";

import Script from "next/script";
import { siteConfig } from "@/lib/site-config";

export function PayPalSdkScript() {
  return (
    <Script
      src={`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(siteConfig.paypalClientId)}&components=buttons&disable-funding=venmo&currency=EUR`}
      strategy="afterInteractive"
    />
  );
}

export function PayPalHostedButtonScript() {
  return (
    <Script
      id="paypal-hosted-button-sdk"
      src={`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(siteConfig.paypalHostedClientId)}&components=hosted-buttons&currency=EUR`}
      strategy="afterInteractive"
      data-namespace="paypalHosted"
    />
  );
}
