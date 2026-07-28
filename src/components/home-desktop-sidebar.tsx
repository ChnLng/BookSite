"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, Mail, MessageCircleHeart, Sparkles, X } from "lucide-react";
import { GoogleAdsSlot } from "@/components/google-ads-slot";
import { PayPalSdkScript } from "@/components/shared/paypal-sdk-script";
import { SecurePaymentNote } from "@/components/shared/secure-payment-note";
import { useAuth } from "@/components/auth-provider";

type CommentItem = {
  id: string;
  name: string;
  content: string;
  icon: string;
  createdAt: string;
  likeCount: number;
  likedByViewer: boolean;
};

const sampleComments: CommentItem[] = [
  {
    id: "sample-1",
    name: "Claire",
    content: "J'adore la douceur du concept et l'idee d'un espace de lecture tres visuel.",
    icon: "✨",
    createdAt: "Aujourd'hui",
    likeCount: 3,
    likedByViewer: false,
  },
  {
    id: "sample-2",
    name: "Noa",
    content: "Les histoires donnent envie d'explorer le chinois sans pression, avec un vrai univers.",
    icon: "📖",
    createdAt: "Hier",
    likeCount: 5,
    likedByViewer: false,
  },
];

const donationThankYouMessages = [
  "Paiement réussi ! Merci beaucoup pour votre précieux soutien. ✨",
  "Merci pour votre don ! C'est un véritable encouragement. 🌸",
];

const donationPurposes = [
  "✨ Soutien libre et spontané",
  "🍵 Un thé pour la créatrice",
  "📖 Soutenir un livre",
];

