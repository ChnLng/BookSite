"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { SecurePaymentNote } from "@/components/shared/secure-payment-note";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { loadDisplayResources, type DisplayResource } from "@/lib/resources-service";
import { randomPurchaseThankYouMessage } from "@/lib/purchase-thank-you";

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

type PaymentSuccessState = {
  accountUrl: string;
  resourceUrl: string;
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

export default function ResourceDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user, session } = useAuth();
  const [resource, setResource] = useState<DisplayResource | null>(null);
  const [relatedResources, setRelatedResources] = useState<DisplayResource[]>([]);
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
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoMessageKind, setPromoMessageKind] = useState<"idle" | "success" | "error">("idle");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoState | null>(null);
  const [shareUnlockPending, setShareUnlockPending] = useState(false);
  const [shareUnlockBusy, setShareUnlockBusy] = useState(false);
  const [optimisticSharedUnlock, setOptimisticSharedUnlock] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccessState | null>(null);
  const [purchaseThankYouMessage] = useState(() => randomPurchaseThankYouMessage());
  const [autoStartedCheckout, setAutoStartedCheckout] = useState(false);

  const resourceId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";
  const openBuyImmediately = searchParams.get("buy") === "1";
  const purchaseSucceeded = searchParams.get("success") === "1";
  const purchaseCanceled = searchParams.get("cancel") === "1";
  const paypalOrderId = searchParams.get("token") || "";
  const stripeSessionId = searchParams.get("stripe_session_id") || "";
  const paymentProvider = searchParams.get("provider") || "";
  const returnPromoCode = searchParams.get("promo") || "";
  const processedOrderRef = useRef<string | null>(null);
  const processedStripeSessionRef = useRef<string | null>(null);
  const basePrice = resource?.priceEur ?? 0;
  const finalPrice = appliedPromo?.discountedPrice ?? resource?.priceEur ?? 0;
  const hasAppliedPromo = Boolean(appliedPromo);
  const promoUnlocksFreeAccess = hasAppliedPromo && finalPrice <= 0;
  const promoError = promoMessageKind === "error" ? promoMessage : "";
  const promoSuccess = promoMessageKind === "success" ? promoMessage : "";
  const roundedAverageRating = Math.round(reviewSummary.averageRating);
  const defaultAuthorName = useMemo(
    () => buildDefaultAuthorName(user?.email, user?.user_metadata?.full_name),
    [user?.email, user?.user_metadata?.full_name],
  );
  const zeroPriceUnlockMessage =
    "Ce contenu est gratuit ! Partagez notre site à l’aide des boutons situés en haut de la page pour déverrouiller le lien de téléchargement.";
  const effectiveHasAccess = accessState.hasAccess || optimisticSharedUnlock;

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

  const fetchReviewData = useCallback(async (targetResourceId: string) => {
    try {
      const response = await fetch(`/api/resources/${targetResourceId}/reviews`, {
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
  }, []);

  useEffect(() => {
    if (!resourceId) {
      setLoading(false);
      setResource(null);
      setRelatedResources([]);
      setReviews([]);
      setReviewSummary({ averageRating: 0, totalReviews: 0 });
      setReviewsLoading(false);
      return;
    }

    let cancelled = false;

    const loadPage = async () => {
      setLoading(true);
      setReviewsLoading(true);

      const resourcesPromise = loadDisplayResources();
      const reviewsPromise = fetchReviewData(resourceId);
      const allResources = await resourcesPromise;
      const resolvedResource = allResources.find((item) => item.id === resourceId || item.slug === resourceId) || null;

      if (cancelled) {
        return;
      }

      setResource(resolvedResource);
      setOptimisticSharedUnlock(false);
      setShareUnlockPending(false);
      setRelatedResources(
        allResources.filter((item) => item.id !== resolvedResource?.id).slice(0, 3),
      );
      setLoading(false);

      const reviewData = await reviewsPromise;

      if (cancelled) {
        return;
      }

      setReviews(reviewData.reviews);
      setReviewSummary(reviewData.summary);
      setReviewsLoading(false);
    };

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [fetchReviewData, resourceId]);

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

  const refreshAccess = useCallback(async () => {
    if (!resourceId || !session?.access_token) {
      setAccessState({
        hasAccess: false,
        requiresLogin: true,
      });
      setAccessLoading(false);
      return;
    }

    setAccessLoading(true);

    try {
      const response = await authorizedFetch(`/api/resources/${resourceId}/access`, {
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
  }, [authorizedFetch, resourceId, session?.access_token]);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  useEffect(() => {
    if (!purchaseCanceled) {
      return;
    }

    setShowPayment(paymentProvider !== "stripe");
    setPaymentSuccess(null);
    setPaymentError("Paiement annulé. Vous pouvez reprendre quand vous le souhaitez.");
  }, [paymentProvider, purchaseCanceled]);

  useEffect(() => {
    if (!purchaseSucceeded || !paypalOrderId || !resource) {
      return;
    }

    if (processedOrderRef.current === paypalOrderId) {
      return;
    }

    processedOrderRef.current = paypalOrderId;
    setShowPayment(true);
    setPaymentSuccess(null);
    setPaymentError("");

    const finalizePurchase = async () => {
      const response = await fetch("/api/paypal/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          resourceId: resource.slug || resource.id,
          orderId: paypalOrderId,
          promoCode: returnPromoCode,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            accountUrl?: string;
            resourceUrl?: string;
          }
        | null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "Paiement validé, mais enregistrement impossible.");
      }

      setPaymentSuccess({
        accountUrl: result.accountUrl || "/account",
        resourceUrl: result.resourceUrl || `/outils/${resource.slug || resource.id}`,
      });
      setActionMessage("Paiement confirmé. Vos téléchargements sont maintenant débloqués.");
      await refreshAccess();
    };

    finalizePurchase().catch((error) => {
      setPaymentError(error instanceof Error ? error.message : "Impossible d'ouvrir PayPal pour le moment.");
    });
  }, [paypalOrderId, purchaseSucceeded, refreshAccess, resource, returnPromoCode, session?.access_token]);

  const startPayPalCheckout = useCallback(
    async () => {
      if (!resource) {
        return;
      }

      setPaymentError("");

      try {
        const response = await fetch("/api/paypal/purchase/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            kind: "resource",
            itemId: resource.slug || resource.id,
            promoCode: appliedPromo?.code || "",
          }),
        });

        const result = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              message?: string;
              approvalUrl?: string;
            }
          | null;

        if (!response.ok || !result?.ok || !result.approvalUrl) {
          throw new Error(result?.message || "Impossible d'ouvrir PayPal pour le moment.");
        }

        const url = new URL(result.approvalUrl);
        url.searchParams.delete("fundingSource");
        url.searchParams.set("locale.x", "fr_FR");
        url.searchParams.set("country.x", "FR");
        window.location.href = url.toString();
      } catch (error) {
        setPaymentError(error instanceof Error ? error.message : "Impossible d'ouvrir PayPal pour le moment.");
      }
    },
    [appliedPromo?.code, resource],
  );

  const startStripeCheckout = useCallback(async () => {
    if (!resource || !session?.access_token || actionBusy) return;

    setActionBusy(true);
    setPaymentError("");
    setActionMessage("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          kind: "resource",
          id: resource.slug || resource.id,
          promoCode: appliedPromo?.code || "",
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; url?: string; message?: string }
        | null;

      if (!response.ok || !result?.ok || !result.url) {
        throw new Error(result?.message || "Impossible d'ouvrir le paiement par carte.");
      }

      window.location.assign(result.url);
    } catch (error) {
      setActionBusy(false);
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Impossible d'ouvrir le paiement par carte.",
      );
    }
  }, [actionBusy, appliedPromo?.code, resource, session?.access_token]);

  useEffect(() => {
    if (!resource || !openBuyImmediately || autoStartedCheckout || !session?.access_token) return;
    setAutoStartedCheckout(true);
    if (finalPrice > 0) void startStripeCheckout();
  }, [autoStartedCheckout, finalPrice, openBuyImmediately, resource, session?.access_token, startStripeCheckout]);

  useEffect(() => {
    if (!purchaseSucceeded || !stripeSessionId || !resource || !session?.access_token) return;
    if (processedStripeSessionRef.current === stripeSessionId) return;

    processedStripeSessionRef.current = stripeSessionId;
    setActionBusy(true);
    setPaymentError("");

    const finalizeStripePurchase = async () => {
      const response = await fetch("/api/stripe/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sessionId: stripeSessionId }),
      });
      const result = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            accountUrl?: string;
            resourceUrl?: string;
          }
        | null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "Paiement reçu, mais accès encore indisponible.");
      }

      setPaymentSuccess({
        accountUrl: result.accountUrl || "/account",
        resourceUrl: result.resourceUrl || `/outils/${resource.slug || resource.id}`,
      });
      setShowPayment(true);
      setActionMessage("Paiement confirmé. Vos téléchargements sont maintenant débloqués.");
      await refreshAccess();
    };

    finalizeStripePurchase()
      .catch((error) => {
        setPaymentError(error instanceof Error ? error.message : "Confirmation Stripe impossible.");
      })
      .finally(() => setActionBusy(false));
  }, [purchaseSucceeded, refreshAccess, resource, session?.access_token, stripeSessionId]);

  const priceLabel = useMemo(
    () => `${(hasAppliedPromo ? finalPrice : basePrice).toFixed(2)} EUR`,
    [basePrice, finalPrice, hasAppliedPromo],
  );

  useEffect(() => {
    if (!shareUnlockPending || finalPrice > 0) {
      return;
    }

    const handleShared = async () => {
      if (!resource || !session?.access_token || shareUnlockBusy) {
        return;
      }

      setOptimisticSharedUnlock(true);
      setShareUnlockPending(false);
      setShareUnlockBusy(true);
      setActionMessage("La ressource est maintenant débloquée.");

      try {
        const response = await authorizedFetch(`/api/resources/${resource.slug || resource.id}/claim`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            finalPrice,
            promoCode: appliedPromo?.code || "",
          }),
        });
        const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

        if (!response.ok || !result?.ok) {
          setActionMessage(result?.message || "Impossible de déverrouiller cette ressource.");
          return;
        }

        setActionMessage(result.message || "La ressource est maintenant débloquée.");
        await refreshAccess();
      } finally {
        setShareUnlockBusy(false);
      }
    };

    window.addEventListener("visdar:site-shared", handleShared);

    return () => {
      window.removeEventListener("visdar:site-shared", handleShared);
    };
  }, [authorizedFetch, finalPrice, refreshAccess, resource, session?.access_token, shareUnlockBusy, shareUnlockPending]);

  const handleApplyPromo = async () => {
    if (!resource) {
      return;
    }

    setPromoBusy(true);
    setPromoMessage("");
    setPromoMessageKind("idle");
    setShareUnlockPending(false);
    setOptimisticSharedUnlock(false);
    setActionMessage("");

    try {
      const response = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: promoCode,
          priceEur: resource.priceEur,
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
          ? `Code ${result.promo.code} appliqué. Le partage peut maintenant déverrouiller cette ressource gratuitement.`
          : `Code ${result.promo.code} applique. Nouveau prix: ${result.promo.discountedPrice.toFixed(2)} EUR.`,
      );
    } finally {
      setPromoBusy(false);
    }
  };

  const refreshReviews = useCallback(async () => {
    if (!resourceId) {
      return;
    }

    const reviewData = await fetchReviewData(resourceId);
    setReviews(reviewData.reviews);
    setReviewSummary(reviewData.summary);
  }, [fetchReviewData, resourceId]);

  const handleReviewSubmit = async () => {
    if (!resource) {
      return;
    }

    setReviewSubmitting(true);
    setReviewMessage("");

    try {
      const response = await fetch(`/api/resources/${resource.slug || resource.id}/reviews`, {
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

  const handleCheckout = async () => {
    if (!resource) {
      return;
    }

    if (!user || !session?.access_token) {
      setActionMessage("Connectez-vous d'abord pour débloquer cette ressource.");
      return;
    }

    setActionMessage("");
    setPaymentError("");

    if (finalPrice <= 0) {
      setShareUnlockPending(true);
      setActionMessage(zeroPriceUnlockMessage);
      return;
    }

    await startStripeCheckout();
  };

  const handleDownload = async (fileId: string) => {
    if (!resource || !session?.access_token) {
      setActionMessage("Connectez-vous pour télécharger.");
      return;
    }

    setActionBusy(true);
    setActionMessage("");

    try {
      const response = await authorizedFetch(`/api/resources/${resource.slug || resource.id}/download?file=${encodeURIComponent(fileId)}`);
      const contentType = response.headers.get("content-type") || "";

      if (response.ok && !contentType.includes("application/json")) {
        const blobUrl = URL.createObjectURL(await response.blob());
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = resource.downloads.find((entry) => entry.id === fileId)?.labelFr || "téléchargement";
        anchor.click();
        URL.revokeObjectURL(blobUrl);
        return;
      }

      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; url?: string } | null;

      if (!response.ok || !result?.ok || !result.url) {
        setActionMessage(result?.message || "Impossible de préparer le téléchargement.");
        return;
      }

      window.open(result.url, "_blank", "noopener,noreferrer");
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="page-shell">
        <TopNav title="Visd AR" subtitle="Hub bilingue 🇨🇳 Chinois - Français 🇫🇷" />
        <section className="panel glass" style={{ marginTop: 22 }}>
          <p className="muted">Chargement de la fiche ressource...</p>
        </section>
      </main>
    );
  }

  if (!resource) {
    return (
      <main className="page-shell">
        <TopNav title="Visd AR" subtitle="Hub bilingue 🇨🇳 Chinois - Français 🇫🇷" />
        <section className="panel glass" style={{ marginTop: 22 }}>
          <h1 className="section-title">Ressource introuvable</h1>
          <p className="section-caption">Cette fiche n'est plus disponible.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <TopNav title="Visd AR" subtitle="Hub bilingue 🇨🇳 Chinois - Français 🇫🇷" />

      <section className="book-detail-layout resource-detail-layout" style={{ marginTop: 22 }}>
        <aside className="resource-detail-sidebar">
          <article className="panel glass resource-cover-panel">
            <div className="resource-detail-cover">
              <Image
                src={resource.coverImageUrl}
                alt={resource.titleFr}
                fill
                sizes="(max-width: 767px) 100vw, 380px"
                className="resource-detail-cover-image"
              />
            </div>
          </article>

          <div className="book-review-card">
            <div className="book-review-summary">
              <div>
                <strong>Avis des utilisateurs</strong>
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
              <label className="tiny" htmlFor="resource-review-author">
                Votre pseudo ou prenom
              </label>
              <input
                id="resource-review-author"
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

              <label className="tiny" htmlFor="resource-review-text">
                Votre ressenti après utilisation
              </label>
              <textarea
                id="resource-review-text"
                className="textarea compact-textarea"
                value={reviewForm.reviewText}
                onChange={(event) =>
                  setReviewForm((current) => ({
                    ...current,
                    reviewText: event.target.value,
                  }))
                }
                placeholder="Partagez votre experience en quelques lignes..."
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
                <p className="muted">Aucun retour pour l&apos;instant. Votre expérience peut faire naître la première étoile.</p>
              )}
            </div>
          </div>
        </aside>

        <section className="panel glass resource-detail-main">
          <span className="badge">Coin ludique & Outils</span>
          <h1 className="book-detail-title" style={{ marginTop: 18 }}>{resource.titleFr}</h1>
          <div className="resource-action-stack">
            <div className="resource-inline-price">
              <div className="promo-price-tag-wrap">
                {hasAppliedPromo ? <span className="promo-original-price">{basePrice.toFixed(2)} EUR</span> : null}
                <span className="resource-price-tag">{priceLabel}</span>
              </div>
              <span className="tiny">
                {promoUnlocksFreeAccess ? "Accès gratuit après partage" : "Paiement sécurisé puis téléchargement"}
              </span>
            </div>

            <div className="resource-inline-promo">
              <div className="resource-commerce-toolbar">
                {!effectiveHasAccess ? (
                  <div className="resource-promo-row">
                    <div className="compact-promo-field">
                      <input
                        type="text"
                        className="input resource-promo-input"
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

                <div className="resource-buy-row">
                  <button
                    type="button"
                    className="cta-button resource-buy-button"
                    disabled={actionBusy || effectiveHasAccess}
                    onClick={() => void handleCheckout()}
                  >
                    {effectiveHasAccess
                      ? "Accès déjà débloqué"
                      : actionBusy
                        ? "Ouverture..."
                        : promoUnlocksFreeAccess
                          ? "Partager pour déverrouiller"
                          : "Acheter cet outil"}
                  </button>

                  {!effectiveHasAccess && !promoUnlocksFreeAccess ? (
                    <button
                      className="payment-fallback-link"
                      type="button"
                      disabled={actionBusy}
                      onClick={() => void startPayPalCheckout()}
                    >
                      ou payer avec PayPal
                    </button>
                  ) : null}

                  {resource.externalUrl ? (
                    <a
                      href={resource.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill-button shrink-0 flex items-center gap-2"
                    >
                      <ExternalLink size={14} />
                      <span>Lien externe</span>
                    </a>
                  ) : null}
                </div>
              </div>

              {!effectiveHasAccess && promoError ? <p className="text-sm text-red-500">{promoError}</p> : null}
            </div>
          </div>

          <p className="section-caption" style={{ marginTop: 18 }}>{resource.summaryFr}</p>

          {promoSuccess ? <p className="tiny promo-message success">{promoSuccess}</p> : null}

          {actionMessage ? <p className="tiny">{actionMessage}</p> : null}
          {accessLoading ? <p className="tiny">Verification de vos droits...</p> : null}
          {paymentError ? <p className="tiny promo-message error">{paymentError}</p> : null}

          {promoUnlocksFreeAccess && !effectiveHasAccess ? (
            <div className="share-unlock-box">
              <strong>Partagez pour déverrouiller</strong>
              <p className="tiny">{zeroPriceUnlockMessage}</p>
              {shareUnlockPending ? (
                <p className="tiny">
                  Cliquez maintenant sur l&apos;un des boutons de partage en haut de la page. Les téléchargements se déverrouilleront aussitôt.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="resource-download-panel">
            <div className="split-line">
              <strong>Téléchargements disponibles</strong>
              <span>{resource.downloads.length}</span>
            </div>

            <div className="coin-ludique-downloads" style={{ marginTop: 14 }}>
              {resource.downloads.map((download) => (
                <button
                  key={download.id}
                  className={effectiveHasAccess ? "coin-ludique-download-button" : "coin-ludique-download-button disabled"}
                  type="button"
                  disabled={!effectiveHasAccess || actionBusy}
                  onClick={() => void handleDownload(download.id)}
                >
                  <span className="coin-ludique-platform">{download.platform}</span>
                  <span>{download.labelFr}</span>
                  <Download size={15} />
                </button>
              ))}
            </div>

            {!effectiveHasAccess ? (
              <p className="tiny" style={{ marginTop: 12 }}>
                Connectez-vous puis validez le paiement pour débloquer ces fichiers.
              </p>
            ) : null}
          </div>

          {relatedResources.length > 0 ? (
            <div className="resource-related-strip">
              <div className="split-line">
                <strong>Autres outils a decouvrir</strong>
                <span>{relatedResources.length}</span>
              </div>
              <div className="resource-related-grid">
                {relatedResources.map((item) => (
                  <Link className="resource-related-card" key={item.id} href={`/outils/${item.slug || item.id}`}>
                    <div className="resource-related-image">
                      <Image
                        src={item.coverImageUrl}
                        alt={item.titleFr}
                        fill
                        sizes="180px"
                        className="carousel-cover-image"
                      />
                    </div>
                    <strong>{item.titleFr}</strong>
                    <span>{item.priceEur.toFixed(2)} EUR</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </section>

      {showPayment && resource ? (
        <div className="overlay-backdrop" role="presentation" onClick={() => setShowPayment(false)}>
          <div
            className="overlay-card glass book-payment-card"
            role="dialog"
            aria-modal="true"
            aria-label={`Confirmation du paiement pour ${resource.titleFr}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="overlay-close" type="button" onClick={() => setShowPayment(false)}>
              Fermer
            </button>
            <div className="badge">{paymentSuccess ? "Paiement confirmé" : "PayPal"}</div>
            <h2 style={{ marginTop: 14, marginBottom: 10 }}>{resource.titleFr}</h2>
            <div className="split-line" style={{ paddingTop: 0 }}>
              <span>Montant</span>
              <div className="promo-price-stack">
                {appliedPromo ? <span className="promo-original-price">{resource.priceEur.toFixed(2)} EUR</span> : null}
                <strong>{finalPrice.toFixed(2)} EUR</strong>
              </div>
            </div>

            {paymentSuccess ? (
              <div className="book-payment-success">
                <p className="muted">{purchaseThankYouMessage}</p>
                <div className="actions-row">
                  <Link className="cta-button" href={paymentSuccess.resourceUrl}>
                    Revenir a cette fiche
                  </Link>
                  <Link className="pill-button" href={paymentSuccess.accountUrl}>
                    Ouvrir Ma page
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <p className="muted" style={{ marginTop: 16 }}>
                  Réglez ici avec PayPal. Une fois la transaction validée, les téléchargements seront débloqués automatiquement.
                </p>
                <div className="book-payment-shell">
                  <div className="actions-row">
                    <button className="cta-button" type="button" onClick={() => void startPayPalCheckout()}>
                      Payer avec PayPal
                    </button>
                  </div>
                </div>
                <SecurePaymentNote />
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
