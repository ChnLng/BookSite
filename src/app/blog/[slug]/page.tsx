import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/structured-data";
import { TopNav } from "@/components/top-nav";
import { getLearningArticle, learningArticles } from "@/lib/learning-articles";

const siteUrl = "https://www.visdar.fr";

export function generateStaticParams() {
  return learningArticles.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = getLearningArticle(params.slug);
  if (!article) return {};
  const url = `${siteUrl}/blog/${article.slug}`;
  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: { type: "article", locale: "fr_FR", url, title: article.title, description: article.description, images: [{ url: "/images/logo.png", width: 200, height: 200, alt: "Visd AR" }] },
  };
}

export default function LearningArticlePage({ params }: { params: { slug: string } }) {
  const article = getLearningArticle(params.slug);
  if (!article) notFound();
  const url = `${siteUrl}/blog/${article.slug}`;
  const related = learningArticles.filter((item) => item.slug !== article.slug).slice(0, 3);

  return (
    <main className="page-shell">
      <StructuredData data={{ "@context": "https://schema.org", "@type": "BlogPosting", headline: article.title, description: article.description, inLanguage: "fr-FR", mainEntityOfPage: { "@type": "WebPage", "@id": url }, author: { "@type": "Organization", name: "Visd AR", url: siteUrl }, publisher: { "@type": "Organization", name: "Visd AR", logo: { "@type": "ImageObject", url: `${siteUrl}/images/logo.png` } }, datePublished: "2026-08-22", dateModified: "2026-08-22", keywords: article.keywords.join(", ") }} />
      <TopNav className="topbar-luxury" showAdmin showLogout />
      <article className="panel glass seo-article">
        <header className="seo-article-header">
          <div className="seo-article-meta"><span className="badge">Conseils · Apprendre le chinois en français</span><span>{article.readingMinutes} min de lecture</span><span>Niveau débutant</span></div>
          <h1>{article.title}</h1>
          <p className="seo-article-deck">{article.description}</p>
        </header>
        {article.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.points ? <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul> : null}</section>)}
        <section>
          <h2>Continuer avec Visd AR</h2>
          <p>Les ebooks bilingues et outils numériques Visd AR accompagnent les débutants avec des sinogrammes, du pinyin et une traduction française claire.</p>
          <div className="actions-row"><Link className="cta-button" href="/catalogue">Découvrir le catalogue</Link><Link className="pill-button" href="/blog/lecture-chinois-pinyin-traduction">Lire le guide de lecture</Link></div>
        </section>
        <section><h2>À lire aussi</h2><div className="seo-book-links">{related.map((item) => <Link className="seo-book-link" href={`/blog/${item.slug}`} key={item.slug}><span className="seo-book-link-copy"><strong>{item.title}</strong><span>{item.description}</span></span></Link>)}</div></section>
      </article>
    </main>
  );
}
