import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { hasPurchasedResource } from "@/lib/purchase-access";
import { normalizeResourceAssetPath, resourceDownloadsBucketName } from "@/lib/resource-assets";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

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

  const admin = await isAdminUser(user);

  if (!admin) {
    const hasAccess = await hasPurchasedResource(supabase, {
      userId: user.id,
      email: user.email,
      resourceId: resource.id,
    });

    if (!hasAccess) {
      return NextResponse.json({ ok: false, message: "Acces non autorise." }, { status: 403 });
    }
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

  if (resolvedFileRow.external_url) {
    return NextResponse.json({ ok: true, url: resolvedFileRow.external_url });
  }

  const storagePath = normalizeResourceAssetPath(resolvedFileRow.file_path || resolvedFileRow.file_url);

  if (!storagePath || /^https?:\/\//i.test(storagePath)) {
    return NextResponse.json({ ok: false, message: "Chemin de telechargement invalide." }, { status: 404 });
  }

  const { data: signedData, error } = await supabase.storage
    .from(resourceDownloadsBucketName)
    .createSignedUrl(storagePath, 60);

  if (error || !signedData?.signedUrl) {
    return NextResponse.json({ ok: false, message: error?.message || "Lien temporaire indisponible." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: signedData.signedUrl });
}
