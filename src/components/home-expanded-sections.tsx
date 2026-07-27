"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Blocks,
  Gamepad2,
  LibraryBig,
  Link2,
  Rocket,
  Sparkles,
  Wrench,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  loadExpandedHomeData,
  type CategoryEntry,
  type CategoryFieldRule,
  type HomeCategory,
  type PartnerLink,
  type ResourceItem,
} from "@/lib/home-sections";
import { loadDisplayResources } from "@/lib/resources-service";

const iconMap = {
  sparkles: Sparkles,
  gamepad: Gamepad2,
  tools: Wrench,
  library: LibraryBig,
  rocket: Rocket,
  blocks: Blocks,
  links: Link2,
} as const;

type FloatingSectionLink = {
  id: string;
  label: string;
};

function getHeaderOffset() {
  if (typeof document === "undefined") {
    return 120;
  }

  const utilityBar = document.querySelector(".topbar-utility") as HTMLElement | null;
  const topbar = document.querySelector(".topbar") as HTMLElement | null;
  const utilityHeight = utilityBar ? utilityBar.getBoundingClientRect().height : 0;
  const topbarHeight = topbar ? topbar.getBoundingClientRect().height : 88;

  return Math.ceil(utilityHeight + topbarHeight + 20);
}

async function loadFallbackPartnerLinks() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return [] as PartnerLink[];
  }

  const { data } = await supabase
    .from("partner_links")
    .select("id, title_fr, icon_url, target_url, sort_order, visible")
    .eq("visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data || []).map((item) => ({
    id: String(item.id),
    titleFr: String(item.title_fr || "Lien"),
    iconUrl: String(item.icon_url || "/images/logo.png"),
    targetUrl: String(item.target_url || "https://visdar.fr"),
    sortOrder: Number(item.sort_order || 0),
    visible: item.visible !== false,
  }));
}

function resolveCategoryIcon(iconName?: string) {
  if (!iconName) {
    return Sparkles;
  }

  const normalized = iconName.trim().toLowerCase();
  return iconMap[normalized as keyof typeof iconMap] || Sparkles;
}

function renderEntryField(rule: CategoryFieldRule, entry: CategoryEntry) {
  const value = entry.payload?.[rule.fieldKey];

  if (value == null || value === "") {
    return null;
  }

  if (rule.fieldType === "boolean") {
    return (
      <li key={rule.id} className="tiny">
        <strong>{rule.labelFr} :</strong> {value ? "Oui" : "Non"}
      </li>
    );
  }

  if (rule.fieldType === "url" || rule.fieldType === "file") {
    return (
      <a
        key={rule.id}
        className="pill-button"
        href={String(value)}
        target="_blank"
        rel="noreferrer"
      >
        {rule.labelFr}
      </a>
    );
  }

  return (
    <li key={rule.id} className="tiny">
      <strong>{rule.labelFr} :</strong> {String(value)}
    </li>
  );
}

