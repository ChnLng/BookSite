"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Blocks,
  Gamepad2,
  LibraryBig,
  Link2,
  Rocket,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  loadExpandedHomeData,
  type CategoryEntry,
  type CategoryFieldRule,
  type HomeCategory,
  type PartnerLink,
  type ResourceItem,
} from "@/lib/home-sections";

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

  useEffect(() => {
    void loadExpandedHomeData().then((result) => {
      setCategories(result.categories);
      setFieldRules(result.fieldRules);
      setEntries(result.entries);
      setResources(result.resources);
      setPartnerLinks(result.partnerLinks);
    });
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
    const links: FloatingSectionLink[] = [{ id: "scene", label: "Livres" }];

    resourceCategories.forEach((category) => {
      links.push({
        id: `resource-${category.slug}`,
        label: category.titleFr,
      });
    });

    if (resourceCategories.length === 0 && uncategorizedResources.length > 0) {
      links.push({ id: "coin-ludique-outils", label: "Coin ludique" });
    }

    customCategories.forEach((category) => {
      links.push({
        id: `category-${category.slug}`,
        label: category.titleFr,
      });
    });

    if (partnerLinks.length > 0) {
      links.push({ id: "liens-partenaires", label: "Liens" });
    }

    links.push({ id: "footer-rules", label: "Infos" });
    return links;
  }, [customCategories, partnerLinks.length, resourceCategories, uncategorizedResources.length]);

  return (
    <>
      <aside className="home-floating-nav" aria-label="Navigation rapide des sections">
        {floatingLinks.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            className="home-floating-nav-link"
            aria-label={link.label}
            title={link.label}
          >
            <span className="home-floating-nav-dot" aria-hidden="true" />
          </a>
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
