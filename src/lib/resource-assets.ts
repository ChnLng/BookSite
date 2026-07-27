export const resourceDownloadsBucketName = "resource-downloads";

export function normalizeResourceAssetPath(assetPath?: string | null) {
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

  return trimmed.replace(/^resource-downloads\//i, "");
}
