"use client";

import Image from "next/image";
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
  const resourceCategory = resourceCategories[0] || null;

  const floatingLinks = useMemo(() => {
    const links: FloatingSectionLink[] = [
      { id: "scene", label: "Livres" },
      { id: "donation", label: "Donation" },
    ];

    if (resourceCategory || resources.length > 0) {
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
  }, [customCategories, partnerLinks.length, resourceCategory, resources.length]);

  return (
    <>
      <aside className="home-floating-nav" aria-label="Navigation rapide des sections">
        {floatingLinks.map((link) => (
          <a key={link.id} href={`#${link.id}`} className="home-floating-nav-link">
            {link.label}
          </a>
        ))}
      </aside>

      {resourceCategory || resources.length > 0 ? (
        <section className="panel glass home-section-panel" id="coin-ludique-outils">
          <div className="split-line">
            <div>
              <div className="badge">
                <Gamepad2 size={16} />
                {resourceCategory?.titleFr || "Coin ludique & Outils"}
              </div>
              <h2 className="section-title" style={{ marginTop: 18 }}>
                Coin ludique & Outils
              </h2>
              <p className="section-caption">
                {resourceCategory?.introFr ||
                  "Jeux a telecharger, mini outils bienveillants et ressources multi-plateformes pour prolonger l'experience du site."}
              </p>
            </div>
          </div>

          {resources.length === 0 ? (
            <p className="tiny">Le coin ludique est pret a accueillir vos premiers outils.</p>
          ) : (
            <div className="home-resource-grid">
              {resources.map((resource) => (
                <article className="home-resource-card" key={resource.id}>
                  <div className="home-resource-header">
                    <div>
                      <strong>{resource.titleFr}</strong>
                      <p className="tiny" style={{ marginTop: 8, marginBottom: 0 }}>
                        {resource.summaryFr}
                      </p>
                    </div>
                    {resource.qrImageUrl ? (
                      <div className="home-resource-qr">
                        <Image
                          src={resource.qrImageUrl}
                          alt={resource.titleFr}
                          width={88}
                          height={88}
                          className="home-resource-qr-image"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="home-resource-downloads">
                    {resource.downloads
                      .filter((variant) => variant.externalUrl || variant.filePath)
                      .map((variant) => (
                        <a
                          className="pill-button"
                          key={variant.id}
                          href={variant.externalUrl || variant.filePath}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {variant.labelFr} · {variant.platform}
                        </a>
                      ))}
                    {resource.externalUrl ? (
                      <a className="cta-button secondary" href={resource.externalUrl} target="_blank" rel="noreferrer">
                        Telechargement externe
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
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
