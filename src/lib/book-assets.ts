export const siteLogoPath = "/images/logo.png";
export const booksBucketName = "books";

export function bookCoverPath(slug: string, extension: "jpg" | "png" = "jpg") {
  return `/images/${slug}_cover.${extension}`;
}

export function bookPdfPath(slug: string) {
  return `${slug}_book.pdf`;
}

export const bookAssetExtensions: Record<string, "jpg" | "png"> = {
  lumi: "jpg",
  jiti: "jpg",
  taogao: "jpg",
  fulbert: "png",
};

export function normalizeBookPdfAsset(assetPath?: string | null) {
  if (!assetPath) {
    return null;
  }

  const trimmed = assetPath.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return trimmed.replace(/^books\//i, "");
}

export function isSupabaseBookPdfAsset(assetPath?: string | null) {
  const normalized = normalizeBookPdfAsset(assetPath);

  if (!normalized) {
    return false;
  }

  return !normalized.startsWith("/") && !/^https?:\/\//i.test(normalized);
}

export function extractBookSlugFromPdfAsset(assetPath?: string | null) {
  const normalized = normalizeBookPdfAsset(assetPath);

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/(?:^|\/)([a-z0-9_-]+)_book\.pdf(?:\?.*)?$/i);
  return match?.[1] || null;
}
