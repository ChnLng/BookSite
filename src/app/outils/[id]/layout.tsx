import type { Metadata } from "next";
import { StructuredData } from "@/components/structured-data";
import { loadPublicResourcesForSeo } from "@/lib/resources-public-server";

type Props = { children: React.ReactNode; params: Promise<{ id: string }> };

async function getResource(id: string) {
  const resources = await loadPublicResourcesForSeo();
  return resources.find((resource) => resource.id === id || resource.slug === id) || null;
}

function absoluteUrl(path: string) {
  return path.startsWith("http") ? path : `https://www.visdar.fr${path.startsWith("/") ? path : `/${path}`}`;
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { id } = await params;
  const resource = await getResource(id);
  if (!resource) return { title: "Ressource introuvable", robots: { index: false, follow: false } };
  const canonical = `/outils/${resource.slug}`;
  const description = `${resource.summaryFr} Ressource numérique ludique pour apprendre et pratiquer le chinois en français.`;
  return {
    title: `${resource.titleFr} — outil ludique pour apprendre le chinois`,
    description,
    keywords: ["jeu chinois débutant", "outil apprentissage chinois", "exercice chinois français", resource.titleFr],
    alternates: { canonical },
    openGraph: { type: "website", locale: "fr_FR", url: canonical, title: `${resource.titleFr} | Visd AR`, description, images: [{ url: absoluteUrl(resource.coverImageUrl), alt: resource.titleFr }] },
    twitter: { card: "summary_large_image", title: `${resource.titleFr} | Visd AR`, description, images: [absoluteUrl(resource.coverImageUrl)] },
  };
}

export default async function ResourceSeoLayout({ children, params }: Props) {
  const { id } = await params;
  const resource = await getResource(id);
  if (!resource) return children;
  const url = `https://www.visdar.fr/outils/${resource.slug}`;
  return <><StructuredData data={{
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: resource.titleFr,
    description: resource.summaryFr,
    image: [absoluteUrl(resource.coverImageUrl)],
    url,
    category: "Ressource numérique ludique pour apprendre le chinois",
    brand: { "@type": "Brand", name: "Visd AR" },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "EUR",
      price: resource.priceEur.toFixed(2),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Visd AR", url: "https://www.visdar.fr" },
    },
  }} />{children}</>;
}
