"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/components/auth-provider";

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

  const headerClassName = ["topbar", "glass", className].filter(Boolean).join(" ");

  return (
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
      {sharePanel ? <div className="topbar-share-wrap">{sharePanel}</div> : null}
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
  );
}