export function HomeDesktopSidebar() {
  const emailLoginHintText = "Veuillez vous connecter pour envoyer un email à l'administrateur.";
  const siteCommentSuccessText = "Message bien enregistré ! Il est bien au chaud dans votre espace « Ma page ».";
  const commentLikeLoginHintText = "Connectez-vous pour ajouter un petit coeur à ce commentaire.";
  const [commentName, setCommentName] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentMessage, setCommentMessage] = useState("");
  const [commentDeliveryMode, setCommentDeliveryMode] = useState<"site" | "email">("site");
  const [comments, setComments] = useState<CommentItem[]>(sampleComments);
  const [visitorToken, setVisitorToken] = useState("");
  const [donationThankYou, setDonationThankYou] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState(5);
  const [donationPurpose, setDonationPurpose] = useState(donationPurposes[0]);
  const [donationPaymentError, setDonationPaymentError] = useState("");
  const donationAmountRef = useRef(donationAmount);
  const donationPurposeRef = useRef(donationPurpose);
  const paypalDonationContainerRef = useRef<HTMLDivElement | null>(null);
  const { user, session } = useAuth();
  const defaultCommentName = useMemo(() => user?.email?.split("@")[0] || "", [user?.email]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const existingToken = window.localStorage.getItem("visdar-visitor-token");

    if (existingToken) {
      setVisitorToken(existingToken);
      return;
    }

    const nextToken = window.crypto?.randomUUID?.() || `visitor-${Date.now()}`;
    window.localStorage.setItem("visdar-visitor-token", nextToken);
    setVisitorToken(nextToken);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const returnedFromDonation =
      url.searchParams.get("donation") === "success" ||
      url.searchParams.get("st")?.toLowerCase() === "completed";
    if (!returnedFromDonation) return;
    setDonationThankYou(donationThankYouMessages[Math.floor(Math.random() * donationThankYouMessages.length)]);
    ["donation", "st", "tx", "amt", "cc", "cm", "item_number"].forEach((key) => url.searchParams.delete(key));
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const loadComments = useCallback(async () => {
    if (!visitorToken) {
      return;
    }

    try {
      const response = await fetch("/api/messages", {
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          "x-visitor-token": visitorToken,
        },
      });

      const result = await response.json();

      if (!response.ok || !Array.isArray(result.comments)) {
        return;
      }

      setComments(result.comments as CommentItem[]);
    } catch {
      // keep existing sample comments if the API is unavailable
    }
  }, [session?.access_token, visitorToken]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    donationAmountRef.current = donationAmount;
  }, [donationAmount]);

  useEffect(() => {
    donationPurposeRef.current = donationPurpose;
  }, [donationPurpose]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const paypalWindow = window as Window & {
      paypal?: {
        Buttons?: (config: Record<string, unknown>) => {
          render: (container: HTMLElement) => Promise<void> | void;
          close?: () => Promise<void> | void;
        };
      };
    };

    const container = paypalDonationContainerRef.current;
    if (!container) return;

    let buttons: ReturnType<NonNullable<NonNullable<typeof paypalWindow.paypal>["Buttons"]>> | null = null;
    let stopped = false;

    const renderDonationButtons = () => {
      const buttonsFactory = paypalWindow.paypal?.Buttons;
      if (!buttonsFactory || container.querySelector("iframe")) return false;

      buttons = buttonsFactory({
        style: { layout: "vertical", shape: "rect", label: "paypal", height: 42 },
        createOrder: (_data: unknown, actions: any) => {
          const amount = Math.min(100000, Math.max(1, Number(donationAmountRef.current) || 0));
          if (amount <= 0) throw new Error("Montant invalide.");
          return actions.order.create({
            purchase_units: [
              {
                custom_id: "donation-visdar",
                description: donationPurposeRef.current,
                amount: { currency_code: "EUR", value: amount.toFixed(2) },
              },
            ],
          });
        },
        onApprove: async (data: any, actions: any) => {
          setDonationPaymentError("");
          const order = await actions.order.capture();
          const response = await fetch("/api/paypal/donation/complete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({
              orderId: order?.id || data?.orderID,
              captureId: order?.purchase_units?.[0]?.payments?.captures?.[0]?.id,
              note: donationPurposeRef.current,
            }),
          });
          const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
          if (!response.ok || !result?.ok) {
            throw new Error(result?.message || "Le don a été payé, mais son enregistrement a échoué.");
          }
          setDonationThankYou(donationThankYouMessages[Math.floor(Math.random() * donationThankYouMessages.length)]);
        },
        onCancel: () => setDonationPaymentError("Paiement annulé. Vous pouvez reprendre quand vous voulez."),
        onError: () => setDonationPaymentError("PayPal est momentanément indisponible. Veuillez réessayer."),
      });

      Promise.resolve(buttons.render(container)).catch(() => {
        if (!stopped) setDonationPaymentError("PayPal est momentanément indisponible. Veuillez réessayer.");
      });
      return true;
    };

    if (renderDonationButtons()) return () => { stopped = true; void buttons?.close?.(); };
    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      if (renderDonationButtons() || attempts >= 30) {
        window.clearInterval(intervalId);
        if (attempts >= 30 && !container.querySelector("iframe")) {
          setDonationPaymentError("Le module PayPal ne s'est pas chargé. Veuillez actualiser la page.");
        }
      }
    }, 200);
    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      void buttons?.close?.();
    };
  }, [session?.access_token]);

  useEffect(() => {
    if (defaultCommentName && !commentName) {
      setCommentName(defaultCommentName);
    }
  }, [commentName, defaultCommentName]);

  const submitComment = async (mode: "site" | "email") => {
    setCommentDeliveryMode(mode);

    if (mode === "email" && (!user || !session?.access_token)) {
      setCommentMessage(emailLoginHintText);
      return;
    }

    if (mode === "email") {
      if (!commentContent.trim()) {
        setCommentMessage("Votre message est vide.");
        return;
      }

      setIsSubmittingComment(true);
      setCommentMessage("");

      try {
        const response = await fetch("/api/admin-messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
            ...(visitorToken ? { "x-visitor-token": visitorToken } : {}),
          },
          body: JSON.stringify({
            pseudo: commentName.trim() || defaultCommentName || "Lecteur",
            email: user?.email || "",
            content: commentContent.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error("Erreur lors de l'envoi");
        }

        setCommentMessage("Message envoye a l'administrateur avec succes !");
        setCommentContent("");
      } catch {
        setCommentMessage("Erreur d'envoi. Veuillez reessayer.");
      } finally {
        setIsSubmittingComment(false);
      }

      return;
    }

    if (!commentName.trim() || !commentContent.trim()) {
      setCommentMessage("Nom et commentaire sont requis.");
      return;
    }

    setIsSubmittingComment(true);
    setCommentMessage("");

    try {
      const formData = new FormData();
      formData.append("name", commentName);
      formData.append("content", commentContent);
      formData.append("mode", mode);

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          ...(visitorToken ? { "x-visitor-token": visitorToken } : {}),
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setCommentMessage(result.message || "Erreur lors de l'envoi.");
        return;
      }

      if (mode === "site") {
        setCommentContent("");
        if (result.comment) {
          setComments((current) => [...current, result.comment as CommentItem].slice(-2));
        }
        setCommentMessage(siteCommentSuccessText);
      } else {
        setCommentContent("");
        setCommentMessage(result.message || "Message envoye a l'administrateur.");
      }
    } catch {
      setCommentMessage("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!user || !session?.access_token) {
      setCommentMessage(commentLikeLoginHintText);
      return;
    }

    const previousComment = comments.find((comment) => comment.id === commentId);

    if (!previousComment) {
      return;
    }

    const nextLikedState = !previousComment.likedByViewer;
    const nextLikeCount = Math.max(0, previousComment.likeCount + (nextLikedState ? 1 : -1));

    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              likeCount: nextLikeCount,
              likedByViewer: nextLikedState,
            }
          : comment,
      ),
    );

    try {
      const response = await fetch(`/api/messages/${commentId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...(visitorToken ? { "x-visitor-token": visitorToken } : {}),
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setComments((current) =>
          current.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  likeCount: previousComment.likeCount,
                  likedByViewer: previousComment.likedByViewer,
                }
              : comment,
          ),
        );
        return;
      }

      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                likeCount: typeof result?.likeCount === "number" ? result.likeCount : comment.likeCount,
                likedByViewer: typeof result?.liked === "boolean" ? result.liked : comment.likedByViewer,
              }
            : comment,
        ),
      );
      await loadComments();
    } catch {
      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                likeCount: previousComment.likeCount,
                likedByViewer: previousComment.likedByViewer,
              }
            : comment,
        ),
      );
    }
  };

  return (
    <>
      <PayPalSdkScript />
      <aside className="left-column-stack">
        <aside className="panel glass donation-column donation-column-compact" id="donation">
          <div className="section-heading">
            <span className="section-heading-icon" aria-hidden="true">
              <Sparkles size={17} />
            </span>
            <h2 className="section-heading-text">Donation</h2>
          </div>
          <div className="paypal-donation-shell">
            <div className="paypal-donation-card">
              <label className="donation-field-label" htmlFor="donation-amount">Montant de votre choix</label>
              <div className="donation-amount-field">
                <span>€</span>
                <input
                  id="donation-amount"
                  inputMode="decimal"
                  min="1"
                  max="100000"
                  step="0.01"
                  type="number"
                  value={donationAmount}
                  onChange={(event) => setDonationAmount(Number(event.target.value))}
                />
                <span>EUR</span>
              </div>
              <label className="donation-field-label" htmlFor="donation-purpose">Propos de votre donation</label>
              <select
                className="donation-purpose-select"
                id="donation-purpose"
                value={donationPurpose}
                onChange={(event) => setDonationPurpose(event.target.value)}
              >
                {donationPurposes.map((purpose) => <option key={purpose}>{purpose}</option>)}
              </select>
              <div className="donation-paypal-buttons" ref={paypalDonationContainerRef} />
              {donationPaymentError ? <p className="donation-payment-error">{donationPaymentError}</p> : null}
            </div>
            <SecurePaymentNote compact />
          </div>
        </aside>

        <GoogleAdsSlot
          client="ca-pub-6796254088003500"
          className="panel glass ad-slot-panel"
          label="Ads"
          slot="8355506858"
        />

        <aside className="panel glass comment-column" id="commentaires">
          <div className="section-heading">
            <span className="section-heading-icon" aria-hidden="true">
              <MessageCircleHeart size={17} />
            </span>
            <h2 className="section-heading-text">Commentaire</h2>
          </div>
          <div className="comment-list">
            {comments.map((item) => (
              <article className="comment-card" key={item.id}>
                <div className="comment-card-header">
                  <strong>{item.name}</strong>
                </div>
                <p className="muted comment-content">{item.content}</p>
                <div className="comment-card-footer">
                  <div className="comment-feedback-row">
                    <span className="comment-warm-word">{item.icon}</span>
                    <button
                      className={item.likedByViewer ? "comment-like-button liked" : "comment-like-button"}
                      type="button"
                      disabled={item.id.startsWith("sample-")}
                      onClick={() => void toggleCommentLike(item.id)}
                    >
                      <Heart size={14} />
                      <span>{item.likeCount}</span>
                    </button>
                  </div>
                  <span className="comment-time">{item.createdAt}</span>
                </div>
              </article>
            ))}
          </div>
          <div className="input-group compact-form">
            <input
              className="input compact-input"
              name="name"
              placeholder="Votre nom ou pseudo"
              value={commentName}
              onChange={(event) => setCommentName(event.target.value)}
            />
            <textarea
              className="textarea comment-textarea compact-textarea"
              name="content"
              placeholder="Votre commentaire"
              value={commentContent}
              onChange={(event) => setCommentContent(event.target.value)}
            />
            <div className="comment-delivery-switch">
              <button
                className={commentDeliveryMode === "email" ? "cta-button compact-submit active-submit-mode" : "cta-button compact-submit secondary-submit-mode"}
                type="button"
                disabled={isSubmittingComment}
                onClick={() => void submitComment("email")}
                title={user ? "Envoyer par email a l'administrateur" : "Connexion requise"}
              >
                {isSubmittingComment && commentDeliveryMode === "email" ? "Envoi..." : "Envoyer par email"}
              </button>
              <button
                className={commentDeliveryMode === "site" ? "cta-button compact-submit active-submit-mode" : "cta-button compact-submit secondary-submit-mode"}
                type="button"
                disabled={isSubmittingComment}
                onClick={() => void submitComment("site")}
              >
                {isSubmittingComment && commentDeliveryMode === "site" ? "Publication..." : "Publier le commentaire"}
              </button>
            </div>
            {commentMessage === emailLoginHintText ? (
              <p className="tiny comment-message comment-login-hint">
                <Mail size={16} />
                <span>{emailLoginHintText}</span>
              </p>
            ) : commentMessage === siteCommentSuccessText ? (
              <p className="tiny comment-message">{siteCommentSuccessText}</p>
            ) : commentMessage ? (
              <p className="tiny comment-message">{commentMessage}</p>
            ) : null}
          </div>
        </aside>
      </aside>
      {donationThankYou ? (
        <div className="overlay-backdrop" role="presentation" onClick={() => setDonationThankYou(null)}>
          <div className="overlay-card overlay-card-small glass donation-thank-you-modal" role="dialog" aria-modal="true" aria-labelledby="donation-thank-you-title" onClick={(event) => event.stopPropagation()}>
            <button className="overlay-close" type="button" aria-label="Fermer" onClick={() => setDonationThankYou(null)}><X size={18} /></button>
            <div className="badge">Merci 💝</div>
            <h3 id="donation-thank-you-title" style={{ margin: "16px 0 10px" }}>Merci pour votre soutien</h3>
            <p className="muted" style={{ marginBottom: 0 }}>{donationThankYou}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
