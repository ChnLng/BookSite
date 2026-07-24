"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleAdsSlot } from "@/components/google-ads-slot";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { loadDisplayBooks, resolveDisplayBookById, type DisplayBook } from "@/lib/books-service";

export default function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [book, setBook] = useState<DisplayBook | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<DisplayBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingBookId, setPayingBookId] = useState<string | null>(null);

  const bookId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";

  useEffect(() => {
    if (!bookId) {
      setLoading(false);
      setBook(null);
      setRelatedBooks([]);
      return;
    }

    let cancelled = false;

    const loadBookPage = async () => {
      setLoading(true);

      const [resolvedBook, catalogueBooks] = await Promise.all([
        resolveDisplayBookById(bookId),
        loadDisplayBooks(),
      ]);

      if (cancelled) {
        return;
      }

      setBook(resolvedBook);

      if (!resolvedBook) {
        setRelatedBooks([]);
        setLoading(false);
        return;
      }

      const nextRelatedBooks = catalogueBooks.filter((candidate) => {
        if (candidate.id === resolvedBook.id) {
          return false;
        }

        return resolvedBook.relatedBookIds.some(
          (relatedId) => relatedId === candidate.id || relatedId === candidate.dbId,
        );
      });

      setRelatedBooks(nextRelatedBooks);
      setLoading(false);
    };

    void loadBookPage();

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const handleBookCheckout = async (targetBookId: string) => {
    setPayingBookId(targetBookId);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "book",
          id: targetBookId,
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
        subtitle="Presentation du livre"
        title="Visd AR"
        showAdmin
        showLogout
      />

      <section className="book-detail-layout">
        <aside className="book-detail-sidebar">
          <div className="panel glass">
            <div className="badge">Produits associes</div>
            <div className="book-detail-related-list">
              {loading ? (
                <p className="muted">Chargement des suggestions...</p>
              ) : relatedBooks.length > 0 ? (
                relatedBooks.map((relatedBook) => (
                  <Link className="book-detail-related-card" href={`/livres/${relatedBook.id}`} key={relatedBook.id}>
                    <div className="book-detail-related-cover">
                      <Image
                        src={relatedBook.coverImage}
                        alt={relatedBook.titleFr}
                        fill
                        sizes="140px"
                        className="book-cover-image"
                      />
                    </div>
                    <div className="book-detail-related-copy">
                      <strong>{relatedBook.titleFr}</strong>
                      <span className="tiny">{relatedBook.titleZh}</span>
                      <span className="tiny">{relatedBook.priceEur.toFixed(2)} EUR</span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="muted">Aucun produit associe pour le moment.</p>
              )}
            </div>
          </div>

          <GoogleAdsSlot
            client="ca-pub-6796254088003500"
            className="panel glass ad-slot-panel"
            label="Ads"
            slot="8355506858"
          />
        </aside>

        <section className="panel glass book-detail-main">
          {loading ? (
            <p className="muted">Chargement du livre...</p>
          ) : !book ? (
            <div className="book-detail-empty">
              <h1 className="section-title">Livre introuvable</h1>
              <p className="muted">Ce produit n&apos;est pas disponible ou n&apos;est plus visible.</p>
              <div className="actions-row">
                <Link className="cta-button" href="/catalogue">
                  Retour au catalogue
                </Link>
              </div>
            </div>
          ) : (
            <div className="book-detail-hero">
              <div className="book-detail-cover-shell">
                <div className="book-detail-cover-frame">
                  <Image
                    src={book.coverImage}
                    alt={book.titleFr}
                    width={520}
                    height={680}
                    className="book-detail-cover-image"
                  />
                </div>
              </div>

              <div className="book-detail-copy">
                <div className="badge">Livre bilingue</div>
                <h1 className="section-title" style={{ marginTop: 18 }}>
                  {book.titleFr}
                </h1>
                <p className="tiny">{book.titleZh}</p>
                <p className="muted">{book.synopsisFr}</p>
                {book.synopsisZh ? <p className="muted">{book.synopsisZh}</p> : null}

                <div className="book-detail-facts">
                  <div className="split-line">
                    <span>Prix</span>
                    <strong>{book.priceEur.toFixed(2)} EUR</strong>
                  </div>
                  {book.publishDate ? (
                    <div className="split-line">
                      <span>Date de parution</span>
                      <strong>{book.publishDate}</strong>
                    </div>
                  ) : null}
                  {book.asin ? (
                    <div className="split-line">
                      <span>ASIN</span>
                      <strong>{book.asin}</strong>
                    </div>
                  ) : null}
                </div>

                {book.teachingPointFr ? (
                  <div className="book-detail-note">
                    <strong>Point fort</strong>
                    <p className="muted">{book.teachingPointFr}</p>
                  </div>
                ) : null}

                <div className="actions-row">
                  <button className="cta-button" type="button" onClick={() => void handleBookCheckout(book.id)}>
                    {payingBookId === book.id ? "Paiement..." : "Acheter ce livre"}
                  </button>
                  <Link className="pill-button" href="/catalogue">
                    Retour au catalogue
                  </Link>
                  {book.amazonEbookUrl ? (
                    <a className="pill-button" href={book.amazonEbookUrl} target="_blank" rel="noreferrer">
                      Amazon ebook
                    </a>
                  ) : null}
                  {book.amazonPaperbackUrl ? (
                    <a className="pill-button" href={book.amazonPaperbackUrl} target="_blank" rel="noreferrer">
                      Amazon papier
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
