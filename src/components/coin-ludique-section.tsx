"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Gamepad2, QrCode } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { hasSupabaseConfig } from "@/lib/site-config";

type ResourceItemRow = {
  id: string;
  slug: string | null;
  title_fr: string | null;
  summary_fr: string | null;
  qr_image_url: string | null;
  external_url: string | null;
  visible: boolean | null;
  sort_order: number | null;
};

type ResourceItemFileRow = {
  id: string;
  resource_id: string;
  platform: string | null;
  label_fr: string | null;
  file_url: string | null;
  file_path?: string | null;
  external_url: string | null;
  sort_order: number | null;
};

type ResourceDownload = {
  id: string;
  platform: string;
  labelFr: string;
  href: string;
  sortOrder: number;
};

type CoinLudiqueCard = {
  id: string;
  titleFr: string;
  summaryFr: string;
  qrImageUrl: string;
  externalUrl: string;
  sortOrder: number;
  downloads: ResourceDownload[];
};

const platformOrder = ["通用", "Mac", "Windows", "Linux", "手机"] as const;

const sampleResources: CoinLudiqueCard[] = [
  {
    id: "sample-loto",
    titleFr: "Mini loto des sons doux",
    summaryFr:
      "Un petit jeu a imprimer ou ouvrir sur ecran pour jouer avec les sons et les mots du quotidien, sans pression.",
    qrImageUrl: "/images/logo.png",
    externalUrl: "https://visdar.fr/catalogue",
    sortOrder: 10,
    downloads: [
      {
        id: "sample-loto-common",
        platform: "通用",
        labelFr: "Pack ZIP",
        href: "https://visdar.fr/catalogue",
        sortOrder: 10,
      },
      {
        id: "sample-loto-phone",
        platform: "手机",
        labelFr: "Version mobile",
        href: "https://visdar.fr/catalogue",
        sortOrder: 20,
      },
    ],
  },
  {
    id: "sample-cartes",
    titleFr: "Cartes visuelles du quotidien",
    summaryFr:
      "Un petit outil numerique pour revoir des images et des expressions utiles, avec une prise en main tres simple.",
    qrImageUrl: "/images/logo.png",
    externalUrl: "https://visdar.fr/catalogue",
    sortOrder: 20,
    downloads: [
      {
        id: "sample-cartes-mac",
        platform: "Mac",
        labelFr: "App Mac",
        href: "https://visdar.fr/catalogue",
        sortOrder: 10,
      },
      {
        id: "sample-cartes-win",
        platform: "Windows",
        labelFr: "App Windows",
        href: "https://visdar.fr/catalogue",
        sortOrder: 20,
      },
    ],
  },
];

function sortDownloads(left: ResourceDownload, right: ResourceDownload) {
  const leftIndex = platformOrder.indexOf(left.platform as (typeof platformOrder)[number]);
  const rightIndex = platformOrder.indexOf(right.platform as (typeof platformOrder)[number]);
  const normalizedLeft = leftIndex >= 0 ? leftIndex : Number.MAX_SAFE_INTEGER;
  const normalizedRight = rightIndex >= 0 ? rightIndex : Number.MAX_SAFE_INTEGER;

  return normalizedLeft - normalizedRight || left.sortOrder - right.sortOrder || left.labelFr.localeCompare(right.labelFr);
}

function mapResources(rows: ResourceItemRow[], fileRows: ResourceItemFileRow[]) {
  return rows
    .filter((row) => row.visible !== false)
    .map<CoinLudiqueCard>((row) => {
      const downloads = fileRows
        .filter((fileRow) => fileRow.resource_id === row.id)
        .map<ResourceDownload>((fileRow) => ({
          id: fileRow.id,
          platform: fileRow.platform || "通用",
          labelFr: fileRow.label_fr || "Telecharger",
          href: fileRow.file_url || fileRow.file_path || fileRow.external_url || "",
          sortOrder: fileRow.sort_order ?? 0,
        }))
        .filter((entry) => entry.href)
        .sort(sortDownloads);

      return {
        id: row.id,
        titleFr: row.title_fr || "Ressource ludique",
        summaryFr: row.summary_fr || "Une ressource numerique douce a telecharger pour prolonger l'experience.",
        qrImageUrl: row.qr_image_url || "",
        externalUrl: row.external_url || "",
        sortOrder: row.sort_order ?? 0,
        downloads,
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.titleFr.localeCompare(right.titleFr));
}

export function CoinLudiqueSection() {
  const [resources, setResources] = useState<CoinLudiqueCard[]>(sampleResources);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResources = async () => {
      if (!hasSupabaseConfig) {
        setLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        setLoading(false);
        return;
      }

      const [resourcesResult, filesResult] = await Promise.all([
        supabase
          .from("resource_items")
          .select("id, slug, title_fr, summary_fr, qr_image_url, external_url, visible, sort_order")
          .eq("visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("resource_item_files")
          .select("id, resource_id, platform, label_fr, file_url, file_path, external_url, sort_order")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      const nextResources = mapResources(
        (resourcesResult.data || []) as ResourceItemRow[],
        (filesResult.data || []) as ResourceItemFileRow[],
      );

      if (nextResources.length > 0) {
        setResources(nextResources);
      }

      setLoading(false);
    };

    void loadResources();
  }, []);

  const sectionCaption = useMemo(
    () =>
      "Des mini-jeux, petits outils et ressources numeriques penses pour apprendre avec legerete, sur l'appareil qui vous convient.",
    [],
  );

  return (
    <section className="panel glass home-section-panel" id="coin-ludique-outils">
      <div className="coin-ludique-header">
        <div>
          <div className="badge">
            <Gamepad2 size={16} />
            Coin ludique & Outils
          </div>
          <h2 className="section-title" style={{ marginTop: 18 }}>
            Coin ludique & Outils
          </h2>
          <p className="section-caption">{sectionCaption}</p>
        </div>
      </div>

      <div className="home-resource-grid">
        {resources.map((resource) => (
          <article className="home-resource-card coin-ludique-card" key={resource.id}>
            <div className="home-resource-header">
              <div className="coin-ludique-copy">
                <strong>{resource.titleFr}</strong>
                <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
                  {resource.summaryFr}
                </p>
              </div>

              <div className="coin-ludique-qr-wrap">
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
                ) : (
                  <div className="coin-ludique-qr-placeholder">
                    <QrCode size={28} />
                    <span className="tiny">QR a venir</span>
                  </div>
                )}
              </div>
            </div>

            <div className="coin-ludique-downloads">
              {resource.downloads.length > 0 ? (
                resource.downloads.map((download) => (
                  <a
                    className="coin-ludique-download-button"
                    key={download.id}
                    href={download.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="coin-ludique-platform">{download.platform}</span>
                    <span>{download.labelFr}</span>
                    <Download size={15} />
                  </a>
                ))
              ) : (
                <div className="coin-ludique-empty tiny">
                  Les telechargements arriveront ici des que la premiere ressource sera ajoutee.
                </div>
              )}
            </div>

            {resource.externalUrl ? (
              <div className="coin-ludique-actions">
                <a className="cta-button secondary" href={resource.externalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  Ouvrir le lien externe
                </a>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {loading ? <p className="tiny" style={{ marginTop: 14 }}>Chargement des ressources...</p> : null}
    </section>
  );
}
