"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  LoaderCircle,
  Mail,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
  Ticket,
  X,
} from "lucide-react";
import { GoogleAdsSlot } from "@/components/google-ads-slot";
import { TopNav } from "@/components/top-nav";
import { PromoBanner } from "@/components/promo-banner";
import { useAuth } from "@/components/auth-provider";
import { books as staticBooks, defaultRelatedBookIds } from "@/data/books";
import { bookAssetExtensions, bookCoverPath, bookPdfPath } from "@/lib/book-assets";
import { loadDisplayBooks, type DisplayBook } from "@/lib/books-service";
import { siteConfig } from "@/lib/site-config";
import { infoLinks } from "@/lib/legal-info";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isPromoActive, mapPromoRow, type PromoCode, type PromoRow } from "@/lib/promo";

type CommentItem = {
  id: string;
  name: string;
  content: string;
  icon: string;
  createdAt: string;
};

const commentIcons = ["✨", "🛸", "📖", "🍵", "🌙", "💫", "🎐", "🫖"];

const sampleComments: CommentItem[] = [
  {
    id: "sample-1",
    name: "Claire",
    content: "J'adore la douceur du concept et l'idee d'un espace de lecture tres visuel.",
    icon: "✨",
    createdAt: "Aujourd'hui",
  },
  {
    id: "sample-2",
    name: "Noa",
    content: "Les histoires donnent envie d'explorer le chinois sans pression, avec un vrai univers.",
    icon: "📖",
    createdAt: "Hier",
  },
];

const defaultCarouselBooks: DisplayBook[] = staticBooks.map((book) => {
  const ext = bookAssetExtensions[book.id] || "jpg";

  return {
    ...book,
    visible: true,
    coverImage: bookCoverPath(book.id, ext),
    pdfFile: bookPdfPath(book.id),
    relatedBookIds: defaultRelatedBookIds[book.id] || [],
  };
});

