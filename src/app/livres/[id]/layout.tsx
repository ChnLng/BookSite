import type { Metadata } from "next";
import { StructuredData } from "@/components/structured-data";
import { loadCachedPublicDisplayBooks } from "@/lib/books-public-server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

async function getBook(id: string) {
  const books = await loadCachedPublicDisplayBooks();
  return books.find((book) => book.id === id || book.dbId === id) || null;
}

function absoluteUrl(path: string) {
  return path.startsWith("http") ? path : `https://www.visdar.fr${path.startsWith("/") ? path : `/${path}`}`;
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) return { title: "Livre introuvable", robots: { index: false, follow: false } };
  const canonical = `/livres/${book.id}`;
  const description = `${book.synopsisFr} Ebook bilingue chinois-français avec sinogrammes, pinyin et traduction, conçu pour les débutants.`;
  return {
    title: `${book.titleFr} — livre chinois facile avec pinyin`,
    description,
    keywords: ["livre chinois débutant", "ebook chinois français", "lecture chinois pinyin", "sinogrammes pinyin traduction", book.titleFr],
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      url: canonical,
      title: `${book.titleFr} | Visd AR`,
      description,
      images: [{ url: absoluteUrl(book.coverImage), alt: `Couverture de ${book.titleFr}` }],
    },
    twitter: { card: "summary_large_image", title: `${book.titleFr} | Visd AR`, description, images: [absoluteUrl(book.coverImage)] },
  };
}

export default async function BookSeoLayout({ children, params }: Props) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) return children;
  const url = `https://www.visdar.fr/livres/${book.id}`;
  const image = absoluteUrl(book.coverImage);
  const product = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: book.titleFr,
        alternateName: book.titleZh,
        description: book.synopsisFr,
        image: [image],
        url,
        sku: book.asin || book.id,
        category: "Livre numérique bilingue chinois-français pour débutants",
        brand: { "@type": "Brand", name: "Visd AR" },
        additionalType: "https://schema.org/EBook",
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "EUR",
          price: book.priceEur.toFixed(2),
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: "Visd AR", url: "https://www.visdar.fr" },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.visdar.fr" },
          { "@type": "ListItem", position: 2, name: "Catalogue", item: "https://www.visdar.fr/catalogue" },
          { "@type": "ListItem", position: 3, name: book.titleFr, item: url },
        ],
      },
    ],
  };
  return <><StructuredData data={product} />{children}</>;
}
