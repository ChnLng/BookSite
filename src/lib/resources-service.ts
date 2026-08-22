import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isUuid } from "@/lib/database-identifiers";
import { richTextToPlainText } from "@/lib/rich-text";

type ResourceItemRow = {
  id: string;
  slug: string | null;
  title_fr: string | null;
  homepage_summary_fr?: string | null;
  summary_fr: string | null;
  cover_image_url: string | null;
  qr_image_url: string | null;
  external_url: string | null;
  visible: boolean | null;
  sort_order: number | null;
  price_eur: number | string | null;
};

type ResourceItemFileRow = {
  id: string;
  resource_id: string;
  platform: string | null;
  label_fr: string | null;
  file_url?: string | null;
  file_path?: string | null;
  external_url: string | null;
  sort_order: number | null;
};

export type DisplayResourceDownload = {
  id: string;
  platform: string;
  labelFr: string;
  filePath: string;
  externalUrl: string;
  sortOrder: number;
};

export type DisplayResource = {
  id: string;
  slug: string;
  titleFr: string;
  homepageSummaryFr: string;
  summaryFr: string;
  coverImageUrl: string;
  qrImageUrl: string;
  externalUrl: string;
  visible: boolean;
  sortOrder: number;
  priceEur: number;
  downloads: DisplayResourceDownload[];
  titleRichFr?: string;
  summaryRichFr?: string;
};

const platformOrder = ["通用", "Mac", "Windows", "Linux", "手机"] as const;
// Keep homepage tools synchronized with admin edits instead of showing a stale list.
const RESOURCE_CACHE_TTL_MS = 0;
let resourceListCache: { expiresAt: number; data: DisplayResource[] } | null = null;
let resourceListInFlight: Promise<DisplayResource[]> | null = null;

const sampleResources: DisplayResource[] = [
  {
    id: "mini-loto-sons",
    slug: "mini-loto-sons",
    titleFr: "Mini loto des sons doux",
    homepageSummaryFr:
      "Un aperçu tout doux pour découvrir les sons, les images et quelques petits mots du quotidien.",
    summaryFr:
      "Un mini-jeu numerique tres simple pour revoir les sons, les images et les petits mots du quotidien en douceur.",
    coverImageUrl: "/images/logo.png",
    qrImageUrl: "/images/logo.png",
    externalUrl: "https://visdar.fr/catalogue",
    visible: true,
    sortOrder: 10,
    priceEur: 0,
    downloads: [
      {
        id: "mini-loto-common",
        platform: "通用",
        labelFr: "Pack ZIP",
        filePath: "demo/mini-loto-sons.zip",
        externalUrl: "",
        sortOrder: 10,
      },
      {
        id: "mini-loto-phone",
        platform: "手机",
        labelFr: "Version mobile",
        filePath: "demo/mini-loto-sons-mobile.zip",
        externalUrl: "",
        sortOrder: 20,
      },
    ],
  },
  {
    id: "cartes-vie-calme",
    slug: "cartes-vie-calme",
    titleFr: "Cartes visuelles du quotidien",
    homepageSummaryFr:
      "Des cartes simples et rassurantes pour revoir des mots utiles, à son rythme.",
    summaryFr:
      "Un petit outil a garder sous la main pour revoir calmement des mots et des gestes utiles, sur ordinateur ou mobile.",
    coverImageUrl: "/images/logo.png",
    qrImageUrl: "/images/logo.png",
    externalUrl: "https://visdar.fr/catalogue",
    visible: true,
    sortOrder: 20,
    priceEur: 2.99,
    downloads: [
      {
        id: "cartes-mac",
        platform: "Mac",
        labelFr: "Version Mac",
        filePath: "demo/cartes-vie-calme-mac.zip",
        externalUrl: "",
        sortOrder: 10,
      },
      {
        id: "cartes-win",
        platform: "Windows",
        labelFr: "Version Windows",
        filePath: "demo/cartes-vie-calme-win.zip",
        externalUrl: "",
        sortOrder: 20,
      },
    ],
  },
];

