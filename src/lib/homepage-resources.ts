import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResourceItem } from "@/lib/home-sections";
import { richTextToPlainText } from "./rich-text";
import { chineseForTwoResource } from "./public-android-resources";
import { getPublicPlayStoreApp } from "./play-testing";

type HomepageResourceRow = {
  id: string;
  slug: string | null;
  category_id: string | null;
  title_fr: string | null;
  homepage_summary_fr: string | null;
  summary_fr: string | null;
  cover_image_url: string | null;
  qr_image_url: string | null;
  price_eur: number | string | null;
  sort_order: number | null;
};

export function mapHomepageResource(row: HomepageResourceRow): ResourceItem {
  const summary = richTextToPlainText(row.homepage_summary_fr || row.summary_fr || "");
  const price = Number(row.price_eur || 0);
  return {
    id: row.id,
    slug: row.slug || row.id,
    categoryId: row.category_id,
    titleFr: richTextToPlainText(row.title_fr) || "Ressource numérique",
    homepageSummaryFr: summary.length > 150 ? `${summary.slice(0, 150).trimEnd()}…` : summary,
    summaryFr: "",
    coverImageUrl: row.cover_image_url || row.qr_image_url || "/images/logo.png",
    qrImageUrl: "",
    externalUrl: "",
    priceEur: getPublicPlayStoreApp(row.id)?.priceEur ?? getPublicPlayStoreApp(row.slug)?.priceEur ?? (Number.isFinite(price) ? Math.max(0, price) : 0),
    visible: true,
    sortOrder: row.sort_order ?? 0,
    // The homepage links to the product page, never to protected downloads.
    downloads: [],
  };
}

export async function loadHomepageResources(supabase: SupabaseClient): Promise<ResourceItem[] | null> {
  try {
    const { data, error } = await supabase.from("resource_items")
      .select("id, slug, category_id, title_fr, homepage_summary_fr, summary_fr, cover_image_url, qr_image_url, price_eur, sort_order")
      .eq("visible", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .abortSignal(AbortSignal.timeout(5000));

    if (error) return null;
    const resources = ((data || []) as HomepageResourceRow[]).map(mapHomepageResource);
    if (!resources.some((item) => item.slug === chineseForTwoResource.slug)) {
      const androidCategoryId = resources.find((item) => getPublicPlayStoreApp(item.id))?.categoryId ?? null;
      resources.push({
        id: chineseForTwoResource.id,
        slug: chineseForTwoResource.slug,
        categoryId: androidCategoryId,
        titleFr: chineseForTwoResource.titleFr,
        homepageSummaryFr: chineseForTwoResource.summaryFr,
        summaryFr: chineseForTwoResource.summaryFr,
        coverImageUrl: chineseForTwoResource.coverImageUrl,
        qrImageUrl: "",
        externalUrl: chineseForTwoResource.externalUrl,
        priceEur: getPublicPlayStoreApp(chineseForTwoResource.slug)?.priceEur ?? 0,
        visible: true,
        sortOrder: chineseForTwoResource.sortOrder,
        downloads: [],
      });
    }
    return resources;
  } catch {
    return null;
  }
}
