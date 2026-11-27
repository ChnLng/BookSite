import { describe, expect, it } from "vitest";
import { readFrenchPlayStorePrice } from "../src/lib/play-store-offer";
import { getAndroidResourceCover } from "../src/lib/public-android-resources";

const packageName = "com.visdar.expressions";
function listing(price: string, currency = "EUR", id = packageName) {
  return `<script type="application/ld+json" nonce="xyz">${JSON.stringify({
    "@type": "SoftwareApplication",
    url: `https://play.google.com/store/apps/details?id=${id}&hl=fr`,
    offers: [{ "@type": "Offer", price, priceCurrency: currency }],
  })}</script>`;
}

describe("public Google Play price", () => {
  it("uses the exact app's verified EUR offer and accepts future price changes", () => {
    const unrelatedOffer = listing("1.09", "EUR", "com.visdar.couleurs");
    expect(readFrenchPlayStorePrice(unrelatedOffer + listing("4.99"), packageName)).toBe(4.99);
    expect(readFrenchPlayStorePrice(listing("5.49"), packageName)).toBe(5.49);
  });

  it("rejects a zero, foreign-currency, or malformed offer", () => {
    expect(readFrenchPlayStorePrice(listing("0"), packageName)).toBeNull();
    expect(readFrenchPlayStorePrice(listing("4.99", "USD"), packageName)).toBeNull();
    expect(readFrenchPlayStorePrice(listing("4,99 €"), packageName)).toBeNull();
  });
});

describe("Android product cover", () => {
  it("replaces the shared placeholder with the matching product screenshot", () => {
    expect(getAndroidResourceCover("trace-des-sinogrammes-android", "/images/android/visdar-app-icon.webp"))
      .toBe("/images/android/stroke-cover.webp");
    expect(getAndroidResourceCover("verbes-chinois-en-mime-android"))
      .toBe("/images/android/verbes-cover.webp");
  });

  it("keeps custom covers set by an admin", () => {
    const custom = "https://example.com/another-cover.webp";
    expect(getAndroidResourceCover("verbes-chinois-en-mime-android", custom)).toBe(custom);
  });
});
