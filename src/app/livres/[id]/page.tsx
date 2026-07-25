"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleAdsSlot } from "@/components/google-ads-slot";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { loadDisplayBooks, resolveDisplayBookById, type DisplayBook } from "@/lib/books-service";

type ReviewRecord = {
  id: string;
  authorName: string;
  rating: number;
  reviewText: string;
  createdAt: string | null;
};

type ReviewSummary = {
  averageRating: number;
  totalReviews: number;
};

type ReviewFormState = {
  authorName: string;
  rating: number;
  reviewText: string;
};

type PaymentSuccessState = {
  accountUrl: string;
  readUrl: string;
};

type PayPalButtonsInstance = {
  render: (target: HTMLElement | string) => Promise<void> | void;
  close?: () => Promise<void> | void;
};

type PayPalWindow = Window & {
  paypal?: {
    Buttons?: (config: Record<string, unknown>) => PayPalButtonsInstance;
  };
};

const defaultReviewForm: ReviewFormState = {
  authorName: "",
  rating: 5,
  reviewText: "",
};

function formatReviewDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildDefaultAuthorName(email?: string | null, displayName?: string | null) {
  if (displayName?.trim()) {
    return displayName.trim();
  }

  if (email?.trim()) {
    return email.split("@")[0];
  }

  return "";
}

function renderFilledStars(count: number) {
  return "🌟".repeat(Math.max(0, Math.min(5, count)));
}