export default function HomePage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [activeInfoId, setActiveInfoId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authMessage, setAuthMessage] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<"google" | "github" | null>(null);
  const [comments, setComments] = useState<CommentItem[]>(sampleComments);
  const [commentName, setCommentName] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentMessage, setCommentMessage] = useState("");
  const [commentDeliveryMode, setCommentDeliveryMode] = useState<"site" | "email">("site");
  const [displayBooks, setDisplayBooks] = useState<DisplayBook[]>(defaultCarouselBooks);
  const [activePromo, setActivePromo] = useState<PromoCode | null>(null);
  const [promoDismissed, setPromoDismissed] = useState(false);
  const { user, profile, session, signInWithPassword, signUpWithPassword } = useAuth();

  const activeInfo = infoLinks.find((item) => item.id === activeInfoId);

  useEffect(() => {
    void loadDisplayBooks().then((books) => {
      setDisplayBooks(books.length > 0 ? books : defaultCarouselBooks);
    });
  }, []);

  useEffect(() => {
    const loadPromo = async () => {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        return;
      }

      const { data } = await supabase
        .from("promo_codes")
        .select("id, code, discount_percent, valid_from, valid_until, active, show_banner, banner_text_fr, banner_text_zh")
        .eq("active", true)
        .eq("show_banner", true)
        .order("created_at", { ascending: false })
        .limit(1);

      const promo = ((data || []) as PromoRow[]).map(mapPromoRow).find((item) => isPromoActive(item)) || null;
      setActivePromo(promo);
    };

    void loadPromo();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const paypalWindow = window as Window & {
      paypal?: {
        HostedButtons?: (config: { hostedButtonId: string }) => {
          render: (selector: string) => void;
        };
      };
    };

    const container = document.getElementById("paypal-container-D3LVZA49QZ4VE");

    if (!container) {
      return;
    }

    const renderHostedButton = () => {
      const hostedButtons = paypalWindow.paypal?.HostedButtons;

      if (!hostedButtons || container.querySelector("iframe")) {
        return false;
      }

      hostedButtons({ hostedButtonId: "D3LVZA49QZ4VE" }).render("#paypal-container-D3LVZA49QZ4VE");
      return true;
    };

    const trySelectFirstDonationOption = () => {
      const select = container.querySelector("select") as HTMLSelectElement | null;

      if (select && select.options.length > 0) {
        const options = Array.from(select.options);

        options.forEach((option, index) => {
          const value = option.value.trim();
          const text = option.textContent?.trim() || "";
          const isPlaceholder = index === 0 && !value;

          if (isPlaceholder) {
            option.hidden = true;
            option.disabled = true;
          }

          if (!value && !text) {
            option.hidden = true;
            option.disabled = true;
          }
        });

        if (!select.value) {
          const firstRealOption = options.findIndex((option) => !option.disabled);
          select.selectedIndex = firstRealOption >= 0 ? firstRealOption : 0;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }

      const radios = Array.from(container.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];

      if (radios.length > 0 && !radios.some((radio) => radio.checked)) {
        radios[0].click();
      }
    };

    const observer = new MutationObserver(() => {
      trySelectFirstDonationOption();
    });

    observer.observe(container, { childList: true, subtree: true });
    trySelectFirstDonationOption();

    if (renderHostedButton()) {
      return () => {
        observer.disconnect();
      };
    }

    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;

      if (renderHostedButton() || attempts >= 20) {
        window.clearInterval(intervalId);
      }
    }, 200);

    return () => {
      window.clearInterval(intervalId);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const loadComments = async () => {
      const supabase = getSupabaseBrowserClient();

      if (supabase) {
        const { data } = await supabase
          .from("comments")
          .select("id, content, author_name, created_at")
          .order("created_at", { ascending: false })
          .limit(2);

        if (data && data.length > 0) {
          setComments(
            data.map((comment, index) => ({
              id: comment.id,
              name: comment.author_name || "Lecteur",
              content: comment.content,
              icon: commentIcons[index % commentIcons.length],
              createdAt: comment.created_at
                ? new Date(comment.created_at).toLocaleDateString("fr-FR")
                : "—",
            })),
          );
          return;
        }
      }

      try {
        const response = await fetch("/api/messages");
        const text = await response.text();

        if (!text) {
          return;
        }

        const result = JSON.parse(text);

        if (response.ok && Array.isArray(result.comments) && result.comments.length > 0) {
          setComments(
            result.comments.slice(-2).map((comment: CommentItem, index: number) => ({
              ...comment,
              icon: commentIcons[index % commentIcons.length],
            })),
          );
        }
      } catch {
        // keep existing sample comments if the API is unavailable
      }
    };

    void loadComments();
  }, []);

  useEffect(() => {
    if (user && !commentName) {
      setCommentName(profile?.displayName || user.user_metadata?.full_name || user.email?.split("@")[0] || "");
    }
  }, [user, profile, commentName]);

  const handleOAuth = async (provider: "google" | "github") => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setAuthMessage("Configuration Supabase manquante pour lancer l'authentification.");
      return;
    }

    setAuthMessage("");
    setIsOAuthLoading(provider);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setAuthMessage(error.message);
      setIsOAuthLoading(null);
    }
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setAuthMessage("Configuration Supabase manquante pour lancer l'email magique.");
      return;
    }

    setIsSubmittingEmail(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setIsSubmittingEmail(false);

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setAuthMessage("Lien magique envoye. Verifie ta boite email pour continuer.");
  };

  const handlePasswordAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setAuthMessage("Renseignez votre adresse email.");
      return;
    }

    if (authMode === "signup" && password !== confirmPassword) {
      setAuthMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 6) {
      setAuthMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setIsSubmittingPassword(true);
    setAuthMessage("");

    const result =
      authMode === "signup"
        ? await signUpWithPassword(email.trim(), password)
        : await signInWithPassword(email.trim(), password);

    setIsSubmittingPassword(false);

    if (result.error) {
      setAuthMessage(result.error.message);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setAuthMessage(
      authMode === "signup"
        ? "Inscription réussie. Vérifiez votre boîte mail si une confirmation est demandée."
        : "Connexion réussie.",
    );
    setAuthOpen(false);
  };

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!commentName.trim() || !commentContent.trim()) {
      setCommentMessage("Nom et commentaire sont requis.");
      return;
    }

    if (commentDeliveryMode === "email" && (!user || !session?.access_token)) {
      setCommentMessage("Connectez-vous pour envoyer un message par email a l'administrateur.");
      return;
    }

    setIsSubmittingComment(true);
    setCommentMessage("");

    try {
      const formData = new FormData();
      formData.append("name", commentName);
      formData.append("content", commentContent);
      formData.append("mode", commentDeliveryMode);

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: session?.access_token
          ? {
              Authorization: `Bearer ${session.access_token}`,
            }
          : undefined,
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setCommentMessage(result.message || "Erreur lors de l'envoi.");
        return;
      }

      if (commentDeliveryMode === "site") {
        const newComment: CommentItem = {
          id: result.comment.id,
          name: commentName,
          content: commentContent,
          icon: commentIcons[Math.floor(Math.random() * commentIcons.length)],
          createdAt: result.comment.createdAt,
        };

        setComments((prev) => [newComment, ...prev.slice(0, 1)]);
        setCommentName("");
        setCommentContent("");
        setCommentMessage("Commentaire publie avec succes.");
      } else {
        setCommentContent("");
        setCommentMessage(result.message || "Message envoye a l'administrateur.");
      }
    } catch (error) {
      setCommentMessage("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <main className="page-shell luxury-shell">
      <TopNav
        className="topbar-luxury"
        subtitle="Bibliotheque visuelle bilingue"
        title={siteConfig.brand}
        onLoginClick={() => setAuthOpen(true)}
        showAdmin
        showLogout
        isHomePage={true}
      />

      <section className="hero-scene">
        <div className="left-column-stack">
          <aside className="panel glass donation-column donation-column-compact" id="donation">
            <span className="badge">
              <Sparkles size={16} />
              Donation
            </span>
            <div className="paypal-donation-shell">
              <div className="paypal-donation-card">
                <div id="paypal-container-D3LVZA49QZ4VE" />
              </div>
            </div>
          </aside>

          <GoogleAdsSlot
            client="ca-pub-6796254088003500"
            className="panel glass ad-slot-panel"
            label="Ads"
            slot="8355506858"
          />

          <aside className="panel glass comment-column">
            <span className="badge">
              <MessageCircleHeart size={16} />
              Votre avis nous intéresse ...
            </span>
            <div className="comment-list">
              {comments.slice(-2).map((item) => (
                <article className="comment-card" key={item.id}>
                  <div className="comment-card-header">
                    <strong>{item.name}</strong>
                  </div>
                  <p className="muted comment-content">{item.content}</p>
                  <div className="comment-card-footer">
                    <span className="comment-warm-word">{item.icon}</span>
                    <span className="comment-time">{item.createdAt}</span>
                  </div>
                </article>
              ))}
            </div>
            <form className="input-group compact-form" onSubmit={handleCommentSubmit}>
              <div className="comment-delivery-switch">
                <button
                  className={commentDeliveryMode === "site" ? "pill-button active-mode" : "pill-button"}
                  type="button"
                  onClick={() => {
                    setCommentDeliveryMode("site");
                    setCommentMessage("");
                  }}
                >
                  Publier sur le site
                </button>
                <button
                  className={commentDeliveryMode === "email" ? "pill-button active-mode" : "pill-button"}
                  type="button"
                  disabled={!user}
                  onClick={() => {
                    setCommentDeliveryMode("email");
                    setCommentMessage("");
                  }}
                  title={user ? "Envoyer par email a l'administrateur" : "Connexion requise"}
                >
                  Envoyer par email
                </button>
              </div>
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
              <button className="cta-button compact-submit" type="submit" disabled={isSubmittingComment}>
                {isSubmittingComment ? "Envoi..." : "Envoyer"}
              </button>
              {commentDeliveryMode === "email" && !user ? (
                <p className="tiny comment-message">Connectez-vous pour envoyer votre message par email a l&apos;administrateur.</p>
              ) : null}
              {commentMessage ? <p className="tiny comment-message">{commentMessage}</p> : null}
            </form>
          </aside>
        </div>

        <section className="panel glass carousel-stage" id="scene">
          <div className="badge">Albums illustrés bilingues 🇨🇳 chinois-français 🇫🇷</div>

          <div className="marquee-shell">
            <div className="marquee-inner">
              <div className="marquee-track">
                {displayBooks.map((book, index) => (
                  <Link className="carousel-card carousel-card-link" href={`/livres/${book.id}`} key={`${book.id}-${index}`}>
                    <div className="carousel-image">
                      <Image
                        src={book.coverImage}
                        alt={book.titleFr}
                        fill
                        sizes="270px"
                        className="carousel-cover-image"
                      />
                    </div>
                    <div className="carousel-caption">
                      <strong>{book.titleFr}</strong>
                      <span>{book.priceEur.toFixed(2)} EUR</span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="marquee-track" aria-hidden="true">
                {displayBooks.map((book, index) => (
                  <Link
                    className="carousel-card carousel-card-link"
                    href={`/livres/${book.id}`}
                    key={`${book.id}-clone-${index}`}
                    tabIndex={-1}
                  >
                    <div className="carousel-image">
                      <Image
                        src={book.coverImage}
                        alt={book.titleFr}
                        fill
                        sizes="270px"
                        className="carousel-cover-image"
                      />
                    </div>
                    <div className="carousel-caption">
                      <strong>{book.titleFr}</strong>
                      <span>{book.priceEur.toFixed(2)} EUR</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="scene-actions">
            <Link className="cta-button" href="/catalogue">
              Explorer les livres
            </Link>
            {displayBooks[0]?.amazonPaperbackUrl ? (
              <a className="cta-button secondary" href={displayBooks[0].amazonPaperbackUrl} target="_blank">
                Version papier Amazon
              </a>
            ) : null}
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

      {activePromo && !promoDismissed ? (
        <PromoBanner promo={activePromo} onDismiss={() => setPromoDismissed(true)} />
      ) : null}

      {authOpen ? (
        <div className="overlay-backdrop" role="presentation" onClick={() => setAuthOpen(false)}>
          <div
            className="overlay-card glass"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="overlay-close" type="button" onClick={() => setAuthOpen(false)}>
              <X size={18} />
            </button>
            <div className="actions-row" style={{ marginTop: 0, marginBottom: 12, justifyContent: "flex-start" }}>
              <button className="pill-button" type="button" onClick={() => { setAuthMode("signin"); setAuthMessage(""); }}>
                Connexion
              </button>
              <button className="pill-button" type="button" onClick={() => { setAuthMode("signup"); setAuthMessage(""); }}>
                Inscription
              </button>
            </div>
            <h2 className="section-title" style={{ fontFamily: "var(--font-heading), serif" }}>
              Entrer dans l&apos;univers Visd AR
            </h2>
            <div className="auth-provider-grid">
              <button className="cta-button auth-provider" type="button" onClick={() => void handleOAuth("google")}>
                {isOAuthLoading === "google" ? <LoaderCircle size={16} className="spin" /> : null}
                Continuer avec Google
              </button>
              <button className="cta-button secondary auth-provider" type="button" onClick={() => void handleOAuth("github")}>
                {isOAuthLoading === "github" ? <LoaderCircle size={16} className="spin" /> : null}
                Continuer avec GitHub
              </button>
            </div>
            <form className="input-group auth-email-form" onSubmit={handlePasswordAuth}>
              <label className="tiny" htmlFor="password-auth">
                {authMode === "signup" ? "Créer un compte par email" : "Se connecter par email"}
              </label>
              <div className="email-inline">
                <Mail size={18} />
                <input
                  id="email-auth"
                  className="input email-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Votre email"
                  required
                />
              </div>
              <div className="email-inline">
                <ShieldCheck size={18} />
                <input
                  id="password-auth"
                  className="input email-input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Votre mot de passe"
                  required
                />
              </div>
              {authMode === "signup" ? (
                <div className="email-inline">
                  <ShieldCheck size={18} />
                  <input
                    className="input email-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirmer le mot de passe"
                    required
                  />
                </div>
              ) : null}
              <button className="cta-button" type="submit" disabled={isSubmittingPassword}>
                {isSubmittingPassword ? "Chargement..." : authMode === "signup" ? "Créer mon compte" : "Se connecter"}
              </button>
            </form>
            <form className="input-group auth-email-form" onSubmit={handleEmailAuth}>
              <label className="tiny" htmlFor="email-auth">
                Recevoir un lien magique
              </label>
              <div className="email-inline">
                <Mail size={18} />
                <input
                  id="email-auth"
                  className="input email-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Votre email"
                  required
                />
              </div>
              <button className="cta-button" type="submit" disabled={isSubmittingEmail}>
                {isSubmittingEmail ? "Envoi..." : "Recevoir un lien magique"}
              </button>
            </form>
            {authMessage ? <p className="tiny">{authMessage}</p> : null}
          </div>
        </div>
      ) : null}

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
