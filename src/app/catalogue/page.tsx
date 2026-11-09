import type { Metadata } from "next";
import { CatalogueClient } from "@/components/catalogue-client";
import { loadCachedPublicDisplayBooks } from "@/lib/books-public-server";
import { loadPublicResourcesForSeo } from "@/lib/resources-public-server";
import { getPublicPlayStoreUrl } from "@/lib/play-testing";
import { getPreviewAndroidApp } from "@/lib/public-android-resources";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Catalogue chinois-français — livres et applications Android",
  description: "Livres illustrés et applications Android pour apprendre le chinois en français : pinyin, sinogrammes, vocabulaire et culture chinoise.",
  alternates: { canonical: "/catalogue" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/catalogue",
    title: "Livres bilingues et applications Android | Visd AR",
    description: "Histoires chinoises illustrées et applications Android avec pinyin et explications en français.",
  },
};

export default async function CataloguePage() {
  const [initialBooks, publicResources] = await Promise.all([loadCachedPublicDisplayBooks(), loadPublicResourcesForSeo()]);
  const initialResources = publicResources.map((item) => ({
    id: item.slug,
    kind: "resource" as const,
    titleFr: item.titleFr,
    titleZh: "",
    image: item.coverImageUrl,
    priceEur: item.priceEur ?? 0,
    href: `/outils/${item.slug}`,
    externalUrl: getPublicPlayStoreUrl(item.slug) || getPreviewAndroidApp(item.slug)?.externalUrl || "",
  }));

  return <CatalogueClient initialBooks={initialBooks} initialResources={initialResources} />;
}
