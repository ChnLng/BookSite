import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { booksBucketName, normalizeBookPdfAsset } from "@/lib/book-assets";
import { normalizeResourceAssetPath, resourceDownloadsBucketName } from "@/lib/resource-assets";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import {
  githubPaidAssetReference,
  githubPaidHeaders,
  githubPaidOwner,
  githubPaidReleaseTag,
  githubPaidRepo,
  parseGithubPaidAssetReference,
  resolveLegacyGithubReleaseAsset,
} from "@/lib/github-paid-assets";

const githubToken = process.env.GITHUB_TOKEN;
const githubOwner = process.env.GITHUB_OWNER;
const githubRepo = process.env.GITHUB_REPO;
const githubBranch = process.env.GITHUB_BRANCH || "main";
const siteMediaBucketName = "site-media";

type GitHubFileResponse = {
  sha?: string;
};

type GitHubRelease = {
  id: number;
  upload_url: string;
  assets?: Array<{ id: number; name: string; browser_download_url: string }>;
};

function sanitizeFilename(fileName: string) {
  const cleaned = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
  return cleaned.replace(/-+/g, "-");
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${githubToken}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function getOrCreateDownloadRelease() {
  if (!githubToken || !githubPaidOwner || !githubPaidRepo) {
    throw new Error("Configuration GitHub manquante pour televerser les fichiers payants.");
  }

  const byTagUrl = `https://api.github.com/repos/${githubPaidOwner}/${githubPaidRepo}/releases/tags/${encodeURIComponent(githubPaidReleaseTag)}`;
  const existing = await fetch(byTagUrl, { headers: githubPaidHeaders(), cache: "no-store" });

  if (existing.ok) {
    return (await existing.json()) as GitHubRelease;
  }

  if (existing.status !== 404) {
    throw new Error("Impossible de lire la GitHub Release des fichiers payants.");
  }

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

  if (!created.ok) {
    throw new Error((await created.text()) || "Impossible de creer la GitHub Release.");
  }

  return (await created.json()) as GitHubRelease;
}

async function uploadPaidFileToGitHubRelease(file: File, fileName: string) {
  const release = await getOrCreateDownloadRelease();
  const safeName = sanitizeFilename(fileName);
  const existingAsset = release.assets?.find((asset) => asset.name === safeName);

  if (existingAsset) {
    const removed = await fetch(
      `https://api.github.com/repos/${githubPaidOwner}/${githubPaidRepo}/releases/assets/${existingAsset.id}`,
      { method: "DELETE", headers: githubPaidHeaders() },
    );
    if (!removed.ok && removed.status !== 404) {
      throw new Error("Impossible de remplacer l'ancien fichier GitHub Release.");
    }
  }

  const uploadUrl = release.upload_url.replace(/\{.*$/, "");
  const uploaded = await fetch(`${uploadUrl}?name=${encodeURIComponent(safeName)}`, {
    method: "POST",
    headers: {
      ...githubPaidHeaders(),
      "Content-Type": file.type || "application/octet-stream",
    },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (!uploaded.ok) {
    throw new Error((await uploaded.text()) || "Echec du televersement GitHub Release.");
  }

  const asset = (await uploaded.json()) as { id?: number; name?: string };
  if (!asset.id) {
    throw new Error("GitHub n'a pas retourne l'identifiant prive du fichier.");
  }
  return githubPaidAssetReference(asset.id, asset.name || safeName);
}

async function deletePaidFileFromGitHubRelease(assetPath: string) {
  const parsed = parseGithubPaidAssetReference(assetPath) || await resolveLegacyGithubReleaseAsset(assetPath);
  if (!parsed) return;

  const response = await fetch(
    `https://api.github.com/repos/${githubPaidOwner}/${githubPaidRepo}/releases/assets/${parsed.assetId}`,
    { method: "DELETE", headers: githubPaidHeaders() },
  );
  if (!response.ok && response.status !== 404) {
    throw new Error("Impossible de supprimer le fichier GitHub Release.");
  }
}

async function requireAdmin(request: Request) {
  const user = await getUserFromRequest(request);
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;

  if (!user) {
    return { error: NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 }) };
  }

  const admin = await isAdminUser(user, accessToken);

  if (!admin) {
    return { error: NextResponse.json({ ok: false, message: "Acces admin requis." }, { status: 403 }) };
  }

  return { user };
}

async function ensureBooksBucket() {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY manquant.", supabase: null };
  }

  await supabase.storage.createBucket(booksBucketName, {
    public: false,
    fileSizeLimit: 500 * 1024 * 1024,
  });

  await supabase.storage.updateBucket(booksBucketName, {
    public: false,
    fileSizeLimit: 500 * 1024 * 1024,
    allowedMimeTypes: null,
  });

  return { error: null, supabase };
}

async function ensureResourceDownloadsBucket() {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY manquant.", supabase: null };
  }

  await supabase.storage.createBucket(resourceDownloadsBucketName, {
    public: false,
    fileSizeLimit: 200 * 1024 * 1024,
    allowedMimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
      "application/x-7z-compressed",
    ],
  });

  await supabase.storage.updateBucket(resourceDownloadsBucketName, {
    public: false,
    fileSizeLimit: 200 * 1024 * 1024,
    allowedMimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
      "application/x-7z-compressed",
    ],
  });

  return { error: null, supabase };
}

