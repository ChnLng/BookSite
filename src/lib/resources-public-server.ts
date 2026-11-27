import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import { siteConfig } from "@/lib/site-config";
import { loadHomepageResources } from "@/lib/homepage-resources";
import { getPlayTestingApp, getPublicPlayStoreApp } from "@/lib/play-testing";
import { chineseForTwoResource, getAndroidResourceCover, newlyPublishedAndroidResources, previewAndroidResources } from "@/lib/public-android-resources";

export async function loadInitialHomepageResources() {
  if (!siteConfig.supabaseUrl || !siteConfig.supabaseAnonKey) return null;

  const supabase = createClient(siteConfig.supabaseUrl, siteConfig.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 30 } }),
    },
  });
  return loadHomepageResources(supabase);
}

export type PublicResourceSeo = {
  id: string;
  slug: string;
  titleFr: string;
  summaryFr: string;
  coverImageUrl: string;
  priceEur: number | null;
  createdAt: string | null;
};

export const loadPublicResourcesForSeo = cache(async (): Promise<PublicResourceSeo[]> => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || siteConfig.supabaseAnonKey;
  if (!siteConfig.supabaseUrl || !key) return playOnlySeoResources();

  const supabase = createClient(siteConfig.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("resource_items")
    .select("id, slug, title_fr, summary_fr, cover_image_url, qr_image_url, price_eur, created_at, visible, deleted_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return playOnlySeoResources();
  const knownSlugs = new Set((data || []).map((row) => String(row.slug || "")));
  const resources = (data || []).filter((row) => row.visible === true && !row.deleted_at && !getPlayTestingApp(String(row.id)) && !getPlayTestingApp(String(row.slug))).map((row) => ({
    id: String(row.id),
    slug: String(row.slug || row.id),
    titleFr: String(row.title_fr || "Ressource numérique"),
    summaryFr: String(row.summary_fr || "Ressource numérique pour apprendre le chinois en français."),
    coverImageUrl: getAndroidResourceCover(String(row.slug || row.id), row.cover_image_url || row.qr_image_url),
    priceEur: newlyPublishedAndroidResources.some((item) => item.slug === row.slug)
      ? Number(row.price_eur || 0)
      : getPublicPlayStoreApp(String(row.id))?.priceEur ?? getPublicPlayStoreApp(String(row.slug))?.priceEur ?? previewAndroidResources.find((item) => item.slug === row.slug)?.priceEur ?? Number(row.price_eur || 0),
    createdAt: row.created_at ? String(row.created_at) : null,
  }));
  return [...resources, ...playOnlySeoResources().filter((item) => !knownSlugs.has(item.slug))];
});

function playOnlySeoResources(): PublicResourceSeo[] {
  const app = getPublicPlayStoreApp(chineseForTwoResource.slug);
  return [{
    id: chineseForTwoResource.id,
    slug: chineseForTwoResource.slug,
    titleFr: chineseForTwoResource.titleFr,
    summaryFr: chineseForTwoResource.summaryFr,
    coverImageUrl: chineseForTwoResource.coverImageUrl,
    priceEur: app?.priceEur ?? 0,
    createdAt: chineseForTwoResource.createdAt,
  }, ...[...newlyPublishedAndroidResources, ...previewAndroidResources].map((item): PublicResourceSeo => ({
    id: item.id,
    slug: item.slug,
    titleFr: item.titleFr,
    summaryFr: item.summaryFr,
    coverImageUrl: item.coverImageUrl,
    priceEur: getPublicPlayStoreApp(item.slug)?.priceEur ?? ("priceEur" in item ? item.priceEur : null),
    createdAt: item.createdAt,
  }))];
}
