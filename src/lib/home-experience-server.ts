import "server-only";

import { createClient } from "@supabase/supabase-js";
import { loadLatestProducts } from "@/lib/latest-products-server";
import { loadPublicResourcesForSeo } from "@/lib/resources-public-server";
import { bookAssetExtensions, bookCoverPath } from "@/lib/book-assets";
import { books as staticBooks } from "@/data/books";
import { richTextToPlainText } from "@/lib/rich-text";
import { siteConfig } from "@/lib/site-config";
import { homeImage, homeLinkFallbacks, type HomeExternalLink, type HomeProduct } from "./home-experience-data";

const hasSamplePages = new Set(["lumi", "jiti", "fulbert", "taogao"]);

function bookProduct(slug: string, title: string, cover: string | null, price: number | null): HomeProduct {
  return {
    id: slug,
    kind: "book",
    title: richTextToPlainText(title),
    href: "/livres/" + encodeURIComponent(slug),
    image: homeImage(cover || bookCoverPath(slug, bookAssetExtensions[slug] || "jpg")),
    price,
    pages: hasSamplePages.has(slug) ? [2, 3, 4, 5].map((number) => `/home/assets/${slug}-page-${number}.webp`) : undefined,
  };
}

async function loadBooksAndLinks(): Promise<{ books: HomeProduct[]; links: HomeExternalLink[] }> {
  const fallbackBooks = staticBooks.map((book) => bookProduct(book.id, book.titleFr, null, book.priceEur));
  if (!siteConfig.supabaseUrl || !siteConfig.supabaseAnonKey) return { books: fallbackBooks, links: homeLinkFallbacks };

  const supabase = createClient(siteConfig.supabaseUrl, siteConfig.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [books, partners] = await Promise.all([
    supabase.from("books").select("id, slug, title_fr, cover_image, price_eur")
      .eq("visible", true).is("deleted_at", null)
      .order("sort_order").order("created_at").abortSignal(AbortSignal.timeout(5000)),
    supabase.from("partner_links").select("id, title_fr, icon_url, target_url, tooltip_text")
      .eq("visible", true).order("sort_order").order("created_at").abortSignal(AbortSignal.timeout(5000)),
  ]);
  return {
    books: books.error ? fallbackBooks : (books.data || []).map((row) => bookProduct(row.slug || row.id, row.title_fr, row.cover_image, row.price_eur)),
    links: partners.error ? homeLinkFallbacks : (partners.data || []).flatMap((link) => {
      if (typeof link.target_url !== "string" || !/^https?:\/\//i.test(link.target_url)) return [];
      return [{
        id: link.id,
        title: link.title_fr || "Lien externe",
        href: link.target_url,
        label: link.tooltip_text || link.title_fr || "Lien externe",
        icon: link.icon_url ? homeImage(link.icon_url) : undefined,
      }];
    }),
  };
}

export async function loadHomeExperience() {
  const [resources, recent, { books, links }] = await Promise.all([
    loadPublicResourcesForSeo().catch(() => []),
    loadLatestProducts(),
    loadBooksAndLinks(),
  ]);
  const tools: HomeProduct[] = resources.map((item) => ({
    id: item.slug,
    kind: "tool",
    title: richTextToPlainText(item.titleFr) || "Ressource numérique",
    href: "/outils/" + encodeURIComponent(item.slug),
    image: homeImage(item.coverImageUrl),
    price: item.priceEur,
    contain: ["pinyin", "echecschinois"].includes(item.slug),
  }));
  const products = [...tools, ...books];
  const latest: HomeProduct[] = recent.flatMap((item) => {
    const product = products.find((candidate) => candidate.href === item.href);
    return product ? [{ ...product, price: item.priceEur }] : [];
  });
  return { tools, books, latest, links };
}
