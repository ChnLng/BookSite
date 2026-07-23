"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  Facebook,
  LoaderCircle,
  Mail,
  Instagram,
  Music4,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRound,
  X,
} from "lucide-react";
import { books } from "@/data/books";
import { useAuth } from "@/components/auth-provider";
import { hasSupabaseConfig, siteConfig } from "@/lib/site-config";
import { infoLinks } from "@/lib/legal-info";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com", icon: Instagram },
  { label: "TikTok", href: "https://tiktok.com", icon: Music4 },
  { label: "Facebook", href: "https://facebook.com", icon: Facebook },
];

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
  const { user, profile, isAdmin, signInWithPassword, signUpWithPassword } = useAuth();

  const activeInfo = infoLinks.find((item) => item.id === activeInfoId);

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

    if (renderHostedButton()) {
      return;
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

  const viewer = {
    name: profile?.displayName || user?.user_metadata?.full_name || user?.email || "Invite",
    isLoggedIn: Boolean(user),
    isAdmin,
  };

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
      setCommentMessage("Merci de renseigner votre nom et votre commentaire.");
      return;
    }

    if (!user) {
      setCommentMessage("Connectez-vous pour enregistrer votre commentaire sur Ma page.");
      setAuthOpen(true);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setCommentMessage("Configuration Supabase manquante.");
      return;
    }

    setIsSubmittingComment(true);
    setCommentMessage("");

    const { data, error } = await supabase
      .from("comments")
      .insert({
        user_id: user.id,
        author_name: commentName.trim(),
        content: commentContent.trim(),
      })
      .select("id, content, author_name, created_at")
      .single();

    setIsSubmittingComment(false);

    if (error || !data) {
      setCommentMessage(error?.message || "Impossible d'ajouter le commentaire.");
      return;
    }

    const randomIcon = commentIcons[Math.floor(Math.random() * commentIcons.length)];
    const newComment: CommentItem = {
      id: data.id,
      name: data.author_name || commentName.trim(),
      content: data.content,
      icon: randomIcon,
      createdAt: data.created_at ? new Date(data.created_at).toLocaleDateString("fr-FR") : "Aujourd'hui",
    };

    setComments((current) => [newComment, ...current.filter((item) => item.id !== data.id)].slice(0, 2));
    setCommentContent("");
    setCommentMessage("Merci pour votre message. Retrouvez-le dans Ma page > Commentaires.");
  };

  return (
    <main className="page-shell luxury-shell">
      <header className="topbar glass topbar-luxury">
        <div className="brand-mark">
          <div className="brand-avatar" />
          <div>
            <div className="tiny">Bibliotheque visuelle bilingue</div>
            <strong>{siteConfig.brand}</strong>
          </div>
        </div>
        <nav className="nav-links">
          <Link href="/catalogue">Catalogue</Link>
          <a href="#scene">Selection</a>
          {viewer.isLoggedIn ? (
            <Link href="/account">Ma page</Link>
          ) : (
            <button className="nav-button" type="button" onClick={() => setAuthOpen(true)}>
              Connexion
            </button>
          )}
        </nav>
      </header>

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
              {commentMessage ? <p className="tiny comment-message">{commentMessage}</p> : null}
            </form>
          </aside>
        </div>

        <section className="panel glass carousel-stage" id="scene">
          <div className="badge">Edition poetique haut de gamme</div>
          <p className="hero-copy stage-copy">
            Au centre, la selection produit reste reine : images plus grandes,
            lumiere douce, mouvement continu, titre discret et prix visibles.
          </p>

          <div className="marquee-shell">
            <div className="marquee-track">
              {[...books, ...books].map((book, index) => (
                <article className="carousel-card" key={`${book.id}-${index}`}>
                  <div className="carousel-image" style={{ background: book.accent }}>
                    <div className="carousel-orb" />
                    <div className="carousel-animal">{book.animal}</div>
                  </div>
                  <div className="carousel-caption">
                    <strong>{book.titleFr}</strong>
                    <span>{book.priceEur.toFixed(2)} EUR</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="scene-actions">
            <Link className="cta-button" href="/catalogue">
              Explorer les livres
            </Link>
            <a className="cta-button secondary" href={books[0].amazonPaperbackUrl} target="_blank">
              Version papier Amazon
            </a>
          </div>

          <div className="social-row">
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <a className="social-chip" href={href} key={label} target="_blank">
                <Icon size={16} />
                <span>{label}</span>
              </a>
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
            <div className="badge">
              <UserRound size={16} />
              Connexion inscription
            </div>
            <h2 className="section-title" style={{ fontFamily: "var(--font-heading), serif" }}>
              Entrer dans l&apos;univers Visd AR
            </h2>
            <p className="muted">
              L&apos;identite et le role sont lus depuis Supabase. Les comptes admin
              affichent automatiquement le back-office, les autres restent sur
              l&apos;espace lecteur.
            </p>
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
            <div className="actions-row" style={{ marginTop: 10, justifyContent: "flex-start" }}>
              <button className="pill-button" type="button" onClick={() => { setAuthMode("signin"); setAuthMessage(""); }}>
                Connexion
              </button>
              <button className="pill-button" type="button" onClick={() => { setAuthMode("signup"); setAuthMessage(""); }}>
                Inscription
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
            <div className="config-pills">
              <span className="config-pill">Supabase {hasSupabaseConfig ? "pret" : "a relier"}</span>
              <span className="config-pill">Paiement PayPal</span>
              <span className="config-pill">{viewer.isAdmin ? "Role admin detecte" : "Role lecteur detecte"}</span>
            </div>
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
