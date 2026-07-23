"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { resolveDisplayBookById, type DisplayBook } from "@/lib/books-service";
import { hasPurchasedBook } from "@/lib/purchase-access";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type ReaderState = "loading" | "ready" | "paywall" | "login" | "missing";

export default function ReadBookPage() {
  const params = useParams<{ id: string }>();
  const bookId = params.id;
  const { user, session, loading, isAdmin } = useAuth();
  const [book, setBook] = useState<DisplayBook | null>(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [readerState, setReaderState] = useState<ReaderState>("loading");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadBook = async () => {
      setBookLoading(true);
      const nextBook = await resolveDisplayBookById(bookId, true);

      if (!cancelled) {
        setBook(nextBook);
        setBookLoading(false);
      }
    };

    void loadBook();

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  useEffect(() => {
    if (bookLoading) {
      setReaderState("loading");
      return;
    }

    if (!book) {
      setReaderState("missing");
      return;
    }

    if (loading) {
      return;
    }

    if (!user) {
      setReaderState("login");
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setReaderState(isAdmin ? "ready" : "paywall");
      return;
    }

    const verifyAccess = async () => {
      if (isAdmin) {
        setReaderState("ready");
        return;
      }

      const purchased = await hasPurchasedBook(supabase, {
        userId: user.id,
        email: user.email,
        bookId,
      });

      setReaderState(purchased ? "ready" : "paywall");
    };

    void verifyAccess();
  }, [book, bookId, bookLoading, isAdmin, loading, user]);

  useEffect(() => {
    if (readerState !== "ready" || !session?.access_token || !book) {
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const loadPdf = async () => {
      setPdfError("");

      try {
        const response = await fetch(`/api/books/${bookId}/pdf`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Impossible de charger le livre.");
        }

        const blob = await response.blob();

        if (cancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Impossible de charger le livre.";
          setPdfError(message);
        }
      }
    };

    void loadPdf();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [book, bookId, readerState, session?.access_token]);

  const handleCheckout = async () => {
    if (!book) {
      return;
    }

    setPaying(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "book",
          id: book.id,
          email: user?.email || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.url) {
        setPdfError(result.message || "Paiement indisponible.");
        return;
      }

      window.location.href = result.url;
    } finally {
      setPaying(false);
    }
  };

  if (!book) {
    return (
      <main className="page-shell">
        <TopNav subtitle="Lecture en ligne" title="Lecture" showAdmin showLogout />
        <section className="panel glass reader-panel">
          <h1 className="section-title">Livre introuvable</h1>
          <p className="section-caption">Ce titre n&apos;existe pas dans le catalogue.</p>
          <Link className="cta-button" href="/catalogue">
            Retour au catalogue
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <TopNav subtitle="Lecture en ligne" title={book.titleFr} showAdmin showLogout />

      <section className="panel glass reader-panel">
        <div className="reader-header">
          <div className="reader-book-meta">
            <div className="reader-cover-wrap">
              <Image
                src={book.coverImage}
                alt={book.titleFr}
                width={120}
                height={160}
                className="reader-cover-image"
              />
            </div>
            <div>
              <h1 className="section-title" style={{ marginBottom: 4 }}>
                {book.titleFr}
              </h1>
              <p className="section-caption" style={{ marginBottom: 0 }}>
                {book.titleZh}
              </p>
            </div>
          </div>
        </div>

        {readerState === "loading" ? <p className="muted">Verification de l&apos;acces…</p> : null}

        {readerState === "login" ? (
          <div className="reader-gate">
            <p className="section-caption">
              Connectez-vous pour lire ce livre en ligne. Si vous avez deja achete ce titre, votre acces sera restaure automatiquement.
            </p>
            <div className="actions-row">
              <Link className="cta-button" href="/">
                Retour a l&apos;accueil pour se connecter
              </Link>
              <Link className="cta-button secondary" href="/catalogue">
                Voir le catalogue
              </Link>
            </div>
          </div>
        ) : null}

        {readerState === "paywall" ? (
          <div className="reader-gate">
            <p className="section-caption">
              Ce livre est reserve aux lecteurs qui l&apos;ont achete. Achetez-le pour debloquer la lecture en ligne et le telechargement PDF.
            </p>
            <div className="actions-row">
              <button className="cta-button" type="button" disabled={paying} onClick={() => void handleCheckout()}>
                {paying ? "Redirection…" : `Acheter · ${book.priceEur.toFixed(2)} EUR`}
              </button>
              <Link className="cta-button secondary" href="/catalogue">
                Retour au catalogue
              </Link>
            </div>
            {pdfError ? <p className="tiny">{pdfError}</p> : null}
          </div>
        ) : null}

        {readerState === "ready" ? (
          <div className="reader-stage">
            {pdfError ? <p className="tiny">{pdfError}</p> : null}
            {!pdfUrl && !pdfError ? <p className="muted">Chargement du livre…</p> : null}
            {pdfUrl ? (
              <iframe
                className="reader-frame"
                src={pdfUrl}
                title={`Lecture de ${book.titleFr}`}
              />
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
