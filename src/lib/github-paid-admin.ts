import "server-only";

import {
  assertGithubPaidRepositoryPrivate,
  githubPaidAssetReference,
  githubPaidHeaders,
  githubPaidOwner,
  githubPaidReleaseTag,
  githubPaidRepo,
  parseGithubPaidAssetReference,
  resolveLegacyGithubReleaseAsset,
} from "@/lib/github-paid-assets";

type GitHubRelease = {
  id: number;
  upload_url: string;
  assets?: Array<{ id: number; name: string }>;
};

export function sanitizePaidAssetFilename(fileName: string) {
  const cleaned = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return cleaned.replace(/^[-.]+|[-.]+$/g, "") || "document.bin";
}
async function getOrCreatePaidRelease() {
  if (!process.env.GITHUB_TOKEN || !githubPaidOwner || !githubPaidRepo) {
    throw new Error("Configuration GitHub privée incomplète.");
  }
  await assertGithubPaidRepositoryPrivate();

  const byTagUrl = `https://api.github.com/repos/${githubPaidOwner}/${githubPaidRepo}/releases/tags/${encodeURIComponent(githubPaidReleaseTag)}`;
  const existing = await fetch(byTagUrl, { headers: githubPaidHeaders(), cache: "no-store" });
  if (existing.ok) return (await existing.json()) as GitHubRelease;
  if (existing.status !== 404) throw new Error("Impossible de lire la GitHub Release privée.");

  const created = await fetch(`https://api.github.com/repos/${githubPaidOwner}/${githubPaidRepo}/releases`, {
    method: "POST",
    headers: { ...githubPaidHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      tag_name: githubPaidReleaseTag,
      name: "Paid downloads",
      body: "Protected downloadable product files managed from the site admin.",
      draft: false,
      prerelease: false,
    }),
  });
  if (!created.ok) throw new Error((await created.text()) || "Impossible de créer la GitHub Release privée.");
  return (await created.json()) as GitHubRelease;
}

export async function uploadPaidAssetStream(input: {
  body: ReadableStream<Uint8Array>;
  contentLength: number;
  contentType: string;
  fileName: string;
}) {
  const release = await getOrCreatePaidRelease();
  const safeName = sanitizePaidAssetFilename(input.fileName);
  const uploadUrl = release.upload_url.replace(/\{.*$/, "");
  const requestInit: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: {
      ...githubPaidHeaders(),
      "Content-Type": input.contentType || "application/octet-stream",
      "Content-Length": String(input.contentLength),
    },
    body: input.body,
    duplex: "half",
  };
  const uploaded = await fetch(`${uploadUrl}?name=${encodeURIComponent(safeName)}`, requestInit);
  if (!uploaded.ok) throw new Error((await uploaded.text()) || "Échec du transfert vers GitHub.");
  const asset = (await uploaded.json()) as { id?: number; name?: string };
  if (!asset.id) throw new Error("GitHub n'a pas retourné l'identifiant du fichier.");
  return {
    assetReference: githubPaidAssetReference(asset.id, asset.name || safeName),
    fileName: asset.name || safeName,
  };
}

export async function deletePaidAsset(assetReference: string) {
  const parsed = parseGithubPaidAssetReference(assetReference) || await resolveLegacyGithubReleaseAsset(assetReference);
  if (!parsed) return;
  if (!process.env.GITHUB_TOKEN || !githubPaidOwner || !githubPaidRepo) {
    throw new Error("Configuration GitHub privée incomplète.");
  }
  await assertGithubPaidRepositoryPrivate();
  const response = await fetch(
    `https://api.github.com/repos/${githubPaidOwner}/${githubPaidRepo}/releases/assets/${parsed.assetId}`,
    { method: "DELETE", headers: githubPaidHeaders() },
  );
  if (!response.ok && response.status !== 404) {
    throw new Error("Impossible de supprimer l'ancien fichier GitHub.");
  }
}
