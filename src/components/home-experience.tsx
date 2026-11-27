"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, FocusEvent } from "react";
import { Link2, Ticket } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { AuthModal } from "@/components/auth-modal";
import { PromoBanner } from "@/components/promo-banner";
import { homeImage, type HomeExternalLink, type HomeProduct } from "@/lib/home-experience-data";
import { infoLinks, type InfoLink } from "@/lib/legal-info";
import { mapPromoRow, isPromoActive, type PromoCode, type PromoRow } from "@/lib/promo";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import "./home-experience.css";

type HomeExperienceProps = {
  tools: HomeProduct[];
  books: HomeProduct[];
  latest: HomeProduct[];
  links: HomeExternalLink[];
};

type StartScene = (root: HTMLElement, options: {
  tools: HomeProduct[];
  books: HomeProduct[];
  activeIndex: number;
  select: (item: HomeProduct) => void;
}) => () => void;

const currency = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const linkMarks: Record<string, string> = {
  "Applications Android": "▶",
  "Albums illustrés sur Amazon Kindle": "K",
  TikTok: "♪",
  X: "𝕏",
  YouTube: "▶",
};

function productPrice(product: HomeProduct) {
  if (product.price && product.price > 0) return currency.format(product.price);
  return product.id.startsWith("hub-bilingue") ? "Achats intégrés" : "Voir la fiche";
}

function Artwork({ image, ...props }: { image: string; className?: string; loading?: "lazy" }) {
  return (
    // Product images can come from admin-managed HTTPS URLs outside Next's optimization hosts.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={homeImage(image)} alt="" draggable={false} {...props} onError={(event) => {
      if (!event.currentTarget.src.endsWith("/images/logo.png")) event.currentTarget.src = "/images/logo.png";
    }} />
  );
}

