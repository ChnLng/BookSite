import type { MetadataRoute } from "next";
import { loadCachedPublicDisplayBooks } from "@/lib/books-public-server";
import { loadPublicResourcesForSeo } from "@/lib/resources-public-server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = "https://www.visdar.fr";
  const [books, resources] = await Promise.all([
    loadCachedPublicDisplayBooks(),
    loadPublicResourcesForSeo(),
  ]);

  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/catalogue`, changeFrequency: "weekly", priority: 0.9 },
    {
      url: `${siteUrl}/blog/lecture-chinois-pinyin-traduction`,
      lastModified: new Date("2026-08-09"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    ...books.map((book) => ({
      url: `${siteUrl}/livres/${encodeURIComponent(book.id)}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...resources.map((resource) => ({
      url: `${siteUrl}/outils/${encodeURIComponent(resource.slug)}`,
      lastModified: resource.createdAt ? new Date(resource.createdAt) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
  ];
}
