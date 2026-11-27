type StoreOffer = { "@type"?: string; price?: string | number; priceCurrency?: string };
type StoreListing = { "@type"?: string; url?: string; offers?: StoreOffer | StoreOffer[] };

export function readFrenchPlayStorePrice(html: string, packageName: string): number | null {
  const scripts = html.matchAll(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi);

  for (const [, json] of scripts) {
    try {
      const listing = JSON.parse(json) as StoreListing | null;
      if (listing?.["@type"] !== "SoftwareApplication" || typeof listing.url !== "string") continue;

      const url = new URL(listing.url);
      if (url.origin !== "https://play.google.com" || url.searchParams.get("id") !== packageName) continue;

      const offers = Array.isArray(listing.offers) ? listing.offers : [listing.offers];
      for (const offer of offers) {
        if (offer?.["@type"] !== "Offer" || offer.priceCurrency !== "EUR") continue;
        const value = String(offer.price ?? "");
        if (/^\d+(?:\.\d{1,2})?$/.test(value)) {
          const price = Number(value);
          // A free/installer-only response is not a verified price for this paid app.
          if (Number.isFinite(price) && price > 0) return price;
        }
      }
    } catch {
      // Another JSON-LD block may still contain the correct listing.
    }
  }

  return null;
}
