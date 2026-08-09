import type { Metadata } from "next";
import Link from "next/link";
import { StructuredData } from "@/components/structured-data";
import { TopNav } from "@/components/top-nav";
import { loadCachedPublicDisplayBooks } from "@/lib/books-public-server";

const pageUrl = "https://visdar.fr/blog/lecture-chinois-pinyin-traduction";
const title = "Lire le chinois avec sinogrammes, pinyin et traduction française";
const description = "Passez du manuel à la lecture courante grâce aux histoires chinoises avec sinogrammes, pinyin et traduction française, pensées pour les débutants.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "lecture chinois débutant",
    "texte chinois avec pinyin et traduction",
    "histoire chinois français",
    "ebook chinois débutant",
    "apprendre les sinogrammes",
    "livre bilingue chinois français",
  ],
  alternates: { canonical: "/blog/lecture-chinois-pinyin-traduction" },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: pageUrl,
    title,
    description,
    siteName: "Visd AR",
    images: [{ url: "/images/site-icon-512.png", width: 512, height: 512, alt: "Visd AR — lecture bilingue chinois-français" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/images/site-icon-512.png"] },
};

export default async function ChineseReadingGuidePage() {
  const books = await loadCachedPublicDisplayBooks();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${pageUrl}#article`,
        headline: title,
        description,
        inLanguage: "fr-FR",
        datePublished: "2026-08-09",
        dateModified: "2026-08-09",
        mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
        author: { "@type": "Organization", name: "Visd AR", url: "https://visdar.fr" },
        publisher: {
          "@type": "Organization",
          name: "Visd AR",
          url: "https://visdar.fr",
          logo: { "@type": "ImageObject", url: "https://visdar.fr/images/site-icon-512.png" },
        },
        about: ["Apprentissage du chinois", "Sinogrammes", "Pinyin", "Lecture bilingue chinois-français"],
      },
      {
        "@type": "ItemList",
        name: "Ebooks bilingues chinois-français Visd AR",
        itemListElement: books.map((book, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Product",
            name: book.titleFr,
            url: `https://visdar.fr/livres/${book.id}`,
            image: book.coverImage.startsWith("http") ? book.coverImage : `https://visdar.fr${book.coverImage}`,
            brand: { "@type": "Brand", name: "Visd AR" },
            offers: {
              "@type": "Offer",
              priceCurrency: "EUR",
              price: book.priceEur.toFixed(2),
              availability: "https://schema.org/InStock",
            },
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: "https://visdar.fr" },
          { "@type": "ListItem", position: 2, name: "Guide de lecture chinoise", item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main className="page-shell">
      <StructuredData data={structuredData} />
      <TopNav className="topbar-luxury" showAdmin showLogout />
      <article className="panel glass seo-article">
        <header className="seo-article-header">
          <span className="badge">Guide · Apprendre le chinois en français</span>
          <h1>{title}</h1>
          <p className="section-caption">
            Passer du manuel à une lecture chinoise fluide grâce à trois appuis complémentaires : les sinogrammes, le pinyin et la traduction française.
          </p>
        </header>

        <section>
          <h2>Passer du manuel à la lecture courante</h2>
          <p>
            Vous avez appris les bases du mandarin, mais vous vous sentez bloqué lorsqu&apos;il faut lire un vrai texte chinois ? Ce passage entre les exercices du manuel et une histoire complète représente un défi fréquent pour les débutants.
          </p>
          <p>
            Lire les sinogrammes en contexte consolide le vocabulaire, la grammaire et les réflexes de compréhension. Sans accompagnement, le décodage peut toutefois devenir lent et décourageant. Un support bilingue bien structuré sert alors de pont vers la lecture autonome.
          </p>
        </section>

        <section>
          <h2>Pourquoi combiner sinogrammes, pinyin et traduction française ?</h2>
          <ol>
            <li><strong>Les sinogrammes</strong> développent la reconnaissance visuelle des caractères et de leur structure.</li>
            <li><strong>Le pinyin</strong> sécurise la prononciation et permet de poursuivre la lecture sans casser le rythme.</li>
            <li><strong>La traduction française</strong> donne immédiatement le contexte et les nuances, sans rechercher chaque mot dans un dictionnaire.</li>
          </ol>
          <p>
            Ces trois niveaux d&apos;information ne remplacent pas l&apos;effort de mémorisation : ils réduisent les blocages afin que l&apos;apprenant rencontre plus souvent les mots dans des phrases naturelles.
          </p>
        </section>

        <section>
          <h2>La méthode Visd AR : un pont vers la lecture réelle</h2>
          <p>
            Chez <strong>Visd AR</strong>, nous concevons des ebooks bilingues et des outils numériques pour les francophones qui commencent le chinois ou souhaitent retrouver une pratique régulière. Nos histoires sont pensées pour :
          </p>
          <ul>
            <li><strong>Réduire la charge mentale</strong> en regroupant les aides de lecture au même endroit.</li>
            <li><strong>Gagner en fluidité</strong> grâce au pinyin placé au service de la lecture continue.</li>
            <li><strong>Améliorer la compréhension</strong> avec une traduction française fidèle au sens du texte.</li>
            <li><strong>Créer une habitude</strong> grâce à des histoires courtes, illustrées et accessibles.</li>
          </ul>
        </section>

        {books.length > 0 ? (
          <section>
            <h2>Découvrir les livres bilingues chinois-français Visd AR</h2>
            <div className="seo-book-links">
              {books.map((book) => (
                <Link href={`/livres/${book.id}`} className="seo-book-link" key={book.id}>
                  <strong>{book.titleFr}</strong>
                  <span>{book.titleZh}</span>
                  <span>{book.priceEur.toFixed(2)} EUR · Ebook avec lecture en ligne</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h2>Commencer sa première lecture autonome</h2>
          <p>
            Ne vous contentez plus de listes de mots isolés. La maîtrise des sinogrammes se construit en lisant des histoires complètes, progressives et compréhensibles.
          </p>
          <div className="actions-row">
            <Link className="cta-button" href="/catalogue">Découvrir le catalogue Visd AR</Link>
            <Link className="pill-button" href="/">Voir les outils et jeux numériques</Link>
          </div>
        </section>
      </article>
    </main>
  );
}