export function HomeExperience({ tools, books, latest, links }: HomeExperienceProps) {
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const drawerTrigger = useRef<HTMLElement | null>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const closeDrawerButton = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const { user, isAdmin, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [previews, setPreviews] = useState(latest);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeInfo, setActiveInfo] = useState<InfoLink>();
  const [promo, setPromo] = useState<PromoCode | null>(null);
  const initial = Math.max(0, tools.findIndex((item) => item.href === latest[0]?.href));

  const select = useCallback((item: HomeProduct) => {
    setPreviews((previous) => [item, ...previous.filter((entry) => entry.href !== item.href)].slice(0, 3));
    if (window.matchMedia("(max-width: 720px)").matches) {
      if (!root.current?.querySelector("#apercus")?.contains(document.activeElement)) {
        drawerTrigger.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
          ? document.activeElement
          : mobileTrigger.current;
      }
      setDrawerOpen(true);
    }
  }, []);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const modulePath = "/home/scene.js";
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import(/* webpackIgnore: true */ modulePath).then(({ startHomeScene }: { startHomeScene: StartScene }) => {
      if (!disposed) cleanup = startHomeScene(node, { tools, books, activeIndex: initial, select });
    }).catch((error) => console.error("Animations Visd AR", error));
    return () => { disposed = true; cleanup?.(); };
  }, [tools, books, initial, select]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const controller = new AbortController();
    void supabase.from("promo_codes")
      .select("id, code, discount_percent, valid_from, valid_until, active, show_banner, banner_text_fr, banner_text_zh")
      .eq("active", true).eq("show_banner", true).order("created_at", { ascending: false }).limit(1)
      .abortSignal(controller.signal).then(({ data }) => {
        if (!controller.signal.aborted) setPromo(((data || []) as PromoRow[]).map(mapPromoRow).find((item) => isPromoActive(item)) || null);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (drawerOpen && window.matchMedia("(max-width: 720px)").matches) {
      closeDrawerButton.current?.focus({ preventScroll: true });
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (activeInfo && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [activeInfo]);

  useEffect(() => {
    const hide = () => { if (tooltip.current) tooltip.current.hidden = true; };
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  function closeDrawer() {
    setDrawerOpen(false);
    drawerTrigger.current?.focus({ preventScroll: true });
  }

  function showTooltip(event: MouseEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>, label: string) {
    const tip = tooltip.current;
    if (!tip) return;
    const { left, top } = event.currentTarget.getBoundingClientRect();
    tip.textContent = label;
    tip.hidden = false;
    tip.style.left = Math.max(9, Math.min(left, document.documentElement.clientWidth - tip.offsetWidth - 9)) + "px";
    tip.style.top = Math.max(0, top - tip.offsetHeight - 8) + "px";
  }

  function hideTooltip() {
    if (tooltip.current) tooltip.current.hidden = true;
  }

  return (
    <div className="visd-home" ref={root} onKeyDown={(event) => { if (event.key === "Escape" && drawerOpen) closeDrawer(); }}>
      <div id="pointer-light" aria-hidden="true" />
      <header className="top">
        <a className="brand" href="#accueil">
          <Artwork image="/images/logo.png" />
          <span>Visd <span className="brand-ar">AR</span><small>Hub bilingue 🇨🇳 Chinois - Français 🇫🇷</small></span>
        </a>
        <nav aria-label="Navigation principale">
          <a className="catalogue-shortcut" href="/catalogue?q=android">Applications Android</a>
          <a className="catalogue-shortcut" href="/catalogue?view=autres">Autres outils ludiques</a>
          <a href="/catalogue?q=album">Albums illustrés</a>
          <a href="/catalogue">Catalogue <span aria-hidden="true">↗</span></a>
        </nav>
        <div className="top-actions">
          {user ? <>
            <a className="account-link" href="/account">Ma page</a>
            {isAdmin && <a className="account-link" href="/admin">Admin</a>}
            <button className="account-link" type="button" onClick={() => void signOut()}>Déconnexion</button>
          </> : <button className="account-link" type="button" onClick={() => setAuthOpen(true)}>Connexion</button>}
          <button className="pause" id="motion" type="button" aria-label="Pause animations" aria-pressed="false"><span aria-hidden="true">Ⅱ</span></button>
        </div>
      </header>

      <main id="accueil" className="layout">
        <div className="exhibits">
          <section className="intro" aria-labelledby="home-title">
            <div className="story-identity">
              <span>À propos de</span>
              <h1 id="home-title" aria-label="Visd AR — livres et applications pour apprendre le chinois">Visd</h1>
              <div className="story-signature"><span aria-hidden="true" /><strong>AR</strong></div>
            </div>
            <div className="intro-copy">
              <p>Ce personnage numérique dont vous voyez le visage s’appelle <strong>Visd</strong>. Il vous propose de voir d’autres dimensions de ce monde grâce à la pratique d’une autre langue, le chinois. Il vous accompagne et répond à votre curiosité.</p>
              <p>L’objectif de ces créations est de vous faire pénétrer dans d’autres univers comme si c’était dans une <strong>réalité augmentée</strong>.</p>
            </div>
          </section>

          <section id="outils" className="wheel-section" aria-labelledby="wheel-title">
            <div className="section-head">
              <h2 id="wheel-title">Outils ludiques</h2>
              <div className="arrows" aria-label="Déplacer le carrousel">
                <button type="button" id="prev" aria-label="Produit précédent" disabled={tools.length < 2}>←</button>
                <button type="button" id="next" aria-label="Produit suivant" disabled={tools.length < 2}>→</button>
              </div>
            </div>
            {tools.length ? <>
              <div className="wheel" id="wheel" tabIndex={0} role="group" aria-label="Carrousel 3D des outils ludiques. Utilisez les flèches gauche et droite.">
                {tools.map((tool, index) => (
                  <a key={tool.id} className={`wheel-card${tool.contain ? " support" : ""}`} href={tool.href} data-front={index === initial}
                    aria-label={`Afficher l’aperçu : ${tool.title}`} tabIndex={index === initial ? 0 : -1}>
                    <Artwork image={tool.image} loading={index === initial ? undefined : "lazy"} />
                    <span className="card-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span className="card-name">{tool.title}</span>
                  </a>
                ))}
              </div>
              <div className="wheel-caption">
                <div><span id="wheel-count">{String(initial + 1).padStart(2, "0")} / {tools.length}</span><span aria-hidden="true" className="count-rule" /><span id="wheel-status">{tools[initial]?.title}</span></div>
                <span id="wheel-announcement" className="sr-only" aria-live="polite" />
                <small>Glissez pour orienter et accélérer <span aria-hidden="true">↔</span></small>
              </div>
            </> : <p className="empty-tools"><a href="/catalogue?q=android">Voir les applications Android dans le catalogue</a></p>}
          </section>
        </div>

        <aside className={`rail${drawerOpen ? " is-open" : ""}`} id="apercus" aria-labelledby="rail-title">
          <div className="rail-head"><h2 id="rail-title">Nouveautés</h2><button type="button" className="rail-close" ref={closeDrawerButton} aria-label="Fermer les aperçus" onClick={closeDrawer}>×</button></div>
          <p id="rail-help">Cliquez sur un produit pour l’ajouter à vos aperçus.</p>
          {books.length > 0 && <details className="album-picker">
            <summary>Aperçu des albums</summary>
            <label className="sr-only" htmlFor="album-choice">Choisir un album</label>
            <select id="album-choice" value="" onChange={(event) => {
              const book = books.find((item) => item.id === event.target.value);
              if (book) select(book);
            }}>
              <option value="">Choisir un album</option>
              {books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
            </select>
          </details>}
          <ol className="rail-list" id="rail-list" aria-live="polite">
            {previews.map((item) => (
              <li key={item.href} className="rail-item enter" data-kind={item.kind}>
                <a href={item.href} aria-label={`Ouvrir la fiche : ${item.title}`}>
                  <Artwork image={item.image} />
                  <div><small>{latest.some((product) => product.href === item.href) ? "Nouveauté" : item.kind === "book" ? "Album illustré" : "Outil ludique"}</small>
                    <strong>{item.title}</strong><span className="price">{productPrice(item)}</span>
                  </div>
                  <span aria-hidden="true" className="arrow">↗</span>
                </a>
              </li>
            ))}
          </ol>
          <a className="rail-catalogue" href="/catalogue">Tout le catalogue <span aria-hidden="true">↗</span></a>
        </aside>
      </main>

      <button type="button" className="mobile-selection" aria-controls="apercus" aria-expanded={drawerOpen} ref={mobileTrigger} onClick={(event) => {
        if (drawerOpen) closeDrawer();
        else { drawerTrigger.current = event.currentTarget; setDrawerOpen(true); }
      }}>Nouveautés <span aria-hidden="true">‹</span></button>

      <div className="page-end">
        {!!links.length && <section className="external bottom-panel" id="liens-partenaires" aria-labelledby="external-title">
          <div className="bottom-heading"><span className="bottom-icon" aria-hidden="true"><Link2 /></span><h2 id="external-title">Liens externes</h2></div>
          <div className="external-links" id="external-links">
            {links.map((link) => (
              <a href={link.href} key={link.id} target="_blank" rel="noopener noreferrer" aria-label={link.label}
                onPointerEnter={(event) => showTooltip(event, link.label)} onPointerLeave={hideTooltip}
                onFocus={(event) => showTooltip(event, link.label)} onBlur={hideTooltip}>
                {link.icon ? <Artwork image={link.icon} className="partner-mark" /> : <span className="partner-mark" aria-hidden="true">{linkMarks[link.title] || link.title.slice(0, 2).toUpperCase()}</span>}
              </a>
            ))}
          </div>
        </section>}
        <footer className="footer bottom-panel" id="footer-rules">
          <div className="bottom-heading"><span className="bottom-icon" aria-hidden="true"><Ticket /></span><h2>Informations</h2></div>
          <div id="info-links">{infoLinks.map((item) => <button type="button" key={item.id} onClick={() => setActiveInfo(item)}>{item.label}</button>)}</div>
        </footer>
      </div>

      <div ref={tooltip} className="partner-tooltip" hidden aria-hidden="true" />
      <dialog ref={dialog} aria-labelledby="info-title" onClose={() => setActiveInfo(undefined)}>
        <form method="dialog"><button type="submit" aria-label="Fermer">×</button></form>
        {activeInfo && <>
          <h2 id="info-title">{activeInfo.title}</h2><p>{activeInfo.body}</p>
          {activeInfo.href && <a href={activeInfo.href}>{activeInfo.ctaLabel || "En savoir plus"}</a>}
        </>}
      </dialog>
      <div className="floating-stage" id="floating-stage" />
      <canvas id="visd-kitten" width={272} height={272} aria-hidden="true" hidden />
      {promo && <PromoBanner promo={promo} onDismiss={() => setPromo(null)} />}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
