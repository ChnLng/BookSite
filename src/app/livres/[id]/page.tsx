"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { GoogleAdsSlot } from "@/components/google-ads-slot";
import { PayPalSdkScript } from "@/components/shared/paypal-sdk-script";
import { SecurePaymentNote } from "@/components/shared/secure-payment-note";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { loadDisplayBooks, type DisplayBook } from "@/lib/books-service";
import { loadDisplayResources } from "@/lib/resources-service";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { randomPurchaseThankYouMessage } from "@/lib/purchase-thank-you";

type SectionLayoutItem = {
  source_key: string;
  display_position: string;
  show_on_user_page: boolean;
  sort_order: number;
};

type ReviewRecord = {
  id: string;
  authorName: string;
  rating: number;
  reviewText: string;
  createdAt: string | null;
  isOwn?: boolean;
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

type AccessState = {
  hasAccess: boolean;
  requiresLogin: boolean;
  isAdmin?: boolean;
};

type AppliedPromoState = {
  code: string;
  discountType: string;
  discountValue: number;
  discountPercent: number;
  discountedPrice: number;
  isFreeShare: boolean;
};

type RelatedProduct = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  priceEur: number;
  image: string;
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
  if (displayName?.trim() && !displayName.includes("@")) {
    return displayName.trim();
  }

  if (email?.trim()) {
    return email.split("@")[0];
  }

  return "";
}

function renderStarButton(active: boolean) {
  return active ? "🌟" : "✩";
}

function renderFixedStars(activeCount: number, className: string) {
  return Array.from({ length: 5 }, (_, index) => {
    const active = index < activeCount;

    return (
      <span
        key={`${className}-${index + 1}`}
        className={active ? `${className} active` : className}
        aria-hidden="true"
      >
        {active ? "🌟" : "✩"}
      </span>
    );
  });
}

