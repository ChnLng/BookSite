import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { booksBucketName, normalizeBookPdfAsset } from "@/lib/book-assets";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

const githubToken = process.env.GITHUB_TOKEN;
const githubOwner = process.env.GITHUB_OWNER;
const githubRepo = process.env.GITHUB_REPO;
const githubBranch = process.env.GITHUB_BRANCH || "main";

type GitHubFileResponse = {
  sha?: string;
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

async function requireAdmin(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return { error: NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 }) };
  }

  const admin = await isAdminUser(user);

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
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
  });

  return { error: null, supabase };
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
      const assetPath = await uploadImageToGitHub(file, fileName);
      return NextResponse.json({ ok: true, assetPath });
    }

    if (kind === "pdf") {
      if (!fileName.match(/\.pdf$/i)) {
        return NextResponse.json({ ok: false, message: "Le document doit etre un PDF." }, { status: 400 });
      }

      const { error, supabase } = await ensureBooksBucket();

      if (error || !supabase) {
        return NextResponse.json({ ok: false, message: error || "Supabase indisponible." }, { status: 503 });
      }

      const storagePath = normalizeBookPdfAsset(fileName);

      if (!storagePath) {
        return NextResponse.json({ ok: false, message: "Nom du document invalide." }, { status: 400 });
      }

      const { error: uploadError } = await supabase.storage
        .from(booksBucketName)
        .upload(storagePath, file, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json({ ok: false, message: uploadError.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, assetPath: storagePath });
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
      await deleteImageFromGitHub(assetPath);
      return NextResponse.json({ ok: true });
    }

    if (kind === "pdf") {
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

    return NextResponse.json({ ok: false, message: "Type de ressource inconnu." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Suppression impossible.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
