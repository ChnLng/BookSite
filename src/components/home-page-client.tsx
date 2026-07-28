"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  LoaderCircle,
  Mail,
  ShieldCheck,
  BookOpenText,
  Ticket,
  X,
} from "lucide-react";
import { HomeExpandedSections } from "@/components/home-expanded-sections";
import { PromoBanner } from "@/components/promo-banner";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { books as staticBooks, defaultRelatedBookIds } from "@/data/books";
import { bookAssetExtensions, bookCoverPath, bookPdfPath } from "@/lib/book-assets";
import { loadDisplayBooks, type DisplayBook } from "@/lib/books-service";
import { siteConfig } from "@/lib/site-config";
import { infoLinks } from "@/lib/legal-info";
import { isPromoActive, mapPromoRow, type PromoCode, type PromoRow } from "@/lib/promo";

const HomeDesktopSidebar = dynamic(
  () => import("@/components/home-desktop-sidebar").then((module) => module.HomeDesktopSidebar),
);

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

type HomePageClientProps = {
  initialMobile: boolean;
};

function shouldRenderDesktopSidebar() {
  if (typeof window === "undefined") {
    return false;
  }

  const preferDesktopView = document.documentElement.dataset.preferredView === "desktop";
  return window.innerWidth >= 768 || preferDesktopView;
}

export function HomePageClient({ initialMobile }: HomePageClientProps) {
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
  const [displayBooks, setDisplayBooks] = useState<DisplayBook[]>(defaultCarouselBooks);
  const [activePromo, setActivePromo] = useState<PromoCode | null>(null);
  const [promoDismissed, setPromoDismissed] = useState(false);
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(!initialMobile);
  const { signInWithPassword, signUpWithPassword } = useAuth();

  const activeInfo = infoLinks.find((item) => item.id === activeInfoId);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncDesktopSidebar = () => {
      setShowDesktopSidebar(shouldRenderDesktopSidebar());
    };

    syncDesktopSidebar();
    window.addEventListener("resize", syncDesktopSidebar);
    window.addEventListener("visdar:view-mode-changed", syncDesktopSidebar as EventListener);

    return () => {
      window.removeEventListener("resize", syncDesktopSidebar);
      window.removeEventListener("visdar:view-mode-changed", syncDesktopSidebar as EventListener);
    };
  }, []);

  useEffect(() => {
    void loadDisplayBooks().then((books) => {
      setDisplayBooks(books.length > 0 ? books : defaultCarouselBooks);
    });
  }, []);

  useEffect(() => {
    const loadPromo = async () => {
      const { getSupabaseBrowserClient } = await import("@/lib/supabase-browser");
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

  const handleOAuth = async (provider: "google" | "github") => {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase-browser");
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

    const { getSupabaseBrowserClient } = await import("@/lib/supabase-browser");
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

  return (
    <main className="page-shell luxury-shell homepage-shell w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <TopNav
        className="topbar-luxury"
        subtitle="Bibliotheque visuelle bilingue"
        title={siteConfig.brand}
        onLoginClick={() => setAuthOpen(true)}
        showAdmin
        showLogout
        isHomePage={true}
      />

      <section className="homepage-responsive-grid homepage-main-grid">
        {showDesktopSidebar ? <HomeDesktopSidebar /> : null}

        <div className="home-main-flow">
          <section className="panel glass carousel-stage" id="scene">
            <div className="section-heading">
              <span className="section-heading-icon" aria-hidden="true">
                <BookOpenText size={17} />
              </span>
              <h2 className="section-heading-text">Albums illustrés bilingues 🇨🇳 chinois-français 🇫🇷</h2>
            </div>

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

          <HomeExpandedSections />
        </div>
      </section>

      <footer className="panel glass footer-rules" id="footer-rules">
        <div className="footer-inline">
          <div className="section-heading">
            <span className="section-heading-icon" aria-hidden="true">
              <Ticket size={17} />
            </span>
            <h2 className="section-heading-text">Informations</h2>
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

export default HomePageClient;