export default function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user, session, profile } = useAuth();
  const [book, setBook] = useState<DisplayBook | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<DisplayBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
    averageRating: 0,
    totalReviews: 0,
  });
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(defaultReviewForm);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccessState | null>(null);
  const [autoOpenedPayment, setAutoOpenedPayment] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement | null>(null);

  const bookId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";
  const openBuyImmediately = searchParams.get("buy") === "1";

  const defaultAuthorName = useMemo(
    () => buildDefaultAuthorName(user?.email, profile?.displayName),
    [profile?.displayName, user?.email],
  );

  useEffect(() => {
    setReviewForm((current) => {
      if (current.authorName.trim()) {
        return current;
      }

      if (!defaultAuthorName) {
        return current;
      }

      return {
        ...current,
        authorName: defaultAuthorName,
      };
    });
  }, [defaultAuthorName]);

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

  useEffect(() => {
    if (!bookId) {
      setReviews([]);
      setReviewSummary({ averageRating: 0, totalReviews: 0 });
      setReviewsLoading(false);
      return;
    }

    let cancelled = false;

    const loadReviews = async () => {
      setReviewsLoading(true);

      try {
        const response = await fetch(`/api/books/${bookId}/reviews`, {
          cache: "no-store",
        });
        const result = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              summary?: ReviewSummary;
              reviews?: ReviewRecord[];
            }
          | null;

        if (cancelled) {
          return;
        }

        if (!response.ok || !result?.ok) {
          setReviews([]);
          setReviewSummary({ averageRating: 0, totalReviews: 0 });
          return;
        }

        setReviews(result.reviews || []);
        setReviewSummary(
          result.summary || {
            averageRating: 0,
            totalReviews: 0,
          },
        );
      } finally {
        if (!cancelled) {
          setReviewsLoading(false);
        }
      }
    };

    void loadReviews();

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  useEffect(() => {
    if (!book || !openBuyImmediately || autoOpenedPayment) {
      return;
    }

    setShowPayment(true);
    setAutoOpenedPayment(true);
  }, [autoOpenedPayment, book, openBuyImmediately]);

  useEffect(() => {
    if (!showPayment) {
      setPaymentReady(false);
      setPaymentError("");

      if (paypalContainerRef.current) {
        paypalContainerRef.current.innerHTML = "";
      }

      return;
    }

    if (!book || !paypalContainerRef.current || typeof window === "undefined") {
      return;
    }

    paypalContainerRef.current.innerHTML = "";
    setPaymentReady(false);
    setPaymentError("");
    setPaymentSuccess(null);

    const paypalWindow = window as PayPalWindow;
    const buttonsFactory = paypalWindow.paypal?.Buttons;

    if (!buttonsFactory) {
      setPaymentError("Le module PayPal est en cours de chargement. Reessayez dans un instant.");
      return;
    }

    const buttons = buttonsFactory({
      style: {
        layout: "vertical",
        shape: "pill",
        label: "paypal",
      },
      createOrder: (_data: unknown, actions: any) =>
        actions.order.create({
          purchase_units: [
            {
              custom_id: book.id,
              description: book.titleFr,
              amount: {
                currency_code: "EUR",
                value: book.priceEur.toFixed(2),
              },
            },
          ],
        }),
      onApprove: async (data: any, actions: any) => {
        const order = await actions.order.capture();
        const payerEmail = order?.payer?.email_address || "";
        const payerName = [order?.payer?.name?.given_name, order?.payer?.name?.surname]
          .filter(Boolean)
          .join(" ")
          .trim();

        const response = await fetch("/api/paypal/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? {
                  Authorization: `Bearer ${session.access_token}`,
                }
              : {}),
          },
          body: JSON.stringify({
            bookId: book.id,
            orderId: order?.id || data?.orderID,
            payerEmail,
            payerName,
          }),
        });

        const result = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              message?: string;
              accountUrl?: string;
              readUrl?: string;
            }
          | null;

        if (!response.ok || !result?.ok) {
          throw new Error(result?.message || "Paiement valide, mais enregistrement impossible.");
        }

        setPaymentSuccess({
          accountUrl: result.accountUrl || "/account",
          readUrl: result.readUrl || `/read/${book.id}`,
        });
        setPaymentError("");

        if (paypalContainerRef.current) {
          paypalContainerRef.current.innerHTML = "";
        }
      },
      onError: () => {
        setPaymentError("Impossible d'ouvrir PayPal pour le moment.");
      },
    });

    const rendered = buttons.render(paypalContainerRef.current);
    Promise.resolve(rendered)
      .then(() => {
        setPaymentReady(true);
      })
      .catch(() => {
        setPaymentError("Impossible d'ouvrir PayPal pour le moment.");
      });

    return () => {
      if (paypalContainerRef.current) {
        paypalContainerRef.current.innerHTML = "";
      }

      void buttons.close?.();
    };
  }, [book, session?.access_token, showPayment]);

  const refreshReviews = async () => {
    if (!bookId) {
      return;
    }

    const response = await fetch(`/api/books/${bookId}/reviews`, {
      cache: "no-store",
    });
    const result = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          summary?: ReviewSummary;
          reviews?: ReviewRecord[];
        }
      | null;

    if (!response.ok || !result?.ok) {
      return;
    }

    setReviews(result.reviews || []);
    setReviewSummary(
      result.summary || {
        averageRating: 0,
        totalReviews: 0,
      },
    );
  };

  const handleReviewSubmit = async () => {
    if (!book) {
      return;
    }

    setReviewSubmitting(true);
    setReviewMessage("");

    try {
      const response = await fetch(`/api/books/${book.id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : {}),
        },
        body: JSON.stringify(reviewForm),
      });

      const result = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
          }
        | null;

      if (!response.ok || !result?.ok) {
        setReviewMessage(result?.message || "Impossible d'enregistrer votre avis.");
        return;
      }

      setReviewForm((current) => ({
        authorName: current.authorName,
        rating: 5,
        reviewText: "",
      }));
      setReviewMessage("Merci ! Votre note et votre ressenti sont bien enregistres.");
      await refreshReviews();
    } finally {
      setReviewSubmitting(false);
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
            </div>
          ) : (
            <div className="book-detail-hero">
              <div className="book-detail-cover-column">
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

                <div className="book-review-card">
                  <div className="book-review-summary">
                    <div>
                      <strong>Avis des lecteurs</strong>
                      <p className="tiny" style={{ marginTop: 6, marginBottom: 0 }}>
                        {reviewSummary.totalReviews > 0
                          ? `${reviewSummary.averageRating.toFixed(1)} / 5 · ${reviewSummary.totalReviews} avis`
                          : "Soyez le premier a laisser une note 🌟"}
                      </p>
                    </div>
                    <div className="book-review-average-stars" aria-label={`Note moyenne ${reviewSummary.averageRating.toFixed(1)} sur 5`}>
                      {reviewSummary.totalReviews > 0 ? renderFilledStars(Math.round(reviewSummary.averageRating)) : "🌟🌟🌟🌟🌟"}
                    </div>
                  </div>

                  <div className="input-group compact-form">
                    <label className="tiny" htmlFor="book-review-author">
                      Votre nom
                    </label>
                    <input
                      id="book-review-author"
                      className="input compact-input"
                      value={reviewForm.authorName}
                      onChange={(event) =>
                        setReviewForm((current) => ({
                          ...current,
                          authorName: event.target.value,
                        }))
                      }
                      placeholder="Votre prenom ou pseudo"
                    />

                    <div>
                      <div className="tiny" style={{ marginBottom: 8 }}>
                        Votre note
                      </div>
                      <div className="book-review-star-picker">
                        {Array.from({ length: 5 }, (_, index) => {
                          const value = index + 1;
                          const active = value <= reviewForm.rating;

                          return (
                            <button
                              key={value}
                              className={active ? "book-review-star active" : "book-review-star"}
                              type="button"
                              onClick={() =>
                                setReviewForm((current) => ({
                                  ...current,
                                  rating: value,
                                }))
                              }
                              aria-label={`Noter ${value} sur 5`}
                            >
                              🌟
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <label className="tiny" htmlFor="book-review-text">
                      Votre ressenti apres lecture
                    </label>
                    <textarea
                      id="book-review-text"
                      className="textarea compact-textarea"
                      value={reviewForm.reviewText}
                      onChange={(event) =>
                        setReviewForm((current) => ({
                          ...current,
                          reviewText: event.target.value,
                        }))
                      }
                      placeholder="Partagez votre lecture en quelques lignes..."
                    />

                    <button className="cta-button" type="button" disabled={reviewSubmitting} onClick={() => void handleReviewSubmit()}>
                      {reviewSubmitting ? "Publication..." : "Publier votre avis"}
                    </button>
                    {reviewMessage ? <p className="tiny">{reviewMessage}</p> : null}
                  </div>

                  <div className="book-review-list">
                    {reviewsLoading ? (
                      <p className="muted">Chargement des avis...</p>
                    ) : reviews.length > 0 ? (
                      reviews.map((review) => (
                        <article className="book-review-item" key={review.id}>
                          <div className="book-review-item-header">
                            <strong>{review.authorName}</strong>
                            <span className="book-review-inline-stars">{renderFilledStars(review.rating)}</span>
                          </div>
                          <p className="muted" style={{ marginBottom: 10 }}>
                            {review.reviewText}
                          </p>
                          <span className="tiny">{formatReviewDate(review.createdAt)}</span>
                        </article>
                      ))
                    ) : (
                      <p className="muted">Aucun retour pour l&apos;instant. Votre lecture peut lancer la premiere etoile.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="book-detail-copy">
                <div className="badge">Livre bilingue</div>
                <h1 className="section-title" style={{ marginTop: 18 }}>
                  {book.titleFr}
                </h1>
                <p className="tiny">{book.titleZh}</p>

                <div className="actions-row book-detail-actions-row">
                  <button className="cta-button" type="button" onClick={() => setShowPayment(true)}>
                    Acheter ce livre
                  </button>

                  <div className="book-tooltip">
                    {book.amazonPaperbackUrl ? (
                      <a
                        className="pill-button"
                        href={book.amazonPaperbackUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Ce bouton ouvre la page Amazon de ce livre broche."
                      >
                        Amazon broche
                      </a>
                    ) : (
                      <button className="pill-button" type="button" disabled>
                        Amazon broche
                      </button>
                    )}
                    <span className="book-tooltip-bubble">
                      Cliquez ici pour ouvrir la page Amazon correspondante.
                    </span>
                  </div>
                </div>

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
              </div>
            </div>
          )}
        </section>
      </section>

      {showPayment && book ? (
        <div className="overlay-backdrop" role="presentation" onClick={() => setShowPayment(false)}>
          <div
            className="overlay-card glass book-payment-card"
            role="dialog"
            aria-modal="true"
            aria-label={`Paiement PayPal pour ${book.titleFr}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="overlay-close" type="button" onClick={() => setShowPayment(false)}>
              Fermer
            </button>
            <div className="badge">PayPal</div>
            <h2 style={{ marginTop: 14, marginBottom: 10 }}>{book.titleFr}</h2>
            <p className="tiny" style={{ marginBottom: 16 }}>
              {book.titleZh}
            </p>
            <div className="split-line" style={{ paddingTop: 0 }}>
              <span>Montant</span>
              <strong>{book.priceEur.toFixed(2)} EUR</strong>
            </div>

            {paymentSuccess ? (
              <div className="book-payment-success">
                <p className="muted">
                  Paiement confirme. Le livre est maintenant ajoute a votre espace lecteur.
                </p>
                <div className="actions-row">
                  <Link className="cta-button" href={paymentSuccess.readUrl}>
                    Lire maintenant
                  </Link>
                  <Link className="pill-button" href={paymentSuccess.accountUrl}>
                    Ouvrir Ma page
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <p className="muted" style={{ marginTop: 16 }}>
                  Reglez ici avec PayPal. Une fois la transaction validee, l&apos;acces PDF sera ajoute automatiquement.
                </p>
                <div className="book-payment-shell">
                  <div ref={paypalContainerRef} />
                </div>
                {!paymentReady && !paymentError ? (
                  <p className="tiny" style={{ marginTop: 12 }}>
                    Chargement de PayPal...
                  </p>
                ) : null}
                {paymentError ? (
                  <p className="tiny" style={{ marginTop: 12 }}>
                    {paymentError}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
