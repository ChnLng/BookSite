"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, Mail, MessageCircleHeart, Sparkles, X } from "lucide-react";
import { GoogleAdsSlot } from "@/components/google-ads-slot";
import { PayPalSdkScript } from "@/components/shared/paypal-sdk-script";
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

const donationThanks = [
  "Merci du fond du cœur ! Votre soutien ajoute une petite étoile à l'univers Visd AR. ✨",
  "Un immense merci ! Grâce à vous, de nouvelles histoires douces pourront prendre vie. 🌷",
  "Votre générosité nous touche beaucoup. Merci d'accompagner cette aventure bilingue ! 🐾",
  "Merci, merveilleux mécène ! Vous venez d'offrir un peu de magie aux prochains lecteurs. 💜",
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
  const [donationAmount, setDonationAmount] = useState("5");
  const [donationNote, setDonationNote] = useState("Soutien libre et chaleureux");
  const [donationMessage, setDonationMessage] = useState("");
  const [donationThanksText, setDonationThanksText] = useState<string | null>(null);
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
    if (typeof window === "undefined") {
      return;
    }

    const paypalWindow = window as Window & {
      paypal?: {
        Buttons?: (config: Record<string, unknown>) => { render: (selector: string) => Promise<void>; close?: () => Promise<void> };
      };
    };

    const container = document.getElementById("paypal-donation-buttons");
    if (!container) return;
    let buttons: { render: (selector: string) => Promise<void>; close?: () => Promise<void> } | null = null;
    let cancelled = false;
    const renderButtons = () => {
      if (!paypalWindow.paypal?.Buttons || cancelled || container.childElementCount > 0) return false;
      const amount = Math.max(1, Number(donationAmount || 0)).toFixed(2);
      buttons = paypalWindow.paypal.Buttons({
        style: { layout: "vertical", shape: "pill", height: 42 },
        createOrder: (_data: unknown, actions: any) => actions.order.create({ purchase_units: [{ description: donationNote, amount: { currency_code: "EUR", value: amount } }] }),
        onApprove: async (data: any, actions: any) => {
          setDonationMessage("Validation du paiement...");
          const order = await actions.order.capture();
          const captureId = order?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
          const response = await fetch("/api/paypal/donation/complete", { method: "POST", headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ orderId: data.orderID, captureId, note: donationNote }) });
          const result = await response.json().catch(() => null);
          if (!response.ok || !result?.ok) { setDonationMessage(result?.message || "Paiement reçu, mais enregistrement impossible. Contactez-nous."); return; }
          setDonationMessage("");
          setDonationThanksText(donationThanks[Math.floor(Math.random() * donationThanks.length)]);
        },
        onError: () => setDonationMessage("PayPal est momentanément indisponible."),
      });
      void buttons.render("#paypal-donation-buttons");
      return true;
    };
    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      if (renderButtons() || attempts >= 30) {
        window.clearInterval(intervalId);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      void buttons?.close?.();
      container.replaceChildren();
    };
  }, [donationAmount, donationNote, session?.access_token]);

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
              <label className="tiny" htmlFor="donation-amount">Montant de votre choix</label>
              <div className="donation-amount-row"><span>€</span><input id="donation-amount" className="input" type="number" min="1" step="1" value={donationAmount} onChange={(event) => setDonationAmount(event.target.value)} /><span>EUR</span></div>
              <label className="tiny" htmlFor="donation-note">Propos de votre donation</label>
              <select id="donation-note" className="input" value={donationNote} onChange={(event) => setDonationNote(event.target.value)}><option>Soutien libre et chaleureux</option><option>Pour les nouveaux livres</option><option>Pour les outils éducatifs</option><option>Merci pour votre travail</option></select>
              <div id="paypal-donation-buttons" style={{ marginTop: 12 }} />
              {donationMessage ? <p className="tiny">{donationMessage}</p> : null}
            </div>
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
      {donationThanksText ? <div className="overlay-backdrop" role="presentation" onClick={() => setDonationThanksText(null)}><div className="overlay-card overlay-card-small glass" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button className="overlay-close" type="button" onClick={() => setDonationThanksText(null)}><X size={18} /></button><div className="badge">Merci pour votre soutien 💝</div><h3 style={{ margin: "16px 0 10px" }}>Votre donation est bien arrivée !</h3><p className="muted">{donationThanksText}</p><button className="cta-button" type="button" onClick={() => setDonationThanksText(null)}>Avec plaisir</button></div></div> : null}
    </>
  );
}