export function HomeExpandedSections() {
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [fieldRules, setFieldRules] = useState<CategoryFieldRule[]>([]);
  const [entries, setEntries] = useState<CategoryEntry[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [partnerLinks, setPartnerLinks] = useState<PartnerLink[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string>("scene");

  useEffect(() => {
    let cancelled = false;

    const loadSections = async () => {
      const [expandedData, fallbackResources, fallbackPartnerLinks] = await Promise.all([
        loadExpandedHomeData(),
        loadDisplayResources(),
        loadFallbackPartnerLinks(),
      ]);

      if (cancelled) {
        return;
      }

      setCategories(expandedData.categories);
      setFieldRules(expandedData.fieldRules);
      setEntries(expandedData.entries);
      setResources(
        expandedData.resources.length > 0
          ? expandedData.resources
          : fallbackResources.map((resource) => ({
              id: resource.id,
              slug: resource.slug,
              categoryId: null,
              titleFr: resource.titleFr,
              summaryFr: resource.summaryFr,
              qrImageUrl: resource.qrImageUrl || resource.coverImageUrl,
              externalUrl: resource.externalUrl,
              visible: resource.visible,
              sortOrder: resource.sortOrder,
              downloads: resource.downloads.map((download) => ({
                id: download.id,
                resourceId: resource.id,
                platform: download.platform,
                labelFr: download.labelFr,
                filePath: download.filePath,
                externalUrl: download.externalUrl,
                sortOrder: download.sortOrder,
              })),
            })),
      );
      setPartnerLinks(expandedData.partnerLinks.length > 0 ? expandedData.partnerLinks : fallbackPartnerLinks);
    };

    void loadSections();

    return () => {
      cancelled = true;
    };
  }, []);

  const customCategories = useMemo(
    () => categories.filter((category) => category.kind === "custom" && category.homepageVisible),
    [categories],
  );
  const resourceCategories = useMemo(
    () => categories.filter((category) => category.kind === "resource" && category.homepageVisible),
    [categories],
  );
  const uncategorizedResources = useMemo(
    () =>
      resources.filter(
        (resource) =>
          !resource.categoryId || !resourceCategories.some((category) => category.id === resource.categoryId),
      ),
    [resourceCategories, resources],
  );

  const floatingLinks = useMemo(() => {
    const links: FloatingSectionLink[] = [{ id: "scene", label: "图书专区" }];

    resourceCategories.forEach((category) => {
      links.push({
        id: `resource-${category.slug}`,
        label: category.titleFr || "工具天地",
      });
    });

    if (resourceCategories.length === 0 && uncategorizedResources.length > 0) {
      links.push({ id: "coin-ludique-outils", label: "工具天地" });
    }

    customCategories.forEach((category) => {
      links.push({
        id: `category-${category.slug}`,
        label: category.titleFr,
      });
    });

    if (partnerLinks.length > 0) {
      links.push({ id: "liens-partenaires", label: "友情链接" });
    }

    return links;
  }, [customCategories, partnerLinks.length, resourceCategories, uncategorizedResources.length]);

  const updateActiveSection = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const anchorLine = getHeaderOffset() + 8;
    const availableSections = floatingLinks
      .map((link) => ({
        id: link.id,
        element: document.getElementById(link.id),
      }))
      .filter((item): item is { id: string; element: HTMLElement } => Boolean(item.element));

    if (availableSections.length === 0) {
      return;
    }

    const containing = availableSections.find(({ element }) => {
      const rect = element.getBoundingClientRect();
      return rect.top <= anchorLine && rect.bottom > anchorLine;
    });

    if (containing) {
      setActiveSectionId(containing.id);
      return;
    }

    const passedSections = availableSections.filter(({ element }) => element.getBoundingClientRect().top <= anchorLine);

    if (passedSections.length > 0) {
      setActiveSectionId(passedSections[passedSections.length - 1].id);
      return;
    }

    setActiveSectionId(availableSections[0].id);
  }, [floatingLinks]);

  useEffect(() => {
    updateActiveSection();

    let ticking = false;

    const handleScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(() => {
        updateActiveSection();
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [updateActiveSection]);

  const handleAnchorClick = useCallback(
    (targetId: string) => {
      if (typeof window === "undefined") {
        return;
      }

      if (activeSectionId === targetId) {
        return;
      }

      const target = document.getElementById(targetId);

      if (!target) {
        return;
      }

      const top = window.scrollY + target.getBoundingClientRect().top - getHeaderOffset();

      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
    },
    [activeSectionId],
  );

  return (
    <>
      <aside className="home-floating-nav" aria-label="Navigation rapide des sections">
        {floatingLinks.map((link) => (
          <button
            key={link.id}
            type="button"
            className={activeSectionId === link.id ? "home-floating-nav-link active" : "home-floating-nav-link"}
            aria-label={link.label}
            aria-current={activeSectionId === link.id ? "true" : undefined}
            onClick={() => handleAnchorClick(link.id)}
          >
            <span className="home-floating-nav-dot" aria-hidden="true" />
            <span className="home-floating-nav-tooltip" role="tooltip">
              {link.label}
            </span>
          </button>
        ))}
      </aside>

      {resourceCategories.map((category) => {
        const categoryResources = resources.filter((resource) => resource.categoryId === category.id);

        return (
          <section className="panel glass home-section-panel" id={`resource-${category.slug}`} key={category.id}>
            <div className="split-line">
              <div>
                <div className="badge">
                  <Gamepad2 size={16} />
                  {category.titleFr}
                </div>
                <h2 className="section-title" style={{ marginTop: 18 }}>
                  {category.titleFr}
                </h2>
                <p className="section-caption">
                  {category.introFr ||
                    "Jeux a telecharger, mini outils bienveillants et ressources multi-plateformes pour prolonger l'experience du site."}
                </p>
              </div>
            </div>

            {categoryResources.length === 0 ? (
              <p className="tiny">Cette categorie est prete. Ajoutez maintenant ses premiers outils dans l&apos;admin.</p>
            ) : (
              <div className="home-resource-carousel" role="list">
                {categoryResources.map((resource) => (
                  <Link className="home-resource-carousel-card" href={`/outils/${resource.slug || resource.id}`} key={resource.id} role="listitem">
                    <div className="home-resource-carousel-image">
                      <Image
                        src={resource.qrImageUrl || "/images/logo.png"}
                        alt={resource.titleFr}
                        fill
                        sizes="280px"
                        className="carousel-cover-image"
                      />
                    </div>
                    <div className="home-resource-carousel-copy">
                      <strong>{resource.titleFr}</strong>
                      <p className="tiny">{resource.summaryFr || "Ouvrez la fiche pour voir les details et les options de telechargement."}</p>
                      <span className="home-resource-carousel-meta">
                        {resource.downloads.length > 0 ? `${resource.downloads.length} version(s)` : "Voir la fiche"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {resourceCategories.length === 0 && uncategorizedResources.length > 0 ? (
        <section className="panel glass home-section-panel" id="coin-ludique-outils">
          <div className="split-line">
            <div>
              <div className="badge">
                <Gamepad2 size={16} />
                Coin ludique & Outils
              </div>
              <h2 className="section-title" style={{ marginTop: 18 }}>
                Coin ludique & Outils
              </h2>
              <p className="section-caption">
                Jeux a telecharger, mini outils bienveillants et ressources multi-plateformes pour prolonger l&apos;experience du site.
              </p>
            </div>
          </div>
          <div className="home-resource-carousel" role="list">
            {uncategorizedResources.map((resource) => (
              <Link className="home-resource-carousel-card" href={`/outils/${resource.slug || resource.id}`} key={resource.id} role="listitem">
                <div className="home-resource-carousel-image">
                  <Image
                    src={resource.qrImageUrl || "/images/logo.png"}
                    alt={resource.titleFr}
                    fill
                    sizes="280px"
                    className="carousel-cover-image"
                  />
                </div>
                <div className="home-resource-carousel-copy">
                  <strong>{resource.titleFr}</strong>
                  <p className="tiny">{resource.summaryFr || "Ouvrez la fiche pour voir les details et les options de telechargement."}</p>
                  <span className="home-resource-carousel-meta">
                    {resource.downloads.length > 0 ? `${resource.downloads.length} version(s)` : "Voir la fiche"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {customCategories.map((category) => {
        const categoryRules = fieldRules
          .filter((rule) => rule.categoryId === category.id && rule.showInCard)
          .sort((left, right) => left.sortOrder - right.sortOrder);
        const categoryEntries = entries
          .filter((entry) => entry.categoryId === category.id && entry.visible)
          .sort((left, right) => left.sortOrder - right.sortOrder);
        const CategoryIcon = resolveCategoryIcon(category.iconName);

        return (
          <section className="panel glass home-section-panel" id={`category-${category.slug}`} key={category.id}>
            <div className="badge">
              <CategoryIcon size={16} />
              {category.titleFr}
            </div>
            <h2 className="section-title" style={{ marginTop: 18 }}>
              {category.titleFr}
            </h2>
            <p className="section-caption">
              {category.introFr || "Une nouvelle categorie modulable, pilotee depuis l'administration."}
            </p>

            {categoryEntries.length === 0 ? (
              <p className="tiny">Cette categorie est prete. Ajoutez maintenant ses premiers contenus dans l&apos;admin.</p>
            ) : (
              <div className="home-custom-grid">
                {categoryEntries.map((entry) => (
                  <article className="home-custom-card" key={entry.id}>
                    {entry.coverImageUrl ? (
                      <div className="home-custom-cover">
                        <Image
                          src={entry.coverImageUrl}
                          alt={entry.titleFr}
                          fill
                          sizes="320px"
                          className="home-custom-cover-image"
                        />
                      </div>
                    ) : null}
                    <div className="home-custom-copy">
                      <strong>{entry.titleFr}</strong>
                      {entry.subtitleFr ? <p className="tiny">{entry.subtitleFr}</p> : null}
                      {entry.summaryFr ? <p className="muted">{entry.summaryFr}</p> : null}
                      {categoryRules.length > 0 ? (
                        <ul className="home-custom-meta">
                          {categoryRules.map((rule) => renderEntryField(rule, entry))}
                        </ul>
                      ) : null}
                      <div className="actions-row">
                        {entry.externalUrl ? (
                          <a className="cta-button secondary" href={entry.externalUrl} target="_blank" rel="noreferrer">
                            Ouvrir
                          </a>
                        ) : null}
                        {entry.fileUrl ? (
                          <a className="pill-button" href={entry.fileUrl} target="_blank" rel="noreferrer">
                            Telecharger
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {partnerLinks.length > 0 ? (
        <section className="panel glass home-section-panel" id="liens-partenaires">
          <div className="badge">
            <Link2 size={16} />
            Liens partenaires
          </div>
          <div className="partner-links-grid" style={{ marginTop: 20 }}>
            {partnerLinks.map((link) => (
              <a
                key={link.id}
                href={link.targetUrl}
                target="_blank"
                rel="noreferrer"
                className="partner-link-icon"
                title={link.titleFr}
              >
                <Image
                  src={link.iconUrl}
                  alt={link.titleFr}
                  width={48}
                  height={48}
                  className="partner-link-image"
                />
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
