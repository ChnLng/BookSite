import "server-only";

import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/site-config";
import { loadHomepageResources } from "@/lib/homepage-resources";
import { getPublicPlayStoreApp } from "@/lib/play-testing";
import { chineseForTwoResource } from "@/lib/public-android-resources";

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
  priceEur: number;
  createdAt: string | null;
};

export async function loadPublicResourcesForSeo(): Promise<PublicResourceSeo[]> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || siteConfig.supabaseAnonKey;
  if (!siteConfig.supabaseUrl || !key) return [playOnlySeoResource()];

  const supabase = createClient(siteConfig.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("resource_items")
    .select("id, slug, title_fr, summary_fr, cover_image_url, qr_image_url, price_eur, created_at")
    .eq("visible", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return [playOnlySeoResource()];
  const resources = (data || []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug || row.id),
    titleFr: String(row.title_fr || "Ressource numérique"),
    summaryFr: String(row.summary_fr || "Ressource numérique pour apprendre le chinois en français."),
    coverImageUrl: String(row.cover_image_url || row.qr_image_url || "/images/logo.png"),
    priceEur: getPublicPlayStoreApp(String(row.id))?.priceEur ?? getPublicPlayStoreApp(String(row.slug))?.priceEur ?? Number(row.price_eur || 0),
    createdAt: row.created_at ? String(row.created_at) : null,
  }));
  return resources.some((resource) => resource.slug === chineseForTwoResource.slug)
    ? resources
    : [...resources, playOnlySeoResource()];
}

function playOnlySeoResource(): PublicResourceSeo {
  const app = getPublicPlayStoreApp(chineseForTwoResource.slug);
  return {
    id: chineseForTwoResource.id,
    slug: chineseForTwoResource.slug,
    titleFr: chineseForTwoResource.titleFr,
    summaryFr: chineseForTwoResource.summaryFr,
    coverImageUrl: chineseForTwoResource.coverImageUrl,
    priceEur: app?.priceEur ?? 0,
    createdAt: chineseForTwoResource.createdAt,
  };
}
