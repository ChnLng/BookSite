import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { hasSupabaseConfig } from "@/lib/site-config";

export type HomeCategory = {
  id: string;
  slug: string;
  titleFr: string;
  titleZh: string;
  kind: "book" | "resource" | "custom";
  homepageVisible: boolean;
  homepageSortOrder: number;
  iconName: string;
  introFr: string;
  allowedFileTypes: string[];
};

export type CategoryFieldRule = {
  id: string;
  categoryId: string;
  fieldKey: string;
  labelFr: string;
  fieldType: "text" | "textarea" | "url" | "file" | "image" | "number" | "boolean";
  sortOrder: number;
  required: boolean;
  showInCard: boolean;
  placeholderFr: string;
};

export type CategoryEntry = {
  id: string;
  categoryId: string;
  titleFr: string;
  subtitleFr: string;
  summaryFr: string;
  coverImageUrl: string;
  externalUrl: string;
  fileUrl: string;
  payload: Record<string, unknown>;
  sortOrder: number;
  visible: boolean;
};

export type ResourceDownloadVariant = {
  id: string;
  resourceId: string;
  platform: string;
  labelFr: string;
  filePath: string;
  externalUrl: string;
  sortOrder: number;
};

export type ResourceItem = {
  id: string;
  slug: string;
  categoryId: string | null;
  titleFr: string;
  summaryFr: string;
  qrImageUrl: string;
  externalUrl: string;
  priceEur: number;
  visible: boolean;
  sortOrder: number;
  downloads: ResourceDownloadVariant[];
};

export type PartnerLink = {
  id: string;
  titleFr: string;
  iconUrl: string;
  targetUrl: string;
  tooltipText: string;
  sortOrder: number;
  visible: boolean;
};

type CategoryRow = {
  id: string;
  slug: string | null;
  title_fr: string | null;
  title_zh: string | null;
  kind?: string | null;
  homepage_visible?: boolean | null;
  homepage_sort_order?: number | null;
  icon_name?: string | null;
  intro_fr?: string | null;
  allowed_file_types?: string[] | null;
};

type CategoryFieldRuleRow = {
  id: string;
  category_id: string;
  field_key: string;
  label_fr: string | null;
  field_type: string | null;
  sort_order: number | null;
  required: boolean | null;
  show_in_card: boolean | null;
  placeholder_fr: string | null;
};

type CategoryEntryRow = {
  id: string;
  category_id: string;
  title_fr: string | null;
  subtitle_fr: string | null;
  summary_fr: string | null;
  cover_image_url: string | null;
  external_url: string | null;
  file_url: string | null;
  payload: Record<string, unknown> | null;
  sort_order: number | null;
  visible: boolean | null;
};

type ResourceItemRow = {
  id: string;
  slug: string | null;
  category_id: string | null;
  title_fr: string | null;
  summary_fr: string | null;
  qr_image_url: string | null;
  external_url: string | null;
  price_eur: number | string | null;
  visible: boolean | null;
  sort_order: number | null;
};

type ResourceFileRow = {
  id: string;
  resource_id: string;
  platform: string | null;
  label_fr: string | null;
  file_path: string | null;
  external_url: string | null;
  sort_order: number | null;
};

type PartnerLinkRow = {
  id: string;
  title_fr: string | null;
  icon_url: string | null;
  target_url: string | null;
  tooltip_text: string | null;
  sort_order: number | null;
  visible: boolean | null;
};

function mapCategory(row: CategoryRow): HomeCategory {
  return {
    id: row.id,
    slug: row.slug || row.id,
    titleFr: row.title_fr || "Section",
    titleZh: row.title_zh || "",
    kind: row.kind === "resource" || row.kind === "custom" ? row.kind : "book",
    homepageVisible: Boolean(row.homepage_visible),
    homepageSortOrder: row.homepage_sort_order ?? 999,
    iconName: row.icon_name || "sparkles",
    introFr: row.intro_fr || "",
    allowedFileTypes: row.allowed_file_types || [],
  };
}

function mapRule(row: CategoryFieldRuleRow): CategoryFieldRule {
  const fieldType = row.field_type || "text";

  return {
    id: row.id,
    categoryId: row.category_id,
    fieldKey: row.field_key,
    labelFr: row.label_fr || row.field_key,
    fieldType:
      fieldType === "textarea" ||
      fieldType === "url" ||
      fieldType === "file" ||
      fieldType === "image" ||
      fieldType === "number" ||
      fieldType === "boolean"
        ? fieldType
        : "text",
    sortOrder: row.sort_order ?? 0,
    required: Boolean(row.required),
    showInCard: Boolean(row.show_in_card),
    placeholderFr: row.placeholder_fr || "",
  };
}

