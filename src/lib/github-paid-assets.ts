const paidAssetPrefix = "github-release-asset:";

export const githubPaidOwner = process.env.GITHUB_PAID_OWNER || process.env.GITHUB_OWNER || "";
export const githubPaidRepo = process.env.GITHUB_PAID_REPO || "";
export const githubPaidReleaseTag = process.env.GITHUB_PAID_RELEASE_TAG || "paid-downloads";

export function githubPaidHeaders(binary = false) {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: binary ? "application/octet-stream" : "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function githubPaidAssetReference(assetId: number, fileName: string) {
  return `${paidAssetPrefix}${assetId}:${encodeURIComponent(fileName)}`;
}

export function parseGithubPaidAssetReference(value?: string | null) {
  const normalized = String(value || "").trim();
  if (!normalized.startsWith(paidAssetPrefix)) return null;
  const payload = normalized.slice(paidAssetPrefix.length);
  const separator = payload.indexOf(":");
  const assetId = Number(separator >= 0 ? payload.slice(0, separator) : payload);
  if (!Number.isSafeInteger(assetId) || assetId <= 0) return null;
  const encodedName = separator >= 0 ? payload.slice(separator + 1) : "download";
  let fileName = encodedName || "download";
  try {
    fileName = decodeURIComponent(fileName);
  } catch {
    // Keep the stored name if an old value was not URL encoded.
  }
  return { assetId, fileName };
}

export async function resolveLegacyGithubReleaseAsset(value: string) {
  const match = value.match(/^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\/([^/]+)\/([^?#]+)/i);
  if (!match || !githubPaidOwner || !githubPaidRepo) return null;
  const tag = decodeURIComponent(match[1]);
  const fileName = decodeURIComponent(match[2]);
  const response = await fetch(
    `https://api.github.com/repos/${githubPaidOwner}/${githubPaidRepo}/releases/tags/${encodeURIComponent(tag)}`,
    { headers: githubPaidHeaders(), cache: "no-store" },
  );
  if (!response.ok) return null;
  const release = await response.json() as { assets?: Array<{ id: number; name: string }> };
  const asset = release.assets?.find((entry) => entry.name === fileName);
  return asset ? { assetId: asset.id, fileName: asset.name } : null;
}

export async function fetchGithubPaidAsset(value: string) {
  if (!githubPaidOwner || !githubPaidRepo || !process.env.GITHUB_TOKEN) {
    throw new Error("Configuration du depot GitHub prive manquante.");
  }
  const parsed = parseGithubPaidAssetReference(value) || await resolveLegacyGithubReleaseAsset(value);
  if (!parsed) return null;
  const response = await fetch(
    `https://api.github.com/repos/${githubPaidOwner}/${githubPaidRepo}/releases/assets/${parsed.assetId}`,
    { headers: githubPaidHeaders(true), redirect: "follow", cache: "no-store" },
  );
  return { response, fileName: parsed.fileName, assetId: parsed.assetId };
}
