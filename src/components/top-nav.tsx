"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/components/auth-provider";
import { SiteShareStrip } from "@/components/site-share-strip";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type TopNavProps = {
  subtitle?: string;
  title?: string;
  onLoginClick?: () => void;
  className?: string;
  showAdmin?: boolean;
  showLogout?: boolean;
  isHomePage?: boolean;
  hideCatalogueLink?: boolean;
  sharePanel?: React.ReactNode;
};

type DynamicNavCategory = {
  id: string;
  slug: string;
  titleFr: string;
  kind: string;
};

export function TopNav({
  onLoginClick,
  className,
  showAdmin,
  showLogout,
  isHomePage = false,
  hideCatalogueLink = false,
  sharePanel,
}: TopNavProps) {
  const { user, isAdmin, signOut } = useAuth();
  const [preferDesktopView, setPreferDesktopView] = useState(false);
  const [viewPreferenceReady, setViewPreferenceReady] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState<DynamicNavCategory[]>([]);
  const brandTitle = "Visd AR";

  const headerClassName = ["topbar", "glass", className].filter(Boolean).join(" ");
  const resolvedSharePanel = sharePanel ?? <SiteShareStrip />;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    setPreferDesktopView(document.documentElement.dataset.preferredView === "desktop");
    setViewPreferenceReady(true);
  }, []);

  useEffect(() => {
    if (!viewPreferenceReady || typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    if (preferDesktopView) {
      document.documentElement.dataset.preferredView = "desktop";
      window.localStorage.setItem("visdar-preferred-view", "desktop");
      window.dispatchEvent(new Event("visdar:view-mode-changed"));
      return;
    }

    delete document.documentElement.dataset.preferredView;
    window.localStorage.removeItem("visdar-preferred-view");
    window.dispatchEvent(new Event("visdar:view-mode-changed"));
  }, [preferDesktopView, viewPreferenceReady]);

  useEffect(() => {
    let cancelled = false;

    const loadDynamicCategories = async () => {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        return;
      }

      const { data } = await supabase
        .from("categories")
        .select("id, slug, title_fr, kind, homepage_visible, homepage_sort_order")
        .eq("homepage_visible", true)
        .in("kind", ["resource", "custom"])
        .order("homepage_sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (cancelled || !data) {
        return;
      }

      setDynamicCategories(
        data.map((category) => ({
          id: String(category.id),
          slug: String(category.slug || category.id),
          titleFr: String(category.title_fr || "Section"),
          kind: String(category.kind || "custom"),
        })),
      );
    };

    void loadDynamicCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const dynamicLinks = dynamicCategories.map((category) => ({
    id: category.id,
    label: category.titleFr,
    href:
      category.slug === "liens"
        ? "/#liens-partenaires"
        : category.kind === "resource"
          ? `/#resource-${category.slug}`
          : `/#category-${category.slug}`,
  }));

  return (
    <>
      <div className="topbar-utility">
        <button
          className="topbar-utility-button"
          type="button"
          onClick={() => setPreferDesktopView((current) => !current)}
        >
          {preferDesktopView ? "Version mobile" : "Version ordinateur"}
        </button>
      </div>
      <header className={headerClassName}>
        <Link href="/" className="brand-mark brand-link">
          <BrandLogo />
          <div className="brand-copy">
            <strong>{brandTitle}</strong>
            <div className="tiny brand-subtitle">
              <span>Hub bilingue</span>
              <span className="mobile-flag-break" aria-hidden="true">
                <br />
              </span>
              <span> 🇨🇳 Chinois - Français 🇫🇷</span>
            </div>
          </div>
        </Link>
        {resolvedSharePanel ? <div className="topbar-share-wrap">{resolvedSharePanel}</div> : null}
        <nav className="nav-links">
          {!isHomePage ? <Link href="/">Accueil</Link> : null}
          {!hideCatalogueLink ? <Link href="/catalogue">Catalogue</Link> : null}
          {dynamicLinks.map((link) => (
            <Link href={link.href} key={link.id}>
              {link.label}
            </Link>
          ))}
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
