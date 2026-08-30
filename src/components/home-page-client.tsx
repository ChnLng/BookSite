"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpenText,
  Ticket,
  X,
} from "lucide-react";
import { HomeExpandedSections } from "@/components/home-expanded-sections";
import { PromoBanner } from "@/components/promo-banner";
import { TopNav } from "@/components/top-nav";
import { AuthModal } from "@/components/auth-modal";
import { HomeDesktopSidebar } from "@/components/home-desktop-sidebar";
import { books as staticBooks, defaultRelatedBookIds } from "@/data/books";
import { bookAssetExtensions, bookCoverPath, bookPdfPath } from "@/lib/book-assets";
import { loadDisplayBooks, type DisplayBook } from "@/lib/books-service";
import { siteConfig } from "@/lib/site-config";
import { infoLinks } from "@/lib/legal-info";
import type { LatestProduct } from "@/lib/latest-products";
import type { ResourceItem } from "@/lib/home-sections";
import { isPromoActive, mapPromoRow, type PromoCode, type PromoRow } from "@/lib/promo";

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
  latestProducts: LatestProduct[];
  homepageResources: ResourceItem[] | null;
};

export function HomePageClient({ initialMobile: _initialMobile, latestProducts, homepageResources }: HomePageClientProps) {
  const [authOpen, setAuthOpen] = useState(false);
  const [activeInfoId, setActiveInfoId] = useState<string | null>(null);
  const [displayBooks, setDisplayBooks] = useState<DisplayBook[]>(defaultCarouselBooks);
  const [activePromo, setActivePromo] = useState<PromoCode | null>(null);
  const [promoDismissed, setPromoDismissed] = useState(false);
  const [albumsSectionOrder, setAlbumsSectionOrder] = useState(10);

  const activeInfo = infoLinks.find((item) => item.id === activeInfoId);

  useEffect(() => {
    void loadDisplayBooks().then((books) => {
      setDisplayBooks(books.length > 0 ? books : defaultCarouselBooks);
    });
  }, []);

  useEffect(() => {
    const loadSectionOrder = async () => {
      const { getSupabaseBrowserClient } = await import("@/lib/supabase-browser");
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { data } = await supabase.from("content_sections").select("sort_order").eq("section_key", "albums").maybeSingle();
      if (data) setAlbumsSectionOrder(Number(data.sort_order || 10));
    };
    void loadSectionOrder();
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

  return (
    <main className="page-shell luxury-shell homepage-shell w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <TopNav
        className="topbar-luxury"
        subtitle="Bibliothèque visuelle bilingue"
        title={siteConfig.brand}
        onLoginClick={() => setAuthOpen(true)}
        showAdmin
        showLogout
        isHomePage={true}
      />

      <section className="homepage-responsive-grid homepage-main-grid">
        <div className="home-desktop-sidebar-wrapper">
          <HomeDesktopSidebar latestProducts={latestProducts} />
        </div>

        <div className="home-main-flow">
          <section className="panel glass carousel-stage" id="scene" style={{ order: albumsSectionOrder }}>
            <div className="section-heading">
              <span className="section-heading-icon" aria-hidden="true">
                <BookOpenText size={17} />
              </span>
              <h2 className="section-heading-text">Albums illustrés bilingues 🇨🇳 chinois-français 🇫🇷</h2>
            </div>
            <p className="collection-intro">Des histoires à lire, deux langues à explorer.</p>

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
              <a
                className="cta-button secondary"
                href="https://www.amazon.fr/dp/B0DYYCG9XV?binding=paperback"
                target="_blank"
                rel="noreferrer"
              >
                Version papier Amazon
              </a>
            </div>
          </section>

          <HomeExpandedSections initialResources={homepageResources} />
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

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {activeInfo ? (
        <div className="overlay-backdrop" role="presentation" onClick={() => setActiveInfoId(null)}>
          <div
            className={`overlay-card overlay-card-small glass${activeInfo.id === "guide-lecture" ? " guide-overlay-card" : ""}`}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="overlay-close" type="button" onClick={() => setActiveInfoId(null)}>
              <X size={18} />
            </button>
            <div className="badge">{activeInfo.id === "guide-lecture" ? "Guide de lecture" : "Information"}</div>
            <h3 style={{ margin: "14px 0 10px" }}>{activeInfo.title}</h3>
            <p className="muted">{activeInfo.body}</p>
            {activeInfo.href ? (
              <Link className="cta-button guide-overlay-cta" href={activeInfo.href} onClick={() => setActiveInfoId(null)}>
                {activeInfo.ctaLabel || "En savoir plus"}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default HomePageClient;
