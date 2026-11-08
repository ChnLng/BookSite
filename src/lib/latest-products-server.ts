import "server-only";

import { createClient } from "@supabase/supabase-js";
import { selectLatestProducts, type LatestProduct, type LatestProductRow } from "@/lib/latest-products";
import { siteConfig } from "@/lib/site-config";
import { getPlayTestingApp, getPublicPlayStoreApp } from "@/lib/play-testing";
import { chineseForTwoResource, getPreviewAndroidApp, previewAndroidResources } from "@/lib/public-android-resources";

function playOnlyLatestRows(): LatestProductRow[] {
  return [chineseForTwoResource, ...previewAndroidResources].map((item) => ({
    id: item.id,
    slug: item.slug,
    title_fr: item.titleFr,
    price_eur: getPublicPlayStoreApp(item.slug)?.priceEur ?? ("priceEur" in item ? item.priceEur : null),
    created_at: item.createdAt,
    published_at: getPublicPlayStoreApp(item.slug)?.publishedAt,
    visible: true,
    deleted_at: null,
    cover_image_url: item.coverImageUrl,
  }));
}

export async function loadLatestProducts(): Promise<LatestProduct[]> {
  const playOnlyRows = playOnlyLatestRows();
  if (!siteConfig.supabaseUrl || !siteConfig.supabaseAnonKey) return selectLatestProducts([], playOnlyRows);

  // Use public access only. Never expose drafts or paid document fields here.
  const supabase = createClient(siteConfig.supabaseUrl, siteConfig.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  const commonFields = "id, slug, title_fr, price_eur, created_at, visible, deleted_at";

  try {
    const [books, resources] = await Promise.all([
      supabase.from("books").select(`${commonFields}, cover_image`)
        .eq("visible", true).is("deleted_at", null).not("created_at", "is", null)
        .order("created_at", { ascending: false }).order("id", { ascending: true }).limit(2)
        .abortSignal(AbortSignal.timeout(5000)),
      supabase.from("resource_items").select(`${commonFields}, cover_image_url, qr_image_url`)
        .eq("visible", true).is("deleted_at", null).not("created_at", "is", null)
        .order("created_at", { ascending: false }).order("id", { ascending: true }).limit(100)
        .abortSignal(AbortSignal.timeout(5000)),
    ]);

    // A partial list could misidentify older items as the newest products.
    if (books.error || resources.error) return selectLatestProducts([], playOnlyRows);
    const resourceRows = ((resources.data || []) as LatestProductRow[])
      .filter((row) => !getPlayTestingApp(row.id) && !getPlayTestingApp(row.slug));
    const candidates = resourceRows.map((row) => {
      const playApp = getPublicPlayStoreApp(row.id) || getPublicPlayStoreApp(row.slug);
      if (playApp) return { ...row, price_eur: playApp.priceEur, published_at: playApp.publishedAt };
      const previewApp = getPreviewAndroidApp(row.id) || getPreviewAndroidApp(row.slug);
      return previewApp ? { ...row, price_eur: previewApp.priceEur, published_at: previewApp.createdAt } : row;
    });
    for (const item of playOnlyRows) if (!candidates.some((row) => row.slug === item.slug)) candidates.push(item);
    return selectLatestProducts(books.data as LatestProductRow[], candidates);
  } catch {
    return selectLatestProducts([], playOnlyRows);
  }
}
