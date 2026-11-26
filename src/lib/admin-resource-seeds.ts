import { getPublicPlayStoreApp } from "./play-testing";
import { chineseForTwoResource, newlyPublishedAndroidResources, previewAndroidResources } from "./public-android-resources";

export function missingPlayResourceRows(existingSlugs: Iterable<string>) {
  const known = new Set(existingSlugs);
  return [chineseForTwoResource, ...newlyPublishedAndroidResources, ...previewAndroidResources]
    .filter((item) => !known.has(item.slug))
    .map((item) => ({
      slug: item.slug,
      title_fr: item.titleFr,
      summary_fr: item.summaryFr,
      homepage_summary_fr: item.summaryFr,
      cover_image_url: item.coverImageUrl,
      qr_image_url: item.coverImageUrl,
      external_url: item.externalUrl,
      price_eur: getPublicPlayStoreApp(item.slug)?.priceEur ?? ("priceEur" in item ? item.priceEur : 0) ?? 0,
      visible: true,
      sort_order: item.sortOrder,
      gallery_images: item.galleryImages.map((url) => ({ url, visible: true })),
    }));
}
