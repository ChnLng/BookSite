"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Ticket, X } from "lucide-react";
import { PartnerAdSlot } from "@/components/partner-ad-slot";
import { TopNav } from "@/components/top-nav";
import { infoLinks } from "@/lib/legal-info";
import type { DisplayBook } from "@/lib/books-service";
import { loadDisplayResources } from "@/lib/resources-service";

type CatalogueProduct = {
  id: string;
  kind: "book" | "resource";
  titleFr: string;
  titleZh: string;
  image: string;
  priceEur: number;
  href: string;
  externalUrl: string;
};

type CatalogueClientProps = {
  initialBooks: DisplayBook[];
};

export function CatalogueClient({ initialBooks }: CatalogueClientProps) {
  const [activeInfoId, setActiveInfoId] = useState<string | null>(null);
  const [payingBookId, setPayingBookId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [resources, setResources] = useState<CatalogueProduct[]>([]);
  const activeInfo = infoLinks.find((item) => item.id === activeInfoId);

  useEffect(() => {
    let cancelled = false;
    void loadDisplayResources().then((items) => {
      if (cancelled) return;
      setResources(items.filter((item) => item.visible).map((item) => ({ id: item.slug || item.id, kind: "resource", titleFr: item.titleFr, titleZh: "", image: item.coverImageUrl || item.qrImageUrl, priceEur: item.priceEur, href: `/outils/${item.slug || item.id}`, externalUrl: item.externalUrl })));
    });
    return () => { cancelled = true; };
  }, []);

  const products = useMemo<CatalogueProduct[]>(() => [
    ...initialBooks.map((book) => ({ id: book.id, kind: "book" as const, titleFr: book.titleFr, titleZh: book.titleZh, image: book.coverImage, priceEur: book.priceEur, href: `/livres/${book.id}`, externalUrl: book.amazonEbookUrl })),
    ...resources,
  ].sort((left, right) => left.titleFr.localeCompare(right.titleFr, "fr", { sensitivity: "base" })), [initialBooks, resources]);

  const filteredBooks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) {
      return products;
    }

    return products.filter((book) => {
      const haystack = [book.titleFr, book.titleZh].join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
  }, [products, searchTerm]);

  const handleBookCheckout = async (product: CatalogueProduct) => {
    setPayingBookId(product.id);
    window.location.href = `${product.href}?buy=1`;
    setPayingBookId(null);
  };

  return (
    <main className="page-shell">
      <TopNav
        className="topbar-luxury"
        subtitle="Bibliothèque visuelle bilingue"
        title="Visd AR"
        showAdmin
        showLogout
        hideCatalogueLink
      />

      <section className="catalog-grid" id="catalogue-scene">
        <aside className="catalogue-sidebar">
          <div className="panel glass catalogue-search-panel">
            <div className="section-block">
              <label className="section-heading" htmlFor="catalog-search">
                <span className="section-heading-icon" aria-hidden="true">
                  <Search size={17} />
                </span>
                <span className="section-heading-text">Rechercher par&nbsp;titre</span>
              </label>
              <input
                id="catalog-search"
                className="input"
                placeholder="Tapez un titre FR ou ZH"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <p className="tiny" style={{ marginTop: 10, marginBottom: 0 }}>
                Entrez un titre en français ou en chinois pour afficher le produit correspondant.
              </p>
            </div>
          </div>
          <PartnerAdSlot />
        </aside>

        <section className="panel glass">
          <h1 className="section-title" style={{ fontFamily: "var(--font-heading), serif" }}>
            Catalogue
          </h1>
          <div className="book-grid catalogue-book-grid">
            {filteredBooks.map((book) => (
              <article className="book-card catalogue-product-card" key={`${book.kind}-${book.id}`}>
                <Link href={book.href} className="book-cover-wrap">
                  <Image
                    src={book.image}
                    alt={book.titleFr}
                    width={320}
                    height={420}
                    className="book-cover-image"
                    sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 25vw"
                  />
                </Link>
                <div className="book-meta" style={{ marginTop: 16 }}>
                  <Link href={book.href}>
                    <strong>{book.titleFr}</strong>
                  </Link>
                  {book.titleZh ? <div className="tiny">{book.titleZh}</div> : null}
                  <div className="split-line">
                    <span>Prix</span>
                    <strong>{book.priceEur.toFixed(2)} EUR</strong>
                  </div>
                  <div className="catalogue-card-actions">
                    <button className="cta-button catalogue-compact-button" type="button" onClick={() => void handleBookCheckout(book)}>
                      {payingBookId === book.id ? "Paiement..." : "Acheter"}
                    </button>
                    {book.externalUrl ? <a className="pill-button catalogue-compact-button" href={book.externalUrl} target="_blank" rel="noreferrer">{book.kind === "book" ? "Amazon" : "Lien externe"}</a> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filteredBooks.length === 0 ? (
            <p className="muted" style={{ marginTop: 18 }}>
              Magie en cours... Les tresors arrivent tout de suite ! ✨
            </p>
          ) : null}
        </section>
      </section>

      <footer className="panel glass footer-rules" id="footer-rules">
        <div className="footer-inline">
          <div className="badge">
            <Ticket size={16} />
            Informations
          </div>
          <div className="footer-links">
            {infoLinks.map((item) => (
              <button
                className="footer-link-button"
                key={item.id}
                type="button"
                onClick={() => setActiveInfoId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {activeInfo ? (
        <div className="overlay-backdrop" role="presentation" onClick={() => setActiveInfoId(null)}>
          <div
            className={`overlay-card overlay-card-small glass${activeInfo.id === "guide-lecture" ? " guide-overlay-card" : ""}`}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="overlay-close" type="button" onClick={() => setActiveInfoId(null)}>
              <X size={18} />
            </button>
            <div className="badge">{activeInfo.id === "guide-lecture" ? "Guide de lecture" : "Information"}</div>
            <h3 style={{ margin: "14px 0 10px" }}>{activeInfo.title}</h3>
            <p className="muted">{activeInfo.body}</p>
            {activeInfo.href ? (
              <Link className="cta-button guide-overlay-cta" href={activeInfo.href} onClick={() => setActiveInfoId(null)}>
                {activeInfo.ctaLabel || "En savoir plus"}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
