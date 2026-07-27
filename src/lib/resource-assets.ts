export const resourceDownloadsBucketName = "resource-downloads";

export function normalizeResourceAssetPath(assetPath?: string | null) {
  if (!assetPath) {
    return null;
  }

  const trimmed = assetPath.trim();

  if (!trimmed) {
    return null;
  }

  const publicUrlPrefixPattern = /^https?:\/\/[^/]+\/storage\/v1\/object\/public\/resource-downloads\//i;
  const signedUrlPrefixPattern = /^https?:\/\/[^/]+\/storage\/v1\/object\/sign\/resource-downloads\//i;

  if (publicUrlPrefixPattern.test(trimmed)) {
    return trimmed.replace(publicUrlPrefixPattern, "").split("?")[0];
  }

  if (signedUrlPrefixPattern.test(trimmed)) {
    return trimmed.replace(signedUrlPrefixPattern, "").split("?")[0];
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return trimmed.replace(/^resource-downloads\//i, "");
}
