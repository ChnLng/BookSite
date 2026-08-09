import type { Metadata } from "next";
import { CatalogueClient } from "@/components/catalogue-client";
import { loadCachedPublicDisplayBooks } from "@/lib/books-public-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Livres chinois pour débutants — pinyin et traduction française",
  description: "Découvrez les ebooks Visd AR pour lire le chinois avec sinogrammes, pinyin et traduction française : histoires illustrées et accessibles aux débutants.",
  alternates: { canonical: "/catalogue" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/catalogue",
    title: "Catalogue de livres bilingues chinois-français | Visd AR",
    description: "Histoires chinoises illustrées avec pinyin et traduction française pour progresser en lecture.",
  },
};

export default async function CataloguePage() {
  const initialBooks = await loadCachedPublicDisplayBooks();

  return <CatalogueClient initialBooks={initialBooks} />;
}