function mapEntry(row: CategoryEntryRow): CategoryEntry {
  return {
    id: row.id,
    categoryId: row.category_id,
    titleFr: row.title_fr || "Contenu",
    subtitleFr: row.subtitle_fr || "",
    summaryFr: row.summary_fr || "",
    coverImageUrl: row.cover_image_url || "",
    externalUrl: row.external_url || "",
    fileUrl: row.file_url || "",
    payload: row.payload || {},
    sortOrder: row.sort_order ?? 0,
    visible: row.visible !== false,
  };
}

function mapVariant(row: ResourceFileRow): ResourceDownloadVariant {
  return {
    id: row.id,
    resourceId: row.resource_id,
    platform: row.platform || "通用",
    labelFr: row.label_fr || "Version",
    filePath: row.file_path || "",
    externalUrl: row.external_url || "",
    sortOrder: row.sort_order ?? 0,
  };
}

function mapResource(row: ResourceItemRow, variants: ResourceDownloadVariant[]): ResourceItem {
  return {
    id: row.id,
    slug: row.slug || row.id,
    categoryId: row.category_id || null,
    titleFr: row.title_fr || "Ressource",
    summaryFr: row.summary_fr || "",
    qrImageUrl: row.qr_image_url || "",
    externalUrl: row.external_url || "",
    priceEur: Number(row.price_eur || 0),
    visible: row.visible !== false,
    sortOrder: row.sort_order ?? 0,
    downloads: variants.sort((left, right) => left.sortOrder - right.sortOrder),
  };
}

function mapPartnerLink(row: PartnerLinkRow): PartnerLink {
  return {
    id: row.id,
    titleFr: row.title_fr || "Lien",
    iconUrl: row.icon_url || "",
    targetUrl: row.target_url || "",
    tooltipText: row.tooltip_text || row.title_fr || "Lien partenaire",
    sortOrder: row.sort_order ?? 0,
    visible: row.visible !== false,
  };
}

export async function loadExpandedHomeData() {
  const supabase = getSupabaseBrowserClient();

  if (!hasSupabaseConfig || !supabase) {
    return {
      categories: [] as HomeCategory[],
      fieldRules: [] as CategoryFieldRule[],
      entries: [] as CategoryEntry[],
      resources: [] as ResourceItem[],
      partnerLinks: [] as PartnerLink[],
    };
  }

  const [categoriesResult, rulesResult, entriesResult, resourcesResult, variantsResult, partnerLinksResult] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, slug, title_fr, title_zh, kind, homepage_visible, homepage_sort_order, icon_name, intro_fr, allowed_file_types")
        .eq("homepage_visible", true)
        .order("homepage_sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("category_field_rules")
        .select("id, category_id, field_key, label_fr, field_type, sort_order, required, show_in_card, placeholder_fr")
        .order("sort_order", { ascending: true }),
      supabase
        .from("category_entries")
        .select("id, category_id, title_fr, subtitle_fr, summary_fr, cover_image_url, external_url, file_url, payload, sort_order, visible")
        .eq("visible", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("resource_items")
        .select("id, slug, category_id, title_fr, summary_fr, qr_image_url, external_url, price_eur, visible, sort_order")
        .eq("visible", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("resource_item_files")
        .select("id, resource_id, platform, label_fr, file_path, external_url, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("partner_links")
        .select("id, title_fr, icon_url, target_url, tooltip_text, sort_order, visible")
        .eq("visible", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  const categories = ((categoriesResult.data || []) as CategoryRow[]).map(mapCategory);
  const fieldRules = ((rulesResult.data || []) as CategoryFieldRuleRow[]).map(mapRule);
  const entries = ((entriesResult.data || []) as CategoryEntryRow[]).map(mapEntry);
  const variants = ((variantsResult.data || []) as ResourceFileRow[]).map(mapVariant);
  const resources = ((resourcesResult.data || []) as ResourceItemRow[]).map((row) =>
    mapResource(
      row,
      variants.filter((variant) => variant.resourceId === row.id),
    ),
  );
  const partnerLinks = ((partnerLinksResult.data || []) as PartnerLinkRow[]).map(mapPartnerLink);

  return {
    categories,
    fieldRules,
    entries,
    resources,
    partnerLinks,
  };
}
