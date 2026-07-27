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
import { PartnerLinksSection } from "@/components/partner-links-section";
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
  targetId: string;
  resetToTop?: boolean;
};

type RenderedSection =
  | {
      id: string;
      label: string;
      kind: "resource";
      category: HomeCategory | null;
      resources: ResourceItem[];
    }
  | {
      id: string;
      label: string;
      kind: "custom";
      category: HomeCategory;
      categoryRules: CategoryFieldRule[];
      categoryEntries: CategoryEntry[];
    }
  | {
      id: string;
      label: string;
      kind: "partner";
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

  const resourceCategories = useMemo(
    () => categories.filter((category) => category.kind === "resource" && category.homepageVisible),
    [categories],
  );
  const customCategories = useMemo(
    () => categories.filter((category) => category.kind === "custom" && category.homepageVisible),
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

  const renderedSections = useMemo<RenderedSection[]>(() => {
    const sections: RenderedSection[] = [];

    resourceCategories.forEach((category) => {
      const categoryResources = resources.filter((resource) => resource.categoryId === category.id);
      sections.push({
        id: `resource-${category.slug}`,
        label: category.titleFr || "Outils",
        kind: "resource",
        category,
        resources: categoryResources,
      });
    });

    if (resourceCategories.length === 0 && uncategorizedResources.length > 0) {
      sections.push({
        id: "coin-ludique-outils",
        label: "Coin ludique",
        kind: "resource",
        category: null,
        resources: uncategorizedResources,
      });
    }

    customCategories.forEach((category) => {
      sections.push({
        id: `category-${category.slug}`,
        label: category.titleFr || "Section",
        kind: "custom",
        category,
        categoryRules: fieldRules
          .filter((rule) => rule.categoryId === category.id && rule.showInCard)
          .sort((left, right) => left.sortOrder - right.sortOrder),
        categoryEntries: entries
          .filter((entry) => entry.categoryId === category.id && entry.visible)
          .sort((left, right) => left.sortOrder - right.sortOrder),
      });
    });

    if (partnerLinks.length > 0) {
      sections.push({
        id: "liens-partenaires",
        label: "Liens partenaires",
        kind: "partner",
      });
    }

    return sections;
  }, [customCategories, entries, fieldRules, partnerLinks.length, resourceCategories, resources, uncategorizedResources]);

  const floatingLinks = useMemo<FloatingSectionLink[]>(() => {
    return [
      {
        id: "scene",
        label: "Albums illustres bilingues",
        targetId: "scene",
        resetToTop: true,
      },
      ...renderedSections.map((section) => ({
        id: section.id,
        label: section.label,
        targetId: section.id,
      })),
    ];
  }, [renderedSections]);

  const getAvailableSections = useCallback(
    () =>
      floatingLinks
        .map((link) => ({
          ...link,
          element: link.resetToTop ? null : document.getElementById(link.targetId),
        }))
        .filter((item) => item.resetToTop || Boolean(item.element)),
    [floatingLinks],
  );

  const getTargetScrollTop = useCallback((link: FloatingSectionLink) => {
    if (typeof window === "undefined") {
      return 0;
    }

    if (link.resetToTop) {
      return 0;
    }

    const target = document.getElementById(link.targetId);

    if (!target) {
      return null;
    }

    return Math.max(0, window.scrollY + target.getBoundingClientRect().top - getHeaderOffset());
  }, []);

  const updateActiveSection = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.scrollY <= 8) {
      setActiveSectionId("scene");
      return;
    }

    const anchorLine = getHeaderOffset() + 8;
    const availableSections = getAvailableSections();

    if (availableSections.length === 0) {
      return;
    }

    const containing = availableSections.find((item) => {
      if (item.resetToTop || !item.element) {
        return false;
      }

      const rect = item.element.getBoundingClientRect();
      return rect.top <= anchorLine && rect.bottom > anchorLine;
    });

    if (containing) {
      setActiveSectionId(containing.id);
      return;
    }

    const passedSections = availableSections.filter((item) => {
      if (item.resetToTop || !item.element) {
        return false;
      }

      return item.element.getBoundingClientRect().top <= anchorLine;
    });

    if (passedSections.length > 0) {
      setActiveSectionId(passedSections[passedSections.length - 1].id);
      return;
    }

    setActiveSectionId("scene");
  }, [getAvailableSections]);

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
    (link: FloatingSectionLink) => {
      if (typeof window === "undefined") {
        return;
      }

      if (link.resetToTop && window.scrollY <= 1) {
        return;
      }

      if (!link.resetToTop && activeSectionId === link.id) {
        return;
      }

      const top = getTargetScrollTop(link);

      if (top == null) {
        return;
      }

      window.scrollTo({
        top,
        behavior: "smooth",
      });
    },
    [activeSectionId, getTargetScrollTop],
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
            onClick={() => handleAnchorClick(link)}
          >
            <span className="home-floating-nav-dot" aria-hidden="true" />
            <span className="home-floating-nav-tooltip" role="tooltip">
              {link.label}
            </span>
          </button>
        ))}
      </aside>

      {renderedSections.map((section) => {
        if (section.kind === "resource") {
          return (
            <section className="panel glass home-section-panel" id={section.id} key={section.id}>
              <div className="section-heading">
                <span className="section-heading-icon" aria-hidden="true">
                  <Gamepad2 size={17} />
                </span>
                <h2 className="section-heading-text">{section.label}</h2>
              </div>
              <p className="section-caption">
                {section.category?.introFr ||
                  "Jeux a telecharger, mini outils bienveillants et ressources multi-plateformes pour prolonger l'experience du site."}
              </p>

              {section.resources.length === 0 ? (
                <p className="tiny">Cette categorie est prete. Ajoutez maintenant ses premiers outils dans l&apos;admin.</p>
              ) : (
                <div className="home-resource-carousel" role="list">
                  {section.resources.map((resource) => (
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
        }

        if (section.kind === "custom") {
          const CategoryIcon = resolveCategoryIcon(section.category.iconName);

          return (
            <section className="panel glass home-section-panel" id={section.id} key={section.id}>
              <div className="section-heading">
                <span className="section-heading-icon" aria-hidden="true">
                  <CategoryIcon size={17} />
                </span>
                <h2 className="section-heading-text">{section.label}</h2>
              </div>
              <p className="section-caption">
                {section.category.introFr || "Une nouvelle categorie modulable, pilotee depuis l'administration."}
              </p>

              {section.categoryEntries.length === 0 ? (
                <p className="tiny">Cette categorie est prete. Ajoutez maintenant ses premiers contenus dans l&apos;admin.</p>
              ) : (
                <div className="home-custom-grid">
                  {section.categoryEntries.map((entry) => (
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
                        {section.categoryRules.length > 0 ? (
                          <ul className="home-custom-meta">
                            {section.categoryRules.map((rule) => renderEntryField(rule, entry))}
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
        }

        return <PartnerLinksSection key={section.id} sectionId={section.id} title={section.label} />;
      })}
    </>
  );
}
