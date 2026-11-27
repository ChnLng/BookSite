import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getPriceSyncedPlayApp, playTestingStoreUrl } from "@/lib/play-testing";
import { readFrenchPlayStorePrice } from "@/lib/play-store-offer";

const app = getPriceSyncedPlayApp("com.visdar.expressions")!;

const readCachedPlayPrice = unstable_cache(async () => {
  const url = new URL(playTestingStoreUrl(app));
  url.searchParams.set("hl", "fr");
  url.searchParams.set("gl", "FR");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error("Google Play listing unavailable");

  const price = readFrenchPlayStorePrice(await response.text(), app.packageName);
  if (price === null) throw new Error("No verified EUR offer on Google Play");
  return price;
}, ["google-play-fr-price", app.packageName], { revalidate: 6 * 60 * 60 });

export const loadSyncedFrenchPlayPrice = cache(async () => {
  try {
    return await readCachedPlayPrice();
  } catch {
    return app.priceEur;
  }
});
