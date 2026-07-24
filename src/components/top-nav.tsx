"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/components/auth-provider";
import { SiteShareStrip } from "@/components/site-share-strip";

type TopNavProps = {
  subtitle?: string;
  title?: string;
  onLoginClick?: () => void;
  className?: string;
  showAdmin?: boolean;
  showLogout?: boolean;
  isHomePage?: boolean;
  sharePanel?: React.ReactNode;
};

export function TopNav({
  subtitle,
  title,
  onLoginClick,
  className,
  showAdmin,
  showLogout,
  isHomePage = false,
  sharePanel,
}: TopNavProps) {
  const { user, isAdmin, signOut } = useAuth();
  const [preferDesktopView, setPreferDesktopView] = useState(false);

  const headerClassName = ["topbar", "glass", className].filter(Boolean).join(" ");
  const resolvedSharePanel = sharePanel ?? <SiteShareStrip />;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setPreferDesktopView(window.localStorage.getItem("visdar-preferred-view") === "desktop");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    if (preferDesktopView) {
      document.documentElement.dataset.preferredView = "desktop";
      window.localStorage.setItem("visdar-preferred-view", "desktop");
      return;
    }

    delete document.documentElement.dataset.preferredView;
    window.localStorage.removeItem("visdar-preferred-view");
  }, [preferDesktopView]);

  return (
    <>
      <div className="topbar-utility">
        <button
          className="topbar-utility-button"
          type="button"
          onClick={() => setPreferDesktopView((current) => !current)}
        >
          {preferDesktopView ? "Version mobile" : "Version web"}
        </button>
      </div>
      <header className={headerClassName}>
        <Link href="/" className="brand-mark brand-link">
          <BrandLogo />
          {subtitle || title ? (
            <div>
              {subtitle ? <div className="tiny">{subtitle}</div> : null}
              {title ? <strong>{title}</strong> : null}
            </div>
          ) : null}
        </Link>
        {resolvedSharePanel ? <div className="topbar-share-wrap">{resolvedSharePanel}</div> : null}
        <nav className="nav-links">
          {!isHomePage ? <Link href="/">Accueil</Link> : null}
          <Link href="/catalogue">Catalogue</Link>
          {user ? (
            <>
              <Link href="/account">Ma page</Link>
              {showAdmin && isAdmin ? <Link href="/admin">Admin</Link> : null}
              {showLogout ? (
                <button className="nav-button" type="button" onClick={() => void signOut()}>
                  Déconnexion
                </button>
              ) : null}
            </>
          ) : onLoginClick ? (
            <button className="nav-button" type="button" onClick={onLoginClick}>
              Connexion
            </button>
          ) : (
            <Link href="/">Connexion</Link>
          )}
        </nav>
      </header>
    </>
  );
}
