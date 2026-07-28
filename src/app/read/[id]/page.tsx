"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { resolveDisplayBookById, type DisplayBook } from "@/lib/books-service";

type ReaderState = "loading" | "ready" | "paywall" | "login" | "missing";

function PdfCanvasPage({ document, pageNumber }: { document: PDFDocumentProxy; pageNumber: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;

    const renderPage = async () => {
      const page = await document.getPage(pageNumber);
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({ scale: 1.35 });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
      });
      await renderTask.promise;
    };

    void renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber]);

  return (
    <div className="reader-page reader-pdf-page" aria-label={`Page ${pageNumber}`}>
      <canvas ref={canvasRef} />
      <span className="reader-page-number">{pageNumber}</span>
    </div>
  );
}

export default function ReadBookPage() {
  const params = useParams<{ id: string }>();
  const bookId = params.id;
  const { user, session, loading } = useAuth();
  const [book, setBook] = useState<DisplayBook | null>(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [readerState, setReaderState] = useState<ReaderState>("loading");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState("");
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [spreadIndex, setSpreadIndex] = useState(0);
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

    const verifyAccess = async () => {
      if (!session?.access_token) return;
      try {
        const response = await fetch(`/api/books/${bookId}/access`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const result = (await response.json().catch(() => null)) as { hasAccess?: boolean } | null;
        setReaderState(response.ok && result?.hasAccess ? "ready" : "paywall");
      } catch {
        setReaderState("paywall");
      }
    };

    void verifyAccess();
  }, [book, bookId, bookLoading, loading, session?.access_token, user]);

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
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const nextDocument = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
        if (!cancelled) {
          setPdfDocument(nextDocument);
          setSpreadIndex(0);
        }
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
      setPdfDocument(null);
    };
  }, [book, bookId, readerState, session?.access_token]);

  const spreadCount = pdfDocument ? 1 + Math.ceil(Math.max(0, pdfDocument.numPages - 1) / 2) : 0;
  const leftPdfPage = spreadIndex > 0 ? spreadIndex * 2 : null;
  const rightPdfPage = spreadIndex === 0 ? 1 : spreadIndex * 2 + 1;

  const handleCheckout = async () => {
    if (!book) {
      return;
    }

    setPaying(true);
    window.location.href = `/livres/${book.id}?buy=1`;
    setPaying(false);
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
            {pdfUrl && !pdfDocument && !pdfError ? <p className="muted">Préparation des pages…</p> : null}
            {pdfDocument ? (
              <div className="reader-book-viewer">
                <div className="reader-spread" aria-live="polite">
                  {spreadIndex === 0 ? (
                    <div className="reader-page reader-cover-page">
                      <Image src={book.coverImage} alt={`Couverture de ${book.titleFr}`} fill sizes="45vw" />
                      <span className="reader-page-number">Couverture</span>
                    </div>
                  ) : leftPdfPage && leftPdfPage <= pdfDocument.numPages ? (
                    <PdfCanvasPage document={pdfDocument} pageNumber={leftPdfPage} />
                  ) : (
                    <div className="reader-page reader-empty-page" />
                  )}

                  {rightPdfPage <= pdfDocument.numPages ? (
                    <PdfCanvasPage document={pdfDocument} pageNumber={rightPdfPage} />
                  ) : (
                    <div className="reader-page reader-empty-page" />
                  )}
                </div>
                <div className="reader-controls">
                  <button
                    className="pill-button"
                    type="button"
                    disabled={spreadIndex === 0}
                    onClick={() => setSpreadIndex((current) => Math.max(0, current - 1))}
                  >
                    <ChevronLeft size={18} /> Précédent
                  </button>
                  <span>
                    {spreadIndex === 0 ? "Couverture · 1" : `${leftPdfPage} · ${Math.min(rightPdfPage, pdfDocument.numPages)}`}
                    {` / ${pdfDocument.numPages}`}
                  </span>
                  <button
                    className="pill-button"
                    type="button"
                    disabled={spreadIndex >= spreadCount - 1}
                    onClick={() => setSpreadIndex((current) => Math.min(spreadCount - 1, current + 1))}
                  >
                    Suivant <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