export default function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user, session, profile } = useAuth();
  const [book, setBook] = useState<DisplayBook | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<RelatedProduct[]>([]);
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
  const [accessState, setAccessState] = useState<AccessState>({
    hasAccess: false,
    requiresLogin: true,
  });
  const [accessLoading, setAccessLoading] = useState(true);
  const [promoCode, setPromoCode] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoMessageKind, setPromoMessageKind] = useState<"idle" | "success" | "error">("idle");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoState | null>(null);
  const [shareUnlockPending, setShareUnlockPending] = useState(false);
  const [shareUnlockBusy, setShareUnlockBusy] = useState(false);
  const [optimisticSharedUnlock, setOptimisticSharedUnlock] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccessState | null>(null);
  const [purchaseThankYouMessage] = useState(() => randomPurchaseThankYouMessage());
  const [autoOpenedPayment, setAutoOpenedPayment] = useState(false);
  const [layoutItems, setLayoutItems] = useState<SectionLayoutItem[]>([]);
  const paypalContainerRef = useRef<HTMLDivElement | null>(null);

  const bookId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";
  const openBuyImmediately = searchParams.get("buy") === "1";

  const defaultAuthorName = useMemo(
    () => buildDefaultAuthorName(user?.email, profile?.displayName),
    [profile?.displayName, user?.email],
  );
  const roundedAverageRating = Math.round(reviewSummary.averageRating);
  const basePrice = book?.priceEur ?? 0;
  const finalPrice = appliedPromo?.discountedPrice ?? book?.priceEur ?? 0;
  const hasAppliedPromo = Boolean(appliedPromo);
  const promoUnlocksFreeAccess = hasAppliedPromo && finalPrice <= 0;
  const promoError = promoMessageKind === "error" ? promoMessage : "";
  const promoSuccess = promoMessageKind === "success" ? promoMessage : "";
  const zeroPriceUnlockMessage =
    "Ce contenu est gratuit ! Partagez notre site à l’aide des boutons situés en haut de la page pour déverrouiller le lien de téléchargement.";
  const effectiveHasAccess = accessState.hasAccess || optimisticSharedUnlock;
  const layoutByKey = useMemo(() => new Map(layoutItems.map((item) => [item.source_key, item])), [layoutItems]);
  const moduleStyle = (key: string, fallbackOrder: number) => {
    const item = layoutByKey.get(key);
    return { order: item?.sort_order ?? fallbackOrder, display: item && !item.show_on_user_page ? "none" : undefined };
  };

  useEffect(() => {
    const loadLayout = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { data: section } = await supabase.from("content_sections").select("id").eq("section_key", "albums").maybeSingle();
      if (!section?.id) return;
      const { data } = await supabase
        .from("content_section_items")
        .select("source_key, display_position, show_on_user_page, sort_order")
        .eq("section_id", section.id)
        .order("sort_order");
      setLayoutItems((data || []) as SectionLayoutItem[]);
    };
    void loadLayout();
  }, []);

  const authorizedFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!session?.access_token) {
      throw new Error("Connexion requise.");
    }

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);

    return fetch(input, {
      ...init,
      headers,
    });
  }, [session?.access_token]);

  const fetchReviewData = useCallback(async (targetBookId: string) => {
    try {
      const response = await fetch(`/api/books/${targetBookId}/reviews`, {
        cache: "no-store",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      const result = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            summary?: ReviewSummary;
            reviews?: ReviewRecord[];
          }
        | null;

      if (!response.ok || !result?.ok) {
        return {
          reviews: [] as ReviewRecord[],
          summary: {
            averageRating: 0,
            totalReviews: 0,
          },
        };
      }

      return {
        reviews: result.reviews || [],
        summary: result.summary || {
          averageRating: 0,
          totalReviews: 0,
        },
      };
    } catch {
      return {
        reviews: [] as ReviewRecord[],
        summary: {
          averageRating: 0,
          totalReviews: 0,
        },
      };
    }
  }, [session?.access_token]);

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
      setReviews([]);
      setReviewSummary({ averageRating: 0, totalReviews: 0 });
      setReviewsLoading(false);
      return;
    }

    let cancelled = false;

    const loadBookPage = async () => {
      setLoading(true);
      setReviewsLoading(true);

      const cataloguePromise = loadDisplayBooks();
      const resourcesPromise = loadDisplayResources();
      const reviewsPromise = fetchReviewData(bookId);
      const [catalogueBooks, catalogueResources] = await Promise.all([cataloguePromise, resourcesPromise]);
      const resolvedBook = catalogueBooks.find((candidate) => candidate.id === bookId || candidate.dbId === bookId) || null;

      if (cancelled) {
        return;
      }

      setBook(resolvedBook);
      setOptimisticSharedUnlock(false);
      setShareUnlockPending(false);

      if (!resolvedBook) {
        setRelatedBooks([]);
        setLoading(false);
        return;
      }

      const nextRelatedBooks: RelatedProduct[] = catalogueBooks.filter((candidate) => {
        if (candidate.id === resolvedBook.id) {
          return false;
        }

        return resolvedBook.relatedBookIds.some(
          (relatedId) => relatedId === candidate.id || relatedId === candidate.dbId,
        );
      }).map((candidate) => ({
        id: `book:${candidate.id}`,
        href: `/livres/${candidate.id}`,
        title: candidate.titleFr,
        subtitle: candidate.titleZh,
        priceEur: candidate.priceEur,
        image: candidate.coverImage,
      }));

      const relatedResources: RelatedProduct[] = catalogueResources
        .filter((resource) => resolvedBook.relatedBookIds.includes(`resource:${resource.slug || resource.id}`))
        .map((resource) => ({
          id: `resource:${resource.id}`,
          href: `/outils/${resource.slug || resource.id}`,
          title: resource.titleFr,
          subtitle: resource.summaryFr,
          priceEur: resource.priceEur,
          image: resource.coverImageUrl,
        }));

      setRelatedBooks([...nextRelatedBooks, ...relatedResources]);
      setLoading(false);

      const reviewData = await reviewsPromise;

      if (cancelled) {
        return;
      }

      setReviews(reviewData.reviews);
      setReviewSummary(reviewData.summary);
      const ownReview = reviewData.reviews.find((review) => review.isOwn);
      if (ownReview) {
        setReviewForm({ authorName: ownReview.authorName, rating: ownReview.rating, reviewText: ownReview.reviewText });
      }
      setReviewsLoading(false);
    };

    void loadBookPage();

    return () => {
      cancelled = true;
    };
  }, [bookId, fetchReviewData]);

  useEffect(() => {
    if (!book || !openBuyImmediately || autoOpenedPayment) {
      return;
    }

    if (finalPrice > 0) {
      setShowPayment(true);
    }
    setAutoOpenedPayment(true);
  }, [autoOpenedPayment, book, finalPrice, openBuyImmediately]);

  const refreshAccess = useCallback(async () => {
    if (!bookId || !session?.access_token) {
      setAccessState({
        hasAccess: false,
        requiresLogin: true,
      });
      setAccessLoading(false);
      return;
    }

    setAccessLoading(true);

    try {
      const response = await authorizedFetch(`/api/books/${bookId}/access`, {
        cache: "no-store",
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; hasAccess?: boolean; requiresLogin?: boolean; isAdmin?: boolean }
        | null;

      setAccessState({
        hasAccess: Boolean(result?.hasAccess),
        requiresLogin: Boolean(result?.requiresLogin),
        isAdmin: Boolean(result?.isAdmin),
      });
      if (result?.hasAccess) {
        setOptimisticSharedUnlock(false);
      }
    } catch {
      setAccessState({
        hasAccess: false,
        requiresLogin: true,
      });
    } finally {
      setAccessLoading(false);
    }
  }, [authorizedFetch, bookId, session?.access_token]);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  useEffect(() => {
    if (!showPayment) {
      setPaymentReady(false);
      setPaymentError("");

      if (paypalContainerRef.current) {
        paypalContainerRef.current.innerHTML = "";
      }

      return;
    }

    if (!book || !paypalContainerRef.current || typeof window === "undefined" || finalPrice <= 0) {
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
                value: finalPrice.toFixed(2),
              },
            },
          ],
          application_context: {
            landing_page: "BILLING",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
          },
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
            amountPaid: finalPrice,
            captureId: order?.purchase_units?.[0]?.payments?.captures?.[0]?.id,
            promoCode: appliedPromo?.code || "",
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
  }, [book, finalPrice, session?.access_token, showPayment]);

  useEffect(() => {
    if (!shareUnlockPending || finalPrice > 0) {
      return;
    }

    const handleShared = async () => {
      if (!book || !session?.access_token || shareUnlockBusy) {
        return;
      }

      setOptimisticSharedUnlock(true);
      setShareUnlockPending(false);
      setShareUnlockBusy(true);
      setPaymentError("");
      setPaymentSuccess({
        accountUrl: "/account",
        readUrl: `/read/${book.id}`,
      });

      try {
        const response = await authorizedFetch(`/api/books/${book.id}/claim`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            finalPrice,
            promoCode: appliedPromo?.code || "",
          }),
        });
        const result = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              message?: string;
              readUrl?: string;
            }
          | null;

        if (!response.ok || !result?.ok) {
          setPaymentError(result?.message || "Impossible de déverrouiller ce livre.");
          return;
        }

        setPaymentSuccess({
          accountUrl: "/account",
          readUrl: result.readUrl || `/read/${book.id}`,
        });
        await refreshAccess();
      } finally {
        setShareUnlockBusy(false);
      }
    };

    window.addEventListener("visdar:site-shared", handleShared);

    return () => {
      window.removeEventListener("visdar:site-shared", handleShared);
    };
  }, [authorizedFetch, book, finalPrice, refreshAccess, session?.access_token, shareUnlockBusy, shareUnlockPending]);

  const refreshReviews = useCallback(async () => {
    if (!bookId) {
      return;
    }

    const reviewData = await fetchReviewData(bookId);
    setReviews(reviewData.reviews);
    setReviewSummary(reviewData.summary);
  }, [bookId, fetchReviewData]);

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
      setReviewMessage("Merci ! Votre avis est bien en ligne.");
      await refreshReviews();
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!book) {
      return;
    }

    setPromoBusy(true);
    setPromoMessage("");
    setPromoMessageKind("idle");
    setShareUnlockPending(false);
    setOptimisticSharedUnlock(false);
    setPaymentError("");

    try {
      const response = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: promoCode,
          priceEur: book.priceEur,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            promo?: AppliedPromoState;
          }
        | null;

      if (!response.ok || !result?.ok || !result.promo) {
        setAppliedPromo(null);
        setPromoMessageKind("error");
        setPromoMessage(result?.message || "Code promo invalide, veuillez vérifier et réessayer.");
        return;
      }

      setAppliedPromo(result.promo);
      setPromoCode(result.promo.code);
      setPromoMessageKind("success");
      setPromoMessage(
        result.promo.isFreeShare
          ? `Code ${result.promo.code} appliqué. Le partage peut maintenant déverrouiller ce livre gratuitement.`
          : `Code ${result.promo.code} applique. Nouveau prix: ${result.promo.discountedPrice.toFixed(2)} EUR.`,
      );
    } finally {
      setPromoBusy(false);
    }
  };

  const handleBookDownload = async () => {
    if (!book || !session?.access_token) {
      setPaymentError("Connectez-vous pour télécharger le contenu.");
      return;
    }

    const response = await authorizedFetch(`/api/books/${book.id}/pdf`);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setPaymentError(payload?.message || "Impossible de télécharger le contenu.");
      return;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = book.pdfFile.split("/").pop() || `${book.id}_contenu`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  const handleBookCheckout = async () => {
    if (!book) {
      return;
    }

    setPaymentError("");

    if (!user || !session?.access_token) {
      setPaymentError("Connectez-vous d'abord pour obtenir ce livre.");
      return;
    }

    if (finalPrice <= 0) {
      setShareUnlockPending(true);
      setPaymentSuccess(null);
      setPaymentError(zeroPriceUnlockMessage);
      return;
    }

    setShowPayment(true);
  };

  return (
    <main className="page-shell">
      <PayPalSdkScript />
      <TopNav
        className="topbar-luxury"
        subtitle="Présentation du livre"
        title="Visd AR"
        showAdmin
        showLogout
      />

      <section className="book-detail-layout">
        <aside className="book-detail-sidebar">
          <div className="panel glass">
            <div className="section-heading">
              <span className="section-heading-icon" aria-hidden="true">
                <LayoutGrid size={17} />
              </span>
              <span className="section-heading-text">Produits associés</span>
            </div>
            <div className="book-detail-related-list">
              {loading ? (
                <p className="muted">Chargement des suggestions...</p>
              ) : relatedBooks.length > 0 ? (
                relatedBooks.map((relatedBook) => (
                  <Link className="book-detail-related-card" href={relatedBook.href} key={relatedBook.id}>
                    <div className="book-detail-related-cover">
                      <Image
                        src={relatedBook.image}
                        alt={relatedBook.title}
                        fill
                        sizes="140px"
                        className="book-cover-image"
                      />
                    </div>
                    <div className="book-detail-related-copy">
                      <strong>{relatedBook.title}</strong>
                      <span className="tiny">{relatedBook.subtitle}</span>
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
                <div className="book-detail-cover-shell" style={moduleStyle("cover_image", 10)}>
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

                <div className="book-review-card" style={moduleStyle("reviews", 20)}>
                  <div className="book-review-summary">
                    <div>
                      <strong>Avis des lecteurs</strong>
                      {reviewSummary.totalReviews > 0 ? (
                        <p className="tiny" style={{ marginTop: 6, marginBottom: 0 }}>
                          {reviewSummary.averageRating.toFixed(1)} / 5 · {reviewSummary.totalReviews} avis
                        </p>
                      ) : null}
                    </div>
                    <div className="book-review-average-stars" aria-label={`Note moyenne ${reviewSummary.averageRating.toFixed(1)} sur 5`}>
                      {renderFixedStars(roundedAverageRating, "book-review-average-star")}
                    </div>
                  </div>

                  <div className="input-group compact-form">
                    <label className="tiny" htmlFor="book-review-author">
                      Votre pseudo ou prenom
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
                              {renderStarButton(active)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <label className="tiny" htmlFor="book-review-text">
                      Votre ressenti après lecture
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
                            <span className="book-review-inline-stars">
                              {renderFixedStars(review.rating, "book-review-inline-star")}
                            </span>
                          </div>
                          <p className="muted" style={{ marginBottom: 10 }}>
                            {review.reviewText}
                          </p>
                          <span className="tiny">{formatReviewDate(review.createdAt)}</span>
                        </article>
                      ))
                    ) : (
                      <p className="muted">Aucun retour pour l&apos;instant. Votre lecture peut faire naître la première étoile.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="book-detail-copy">
                <div className="badge" style={moduleStyle("collection", 10)}>Collection : Album illustré apaisant en chinois facile</div>
                <div className="book-title-row" style={{ marginTop: 18, ...moduleStyle("title", 20) }}>
                  <h1 className="section-title book-main-title">{book.titleFr}</h1>
                  {book.amazonPaperbackUrl ? (
                    <span className="purchase-link-tooltip-wrap book-external-purchase">
                      <a
                        href={book.amazonPaperbackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pill-button"
                      >
                        {book.externalPurchaseLabel || "Amazon broché"}
                      </a>
                      <span className="purchase-link-tooltip" role="tooltip">
                        Acheter sur {(book.externalPurchaseLabel || "Amazon").replace(/\s+broché$/i, "")}
                      </span>
                    </span>
                  ) : null}
                </div>
                <p className="book-chinese-subtitle" lang="zh-Hans" style={moduleStyle("title", 20)}>{book.titleZh}</p>

                <div className="promo-panel book-detail-cta-panel" style={moduleStyle("commerce", 30)}>
                  <div className="book-detail-cta-stack">
                    <div className="book-commerce-toolbar">
                      {!effectiveHasAccess ? (
                        <div className="book-promo-row">
                          <div className="compact-promo-field">
                            <input
                              type="text"
                              className="input book-promo-input"
                              value={promoCode}
                              onChange={(event) => setPromoCode(event.target.value.trim().toUpperCase().slice(0, 8))}
                              placeholder="Code promo"
                              maxLength={8}
                              autoComplete="off"
                              spellCheck={false}
                              name="promo-code-input"
                            />
                            <span className="detail-promo-tooltip" role="tooltip">Code promotionnel facultatif.</span>
                          </div>
                          <button
                            type="button"
                            className="pill-button shrink-0 px-5"
                            disabled={promoBusy}
                            onClick={() => void handleApplyPromo()}
                          >
                            {promoBusy ? "..." : "Appliquer"}
                          </button>
                        </div>
                      ) : null}

                      <div className="book-buy-row">
                      {effectiveHasAccess ? (
                        <>
                          <Link className="cta-button book-buy-button" href={`/read/${book.id}`}>
                            Lire maintenant
                          </Link>
                          <button className="cta-button secondary book-buy-button" type="button" onClick={() => void handleBookDownload()}>
                            Télécharger le contenu
                          </button>
                        </>
                      ) : (
                        <button className="cta-button book-buy-button" type="button" onClick={() => void handleBookCheckout()}>
                          {promoUnlocksFreeAccess ? "Partager pour déverrouiller" : "Acheter le livre numérique"}
                        </button>
                      )}

                      </div>
                    </div>

                    {!effectiveHasAccess && promoError ? <p className="text-sm text-red-500">{promoError}</p> : null}
                  </div>

                  {promoSuccess ? <p className="tiny promo-message success">{promoSuccess}</p> : null}
                    {promoUnlocksFreeAccess && !effectiveHasAccess ? (
                    <div className="share-unlock-box">
                      <strong>Partagez pour déverrouiller</strong>
                      <p className="tiny">{zeroPriceUnlockMessage}</p>
                      {shareUnlockPending ? (
                        <p className="tiny">
                          Cliquez maintenant sur l&apos;un des boutons de partage en haut de la page. Le livre se déverrouillera aussitôt.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {accessLoading ? <p className="tiny">Vérification de vos droits...</p> : null}
                  {paymentError ? <p className="tiny promo-message error">{paymentError}</p> : null}
                </div>

                <div className="book-detail-facts" style={moduleStyle("commerce", 30)}>
                  <div className="split-line">
                    <span>Prix</span>
                    <div className="promo-price-stack">
                      {hasAppliedPromo ? <span className="promo-original-price">{basePrice.toFixed(2)} EUR</span> : null}
                      <strong>{(hasAppliedPromo ? finalPrice : basePrice).toFixed(2)} EUR</strong>
                    </div>
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

                <p className="muted" style={moduleStyle("synopsis", 40)}>{book.synopsisFr}</p>
                {book.synopsisZh ? <p className="muted" style={moduleStyle("synopsis", 40)}>{book.synopsisZh}</p> : null}

                {book.teachingPointFr ? (
                  <div className="book-detail-note" style={moduleStyle("teaching_point", 50)}>
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
              <div className="promo-price-stack">
                {appliedPromo ? <span className="promo-original-price">{book.priceEur.toFixed(2)} EUR</span> : null}
                <strong>{finalPrice.toFixed(2)} EUR</strong>
              </div>
            </div>

            {paymentSuccess ? (
              <div className="book-payment-success">
                <p className="muted">{purchaseThankYouMessage}</p>
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
                <SecurePaymentNote />
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
