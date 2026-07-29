import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { hasPurchasedResource } from "@/lib/purchase-access";
import { normalizeResourceAssetPath, resourceDownloadsBucketName } from "@/lib/resource-assets";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { fetchGithubPaidAsset, parseGithubPaidAssetReference } from "@/lib/github-paid-assets";

function privateDownloadHeaders(fileName: string, contentType?: string | null) {
  const safeName = fileName.replace(/["\\\r\n]/g, "-");
  return {
    "Content-Type": contentType || "application/octet-stream",
    "Content-Disposition": `attachment; filename="${safeName}"`,
    "Cache-Control": "private, no-store",
  };
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const fileId = new URL(request.url).searchParams.get("file") || "";
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
  }

  const { data: resource } = await supabase
    .from("resource_items")
    .select("id, slug, visible")
    .or(`slug.eq.${id},id.eq.${id}`)
    .maybeSingle();

  if (!resource || resource.visible === false) {
    return NextResponse.json({ ok: false, message: "Ressource introuvable." }, { status: 404 });
  }

  const hasAccess = await hasPurchasedResource(supabase, {
    userId: user.id,
    email: user.email,
    resourceId: resource.id,
  });

  if (!hasAccess) {
    return NextResponse.json({ ok: false, message: "Accès non autorisé." }, { status: 403 });
  }

  const { data: fileRow } = await supabase
    .from("resource_item_files")
    .select("id, file_path, file_url, external_url")
    .eq("resource_id", resource.id)
    .eq("id", fileId || "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  let resolvedFileRow = fileRow;

  if (!resolvedFileRow && !fileId) {
    const { data: firstFileRow } = await supabase
      .from("resource_item_files")
      .select("id, file_path, file_url, external_url")
      .eq("resource_id", resource.id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    resolvedFileRow = firstFileRow;
  }

  if (!resolvedFileRow) {
    return NextResponse.json({ ok: false, message: "Fichier introuvable." }, { status: 404 });
  }

  if (hasAccess) {
    const { data: purchase } = await supabase
      .from("downloads")
      .select("id, download_count")
      .eq("user_id", user.id)
      .eq("resource_id", resource.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (purchase?.id) {
      await supabase.from("downloads").update({
        download_count: Number(purchase.download_count || 0) + 1,
        last_downloaded_at: new Date().toISOString(),
      }).eq("id", purchase.id);
    }
  }

  if (resolvedFileRow.external_url) {
    return NextResponse.json({ ok: true, url: resolvedFileRow.external_url });
  }

  const rawFilePath = resolvedFileRow.file_path || resolvedFileRow.file_url || "";
  if (parseGithubPaidAssetReference(rawFilePath) || /^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\//i.test(rawFilePath)) {
    const asset = await fetchGithubPaidAsset(rawFilePath);
    if (!asset?.response.ok || !asset.response.body) {
      return NextResponse.json({ ok: false, message: "Fichier GitHub privé introuvable." }, { status: 404 });
    }
    return new NextResponse(asset.response.body, {
      status: 200,
      headers: privateDownloadHeaders(asset.fileName, asset.response.headers.get("content-type")),
    });
  }

  const storagePath = normalizeResourceAssetPath(rawFilePath);

  if (!storagePath || /^https?:\/\//i.test(storagePath)) {
    return NextResponse.json({ ok: false, message: "Chemin de téléchargement invalide." }, { status: 404 });
  }

  const { data: signedData, error } = await supabase.storage
    .from(resourceDownloadsBucketName)
    .createSignedUrl(storagePath, 60);

  if (error || !signedData?.signedUrl) {
    return NextResponse.json({ ok: false, message: error?.message || "Lien temporaire indisponible." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: signedData.signedUrl });
}