function normalizePrice(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value || "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampHomepageSummary(value: string, maxLength = 150) {
  const normalized = richTextToPlainText(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

function sortDownloads(left: DisplayResourceDownload, right: DisplayResourceDownload) {
  const leftIndex = platformOrder.indexOf(left.platform as (typeof platformOrder)[number]);
  const rightIndex = platformOrder.indexOf(right.platform as (typeof platformOrder)[number]);
  const normalizedLeft = leftIndex >= 0 ? leftIndex : Number.MAX_SAFE_INTEGER;
  const normalizedRight = rightIndex >= 0 ? rightIndex : Number.MAX_SAFE_INTEGER;

  return normalizedLeft - normalizedRight || left.sortOrder - right.sortOrder || left.labelFr.localeCompare(right.labelFr);
}

function mapResources(rows: ResourceItemRow[], fileRows: ResourceItemFileRow[]) {
  return rows
    .filter((row) => row.visible !== false)
    .map<DisplayResource>((row) => {
      const downloads = fileRows
        .filter((fileRow) => fileRow.resource_id === row.id)
        .map<DisplayResourceDownload>((fileRow) => ({
          id: fileRow.id,
          platform: fileRow.platform || "通用",
          labelFr: fileRow.label_fr || "Télécharger",
          filePath: fileRow.file_path || fileRow.file_url || "protected",
          externalUrl: fileRow.external_url || "",
          sortOrder: fileRow.sort_order ?? 0,
        }))
        .filter((entry) => entry.filePath || entry.externalUrl)
        .sort(sortDownloads);

      const titleRichFr = row.title_fr || "Ressource ludique";
      const summaryRichFr = row.summary_fr || "Une ressource numerique douce a decouvrir.";
      const homepageSummaryRichFr = row.homepage_summary_fr || summaryRichFr;

      return {
        id: row.id,
        slug: row.slug || row.id,
        titleFr: richTextToPlainText(titleRichFr),
        homepageSummaryFr: clampHomepageSummary(homepageSummaryRichFr),
        summaryFr: richTextToPlainText(summaryRichFr),
        coverImageUrl: row.cover_image_url || row.qr_image_url || "/images/logo.png",
        qrImageUrl: row.qr_image_url || row.cover_image_url || "/images/logo.png",
        externalUrl: row.external_url || "",
        visible: row.visible !== false,
        sortOrder: row.sort_order ?? 0,
        priceEur: normalizePrice(row.price_eur),
        downloads,
        titleRichFr,
        summaryRichFr,
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.titleFr.localeCompare(right.titleFr));
}

function findDisplayResourceByRef(resources: DisplayResource[], idOrSlug: string) {
  return resources.find((resource) => resource.id === idOrSlug || resource.slug === idOrSlug) || null;
}

async function fetchDisplayResources() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return sampleResources;
  }

  const resourceSelect = "id, slug, title_fr, homepage_summary_fr, summary_fr, cover_image_url, qr_image_url, external_url, visible, sort_order, price_eur";
  const legacyResourceSelect = "id, slug, title_fr, summary_fr, cover_image_url, qr_image_url, external_url, visible, sort_order, price_eur";
  const [initialResourcesResult, filesResult] = await Promise.all([
    supabase.from("resource_items").select(resourceSelect).eq("visible", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    supabase
      .from("resource_item_files")
      .select("id, resource_id, platform, label_fr, external_url, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const resourcesResult = initialResourcesResult.error && /homepage_summary_fr|schema cache|column/i.test(initialResourcesResult.error.message)
    ? await supabase.from("resource_items").select(legacyResourceSelect).eq("visible", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true })
    : initialResourcesResult;

  const mapped = mapResources(
    (resourcesResult.data || []) as ResourceItemRow[],
    (filesResult.data || []) as ResourceItemFileRow[],
  );

  return resourcesResult.error ? sampleResources : mapped;
}

export async function loadDisplayResources() {
  const now = Date.now();

  if (resourceListCache && resourceListCache.expiresAt > now) {
    return resourceListCache.data;
  }

  if (resourceListInFlight) {
    return resourceListInFlight;
  }

  resourceListInFlight = fetchDisplayResources()
    .then((data) => {
      resourceListCache = {
        data,
        expiresAt: Date.now() + RESOURCE_CACHE_TTL_MS,
      };
      return data;
    })
    .finally(() => {
      resourceListInFlight = null;
    });

  return resourceListInFlight;
}

export async function resolveDisplayResourceById(idOrSlug: string) {
  const resources = await loadDisplayResources();
  const cachedMatch = findDisplayResourceByRef(resources, idOrSlug);

  if (cachedMatch) {
    return cachedMatch;
  }

  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const resourceQuery = supabase
      .from("resource_items")
      .select("id, slug, title_fr, homepage_summary_fr, summary_fr, cover_image_url, qr_image_url, external_url, visible, sort_order, price_eur")
      .limit(1);
  const [resourceResult, fileResult] = await Promise.all([
    (isUuid(idOrSlug) ? resourceQuery.eq("id", idOrSlug) : resourceQuery.eq("slug", idOrSlug)).maybeSingle(),
    supabase
      .from("resource_item_files")
      .select("id, resource_id, platform, label_fr, external_url, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (!resourceResult.data) {
    return null;
  }

  const mapped = mapResources(
    [resourceResult.data as ResourceItemRow],
    (fileResult.data || []) as ResourceItemFileRow[],
  )[0] || null;

  if (mapped && resourceListCache && resourceListCache.expiresAt > Date.now()) {
    resourceListCache = {
      ...resourceListCache,
      data: [...resourceListCache.data.filter((resource) => resource.id !== mapped.id), mapped],
    };
  }

  return mapped;
}
