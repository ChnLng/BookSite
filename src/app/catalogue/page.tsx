"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Ticket, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/components/auth-provider";
import { loadDisplayBooks, type DisplayBook } from "@/lib/books-service";
import { infoLinks } from "@/lib/legal-info";

export default function CataloguePage() {
  const { user } = useAuth();
  const [activeInfoId, setActiveInfoId] = useState<string | null>(null);
  const [payingBookId, setPayingBookId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [books, setBooks] = useState<DisplayBook[]>([]);
  const activeInfo = infoLinks.find((item) => item.id === activeInfoId);

  useEffect(() => {
    void loadDisplayBooks().then(setBooks);
  }, []);

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
          promoCode: promoCode.trim() || undefined,
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
      <header className="topbar glass topbar-luxury">
        <div className="brand-mark">
          <BrandLogo />
          <div>
            <div className="tiny">Bibliotheque visuelle bilingue</div>
            <strong>Visd AR</strong>
          </div>
        </div>
        <nav className="nav-links">
          <Link href="/">Accueil</Link>
          <Link href="/account">Mon compte</Link>
          <a href="#catalogue-scene">Selection</a>
        </nav>
      </header>

      <section className="catalog-grid" id="catalogue-scene">
        <aside className="panel glass">
          <div className="badge">Filtres simples</div>
          <div className="section-block">
            <div className="split-line">
              <span>Albums bilingues</span>
              <strong>{books.length}</strong>
            </div>
            <div className="split-line">
              <span>Prix unique</span>
              <strong>{books[0]?.priceEur.toFixed(2) || "5.99"} EUR</strong>
            </div>
            <div className="split-line">
              <span>Format prevu</span>
              <strong>PDF EPUB MOBI</strong>
            </div>
          </div>
          <div className="section-block">
            <label className="tiny" htmlFor="promo-code">
              Code promo
            </label>
            <input
              id="promo-code"
              className="input"
              placeholder="VISD10"
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
            />
          </div>
        </aside>

        <section className="panel glass">
          <h1 className="section-title" style={{ fontFamily: "var(--font-heading), serif" }}>
            Catalogue
          </h1>
          <p className="section-caption">
            Cette page est volontairement claire et compacte pour eviter de faire
            trop defiler.
          </p>
          <div className="book-grid">
            {books.map((book) => (
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