async function ensureSiteMediaBucket() {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY manquant.", supabase: null };
  }

  await supabase.storage.createBucket(siteMediaBucketName, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"],
  });

  await supabase.storage.updateBucket(siteMediaBucketName, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"],
  });

  return { error: null, supabase };
}

async function uploadImageToSupabase(file: File, fileName: string) {
  const safeName = sanitizeFilename(fileName);
  if (!safeName.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i) || !file.type.startsWith("image/")) {
    throw new Error("Format image non pris en charge.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("L'image depasse la limite de 10 Mo.");
  }

  const { error, supabase } = await ensureSiteMediaBucket();
  if (error || !supabase) throw new Error(error || "Supabase indisponible.");

  const storagePath = `images/${safeName}`;
  const { error: uploadError } = await supabase.storage.from(siteMediaBucketName).upload(storagePath, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    cacheControl: "3600",
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message);

  return supabase.storage.from(siteMediaBucketName).getPublicUrl(storagePath).data.publicUrl;
}

function siteMediaPathFromUrl(assetPath: string) {
  const marker = `/storage/v1/object/public/${siteMediaBucketName}/`;
  try {
    const pathname = new URL(assetPath).pathname;
    const markerIndex = pathname.indexOf(marker);
    return markerIndex >= 0 ? decodeURIComponent(pathname.slice(markerIndex + marker.length)) : null;
  } catch {
    return assetPath.startsWith(`${siteMediaBucketName}/`) ? assetPath.slice(siteMediaBucketName.length + 1) : null;
  }
}

