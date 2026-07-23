"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Ticket, X } from "lucide-react";
import { GoogleAdsSlot } from "@/components/google-ads-slot";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { loadDisplayBooks, type DisplayBook } from "@/lib/books-service";
import { infoLinks } from "@/lib/legal-info";

export default function CataloguePage() {
  const { user } = useAuth();
  const [activeInfoId, setActiveInfoId] = useState<string | null>(null);
  const [payingBookId, setPayingBookId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState<DisplayBook[]>([]);
  const activeInfo = infoLinks.find((item) => item.id === activeInfoId);

  useEffect(() => {
    void loadDisplayBooks().then(setBooks);
  }, []);

  const filteredBooks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) {
      return books;
    }

    return books.filter((book) => {
      const haystack = [book.titleFr, book.titleZh]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [books, searchTerm]);

  const handleBookCheckout = async (bookId: string) => {
    setPayingBookId(bookId);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "book",
          id: bookId,
          email: user?.email || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.url) {
        return;
      }

      window.location.href = result.url;
    } finally {
      setPayingBookId(null);
    }
  };

  return (
    <main className="page-shell">
      <TopNav
        className="topbar-luxury"
        subtitle="Bibliotheque visuelle bilingue"
        title="Visd AR"
        showAdmin
        showLogout
      />

      <section className="catalog-grid" id="catalogue-scene">
        <aside className="catalogue-sidebar">
          <div className="panel glass">
          <div className="section-block">
            <label className="tiny" htmlFor="catalog-search">
              Rechercher par titre
            </label>
            <p className="tiny" style={{ marginTop: 8, marginBottom: 10 }}>
              Entrez un titre en francais ou en chinois pour afficher le produit correspondant.
            </p>
            <input
              id="catalog-search"
              className="input"
              placeholder="Tapez un titre FR ou ZH"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          </div>
          <GoogleAdsSlot
            client="ca-pub-6796254088003500"
            className="panel glass ad-slot-panel"
            label="Ads"
            slot="8355506858"
          />
        </aside>

        <section className="panel glass">
          <h1 className="section-title" style={{ fontFamily: "var(--font-heading), serif" }}>
            Catalogue
          </h1>
          <div className="book-grid catalogue-book-grid">
            {filteredBooks.map((book) => (
              <article className="book-card" key={book.id}>
                <div className="book-cover-wrap">
                  <Image
                    src={book.coverImage}
                    alt={book.titleFr}
                    width={320}
                    height={420}
                    className="book-cover-image"
                  />
                </div>
                <div className="book-meta" style={{ marginTop: 16 }}>
                  <strong>{book.titleFr}</strong>
                  <div className="tiny">{book.titleZh}</div>
                  <div className="tiny">{book.teachingPointFr}</div>
                  <p className="muted">{book.synopsisFr}</p>
                  <div className="split-line">
                    <span>Prix</span>
                    <strong>{book.priceEur.toFixed(2)} EUR</strong>
                  </div>
                  <div className="actions-row">
                    <button className="cta-button" type="button" onClick={() => void handleBookCheckout(book.id)}>
                      {payingBookId === book.id ? "Paiement..." : "Acheter"}
                    </button>
                    <a className="pill-button" href={book.amazonEbookUrl} target="_blank">
                      Voir Amazon
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filteredBooks.length === 0 ? (
            <p className="muted" style={{ marginTop: 18 }}>
              Aucun produit ne correspond au titre saisi.
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
            className="overlay-card overlay-card-small glass"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="overlay-close" type="button" onClick={() => setActiveInfoId(null)}>
              <X size={18} />
            </button>
            <div className="badge">Information</div>
            <h3 style={{ margin: "14px 0 10px" }}>{activeInfo.title}</h3>
            <p className="muted">{activeInfo.body}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
