import { notFound } from "next/navigation";
import ResourceDetailPage from "./resource-detail-client";
import { getPlayTestingApp, getPublicPlayStoreUrl } from "@/lib/play-testing";
import { getPreviewAndroidApp } from "@/lib/public-android-resources";
import { loadPublicResourcesForSeo } from "@/lib/resources-public-server";
import type { DisplayResource } from "@/lib/resources-service";

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (getPlayTestingApp(id)) notFound();

  const resources = await loadPublicResourcesForSeo();
  const entry = resources.find((item) => item.id === id || item.slug === id);
  const preview = getPreviewAndroidApp(id);
  const initialResource: DisplayResource | null = entry ? {
    id: entry.id,
    slug: entry.slug,
    titleFr: entry.titleFr,
    homepageSummaryFr: entry.summaryFr,
    summaryFr: entry.summaryFr,
    coverImageUrl: entry.coverImageUrl,
    qrImageUrl: entry.coverImageUrl,
    externalUrl: preview?.externalUrl || getPublicPlayStoreUrl(entry.id) || getPublicPlayStoreUrl(entry.slug) || "",
    visible: true,
    sortOrder: 0,
    priceEur: entry.priceEur ?? 0,
    downloads: [],
    galleryImages: preview ? [...preview.galleryImages] : [],
  } : null;

  return <ResourceDetailPage initialResource={initialResource} />;
}