async function getGitHubFileSha(repoPath: string) {
  if (!githubToken || !githubOwner || !githubRepo) {
    return { sha: null, missingConfig: true };
  }

  const response = await fetch(
    `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${repoPath}?ref=${githubBranch}`,
    {
      headers: githubHeaders(),
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return { sha: null, missingConfig: false };
  }

  if (!response.ok) {
    throw new Error("Impossible de lire le fichier GitHub.");
  }

  const data = (await response.json()) as GitHubFileResponse;
  return { sha: data.sha || null, missingConfig: false };
}

async function uploadImageToGitHub(file: File, fileName: string) {
  if (!githubToken || !githubOwner || !githubRepo) {
    throw new Error("Configuration GitHub manquante pour televerser les images.");
  }

  const safeName = sanitizeFilename(fileName);

  if (!safeName.match(/\.(png|jpg|jpeg|webp|svg)$/i)) {
    throw new Error("Format image non pris en charge.");
  }

  const repoPath = `public/images/${safeName}`;
  const { sha } = await getGitHubFileSha(repoPath);
  const content = Buffer.from(await file.arrayBuffer()).toString("base64");
  const response = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${repoPath}`, {
    method: "PUT",
    headers: {
      ...githubHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `admin: upload image ${safeName}`,
      content,
      branch: githubBranch,
      sha: sha || undefined,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "Echec du televersement GitHub.");
  }

  return `/images/${safeName}`;
}

async function deleteImageFromGitHub(assetPath: string) {
  if (!githubToken || !githubOwner || !githubRepo) {
    throw new Error("Configuration GitHub manquante pour supprimer les images.");
  }

  const normalized = assetPath.replace(/^\/+/, "");

  if (!normalized.startsWith("images/")) {
    throw new Error("Chemin image invalide.");
  }

  const repoPath = `public/${normalized}`;
  const { sha } = await getGitHubFileSha(repoPath);

  if (!sha) {
    return;
  }

  const response = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${repoPath}`, {
    method: "DELETE",
    headers: {
      ...githubHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `admin: delete image ${normalized}`,
      sha,
      branch: githubBranch,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "Echec de la suppression GitHub.");
  }
}

async function checkPdfExistsInSupabase(assetPath: string) {
  const privateAsset = parseGithubPaidAssetReference(assetPath) || await resolveLegacyGithubReleaseAsset(assetPath);
  if (privateAsset) {
    const response = await fetch(
      `https://api.github.com/repos/${githubPaidOwner}/${githubPaidRepo}/releases/assets/${privateAsset.assetId}`,
      { headers: githubPaidHeaders(), cache: "no-store" },
    );
    return response.ok;
  }
  if (/^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\//i.test(assetPath)) {
    const response = await fetch(assetPath, { method: "HEAD", redirect: "follow", cache: "no-store" });
    return response.ok;
  }
  const { error, supabase } = await ensureBooksBucket();

  if (error || !supabase) {
    throw new Error(error || "Supabase indisponible.");
  }

  const storagePath = normalizeBookPdfAsset(assetPath);

  if (!storagePath || storagePath.startsWith("/") || /^https?:\/\//i.test(storagePath)) {
    return false;
  }

  const pathParts = storagePath.split("/").filter(Boolean);
  const fileName = pathParts[pathParts.length - 1];
  const folderPath = pathParts.slice(0, -1).join("/");

  const { data, error: listError } = await supabase.storage.from(booksBucketName).list(folderPath, {
    search: fileName,
  });

  if (listError) {
    throw new Error(listError.message);
  }

  return Boolean(data?.some((entry) => entry.name === fileName));
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);

  if (auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") || "";

  try {
    if (kind === "pdf-status") {
      const assets = searchParams
        .getAll("assetPath")
        .map((entry) => entry.trim())
        .filter(Boolean);

      const statusEntries = await Promise.all(
        assets.map(async (assetPath) => {
          try {
            const exists = await checkPdfExistsInSupabase(assetPath);
            return [assetPath, { exists, message: exists ? "付费文件已就绪" : "付费文件尚未上传到私有 GitHub Releases" }] as const;
          } catch (error) {
            const message = error instanceof Error ? error.message : "状态检查失败";
            return [assetPath, { exists: false, message }] as const;
          }
        }),
      );

      return NextResponse.json({
        ok: true,
        statuses: Object.fromEntries(statusEntries),
      });
    }

    if (kind === "paid-assets") {
      if (!githubToken || !githubPaidOwner || !githubPaidRepo) {
        return NextResponse.json(
          { ok: false, message: "Configuration du depot GitHub prive manquante." },
          { status: 500 },
        );
      }

      const response = await fetch(
        `https://api.github.com/repos/${githubPaidOwner}/${githubPaidRepo}/releases/tags/${encodeURIComponent(githubPaidReleaseTag)}`,
        { headers: githubPaidHeaders(), cache: "no-store" },
      );

      if (!response.ok) {
        return NextResponse.json(
          { ok: false, message: "Impossible de lire les fichiers de la GitHub Release privee." },
          { status: response.status === 404 ? 404 : 502 },
        );
      }

      const release = (await response.json()) as GitHubRelease;
      const assets = (release.assets || [])
        .filter((asset) => !/^Source code /i.test(asset.name))
        .map((asset) => ({
          id: asset.id,
          name: asset.name,
          reference: githubPaidAssetReference(asset.id, asset.name),
        }))
        .sort((left, right) => left.name.localeCompare(right.name));

      return NextResponse.json({ ok: true, assets });
    }

    return NextResponse.json({ ok: false, message: "Type de lecture inconnu." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lecture impossible.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);

  if (auth.error) {
    return auth.error;
  }

  const formData = await request.formData();
  const kind = String(formData.get("kind") || "");
  const file = formData.get("file");
  const fileName = sanitizeFilename(String(formData.get("filename") || ""));

  if (!(file instanceof File) || !fileName) {
    return NextResponse.json({ ok: false, message: "Fichier ou nom de fichier manquant." }, { status: 400 });
  }

  try {
    if (kind === "image") {
      const assetPath = await uploadImageToSupabase(file, fileName);
      return NextResponse.json({ ok: true, assetPath });
    }

    if (kind === "pdf") {
      const assetPath = await uploadPaidFileToGitHubRelease(file, fileName);
      return NextResponse.json({ ok: true, assetPath });
    }

    if (kind === "resource-download") {
      const assetPath = await uploadPaidFileToGitHubRelease(file, fileName);
      return NextResponse.json({ ok: true, assetPath });
    }

    return NextResponse.json({ ok: false, message: "Type de ressource inconnu." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation impossible.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);

  if (auth.error) {
    return auth.error;
  }

  const payload = (await request.json().catch(() => null)) as { kind?: string; assetPath?: string } | null;
  const kind = payload?.kind || "";
  const assetPath = payload?.assetPath || "";

  if (!kind || !assetPath) {
    return NextResponse.json({ ok: false, message: "Informations de suppression manquantes." }, { status: 400 });
  }

  try {
    if (kind === "image") {
      const storagePath = siteMediaPathFromUrl(assetPath);
      if (storagePath) {
        const { error, supabase } = await ensureSiteMediaBucket();
        if (error || !supabase) throw new Error(error || "Supabase indisponible.");
        const { error: removeError } = await supabase.storage.from(siteMediaBucketName).remove([storagePath]);
        if (removeError) throw new Error(removeError.message);
      } else {
        await deleteImageFromGitHub(assetPath);
      }
      return NextResponse.json({ ok: true });
    }

    if (kind === "pdf") {
      if (parseGithubPaidAssetReference(assetPath) || /^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\//i.test(assetPath)) {
        await deletePaidFileFromGitHubRelease(assetPath);
        return NextResponse.json({ ok: true });
      }

      const { error, supabase } = await ensureBooksBucket();

      if (error || !supabase) {
        return NextResponse.json({ ok: false, message: error || "Supabase indisponible." }, { status: 503 });
      }

      const storagePath = normalizeBookPdfAsset(assetPath);

      if (!storagePath) {
        return NextResponse.json({ ok: false, message: "Chemin PDF invalide." }, { status: 400 });
      }

      const { error: removeError } = await supabase.storage.from(booksBucketName).remove([storagePath]);

      if (removeError) {
        return NextResponse.json({ ok: false, message: removeError.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (kind === "resource-download") {
      if (parseGithubPaidAssetReference(assetPath) || /^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\//i.test(assetPath)) {
        await deletePaidFileFromGitHubRelease(assetPath);
        return NextResponse.json({ ok: true });
      }

      const { error, supabase } = await ensureResourceDownloadsBucket();

      if (error || !supabase) {
        return NextResponse.json({ ok: false, message: error || "Supabase indisponible." }, { status: 503 });
      }

      const storagePath = normalizeResourceAssetPath(assetPath);

      if (!storagePath || /^https?:\/\//i.test(storagePath)) {
        return NextResponse.json({ ok: false, message: "Chemin de ressource invalide." }, { status: 400 });
      }

      const { error: removeError } = await supabase.storage.from(resourceDownloadsBucketName).remove([storagePath]);

      if (removeError) {
        return NextResponse.json({ ok: false, message: removeError.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, message: "Type de ressource inconnu." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Suppression impossible.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
