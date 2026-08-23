import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { getSupabaseRequestClient, getSupabaseServiceClient } from "@/lib/supabase-server";

type LegacyCategoryRow = {
  id: string;
  title_fr?: string | null;
  title_zh?: string | null;
  name?: string | null;
  kind?: string | null;
};

type ResourceVariantPayload = {
  id?: string;
  platform?: string;
  labelFr?: string;
  filePath?: string;
  externalUrl?: string;
  sortOrder?: string;
};

type ResourcePayload = {
  id?: string;
  categoryId?: string;
  slug?: string;
  titleFr?: string;
  homepageSummaryFr?: string;
  summaryFr?: string;
  coverImageUrl?: string;
  qrImageUrl?: string;
  externalUrl?: string;
  priceEur?: string;
  visible?: boolean;
  sortOrder?: string;
  galleryImages?: Array<{ url?: string; visible?: boolean }>;
  downloads?: ResourceVariantPayload[];
};

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

function normalizeVariantRows(resourceId: string, downloads: ResourceVariantPayload[] = []) {
  return downloads
    .filter((entry) => (entry.labelFr || "").trim() && ((entry.filePath || "").trim() || (entry.externalUrl || "").trim()))
    .map((entry, index) => ({
      resource_id: resourceId,
      platform: (entry.platform || "通用").trim() || "通用",
      label_fr: (entry.labelFr || "").trim(),
      file_path: (entry.filePath || "").trim() || null,
      external_url: (entry.externalUrl || "").trim() || null,
      sort_order: Number(entry.sortOrder || index * 10 || 0),
    }));
}

function getAdminSupabase(request: Request) {
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;
  return getSupabaseServiceClient() || getSupabaseRequestClient(accessToken);
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);

  if (auth.error) {
    return auth.error;
  }

  const supabase = getAdminSupabase(request);

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Client Supabase admin indisponible." }, { status: 503 });
  }

  const warnings: string[] = [];

  const categoriesResult = await supabase
    .from("categories")
    .select("id, title_fr, title_zh, kind")
    .order("created_at", { ascending: true });

  let categories: Array<{ id: string; titleFr: string; kind: string }> = [];

  if (categoriesResult.error) {
    const fallbackCategoriesResult = await supabase
      .from("categories")
      .select("id, title_fr, title_zh, name")
      .order("created_at", { ascending: true });

    if (fallbackCategoriesResult.error) {
      warnings.push(`Categories: ${fallbackCategoriesResult.error.message}`);
    } else {
      categories = ((fallbackCategoriesResult.data || []) as LegacyCategoryRow[]).map((item) => ({
        id: item.id,
        titleFr: item.title_fr || item.title_zh || item.name || "Catégorie",
        kind: "resource",
      }));
    }
  } else {
    categories = ((categoriesResult.data || []) as LegacyCategoryRow[])
      .filter((item) => !item.kind || item.kind === "resource" || item.kind === "custom")
      .map((item) => ({
        id: item.id,
        titleFr: item.title_fr || item.title_zh || item.name || "Catégorie",
        kind: item.kind || "resource",
      }));
  }

  const resourcesResult = await supabase
    .from("resource_items")
    .select("id, category_id, slug, title_fr, homepage_summary_fr, summary_fr, cover_image_url, qr_image_url, external_url, price_eur, visible, sort_order, gallery_images")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  let resources = resourcesResult.data || [];

  if (resourcesResult.error) {
    const fallbackResourcesResult = await supabase
      .from("resource_items")
        .select("id, category_id, slug, title_fr, summary_fr, qr_image_url, external_url, visible, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (fallbackResourcesResult.error) {
      warnings.push(`Outils: ${fallbackResourcesResult.error.message}`);
    } else {
      resources = (fallbackResourcesResult.data || []).map((item) => ({
        ...item,
        homepage_summary_fr: null,
        cover_image_url: item.qr_image_url || null,
        price_eur: 0,
        gallery_images: [],
      }));
    }
  }

  const filesResult = await supabase
    .from("resource_item_files")
    .select("id, resource_id, platform, label_fr, file_path, file_url, external_url, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  let files: Array<{
    id: string;
    resource_id: string;
    platform: string | null;
    label_fr: string | null;
    file_path: string | null;
    file_url?: string | null;
    external_url: string | null;
    sort_order: number | null;
  }> = filesResult.data || [];

  if (filesResult.error) {
    const fallbackFilesResult = await supabase
      .from("resource_item_files")
      .select("id, resource_id, platform, label_fr, file_path, external_url, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (fallbackFilesResult.error) {
      warnings.push(`Fichiers Outils: ${fallbackFilesResult.error.message}`);
    } else {
      files = fallbackFilesResult.data || [];
    }
  } else {
    files = (filesResult.data || []).map((item) => ({
      ...item,
      file_path: item.file_path || item.file_url || null,
    }));
  }

  return NextResponse.json({
    ok: true,
    categories,
    resources,
    files,
    warnings,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);

  if (auth.error) {
    return auth.error;
  }

  const supabase = getAdminSupabase(request);

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Client Supabase admin indisponible." }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as { payload?: ResourcePayload } | null;
  const resource = payload?.payload;
  const normalizedSlug = (resource?.slug || resource?.titleFr || "").trim();
  const normalizedTitle = (resource?.titleFr || "").trim();

  if (!normalizedSlug || !normalizedTitle) {
    return NextResponse.json({ ok: false, message: "Ajoutez au minimum un titre et un slug." }, { status: 400 });
  }

  const rowPayload = {
    category_id: (resource?.categoryId || "").trim() || null,
    slug: normalizedSlug,
    title_fr: normalizedTitle,
    homepage_summary_fr: (resource?.homepageSummaryFr || "").trim() || null,
    summary_fr: (resource?.summaryFr || "").trim() || null,
    cover_image_url: (resource?.coverImageUrl || "").trim() || null,
    qr_image_url: (resource?.qrImageUrl || "").trim() || null,
    external_url: (resource?.externalUrl || "").trim() || null,
    price_eur: Number.parseFloat(String(resource?.priceEur || "0")) || 0,
    visible: resource?.visible !== false,
    sort_order: Number(resource?.sortOrder || 0),
    gallery_images: (resource?.galleryImages || []).filter((image) => image?.url?.trim()).slice(0, 7).map((image) => ({ url: image.url!.trim(), visible: image.visible !== false })),
  };

  let resourceId = (resource?.id || "").trim();

  if (resourceId) {
    let { error } = await supabase.from("resource_items").update(rowPayload).eq("id", resourceId);

    if (error && /homepage_summary_fr|gallery_images|column|schema cache/i.test(error.message)) {
      const { homepage_summary_fr: _unusedHomepageSummary, gallery_images: _unusedGalleryImages, ...legacyPayload } = rowPayload;
      ({ error } = await supabase.from("resource_items").update(legacyPayload).eq("id", resourceId));
    }

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
  } else {
    let { data, error } = await supabase.from("resource_items").insert(rowPayload).select("id").single();

    if (error && /homepage_summary_fr|gallery_images|column|schema cache/i.test(error.message)) {
      const { homepage_summary_fr: _unusedHomepageSummary, gallery_images: _unusedGalleryImages, ...legacyPayload } = rowPayload;
      ({ data, error } = await supabase.from("resource_items").insert(legacyPayload).select("id").single());
    }

    if (error || !data?.id) {
      return NextResponse.json({ ok: false, message: error?.message || "Creation de ressource impossible." }, { status: 500 });
    }

    resourceId = data.id as string;
  }

  const { error: deleteFilesError } = await supabase.from("resource_item_files").delete().eq("resource_id", resourceId);

  if (deleteFilesError) {
    return NextResponse.json({ ok: false, message: deleteFilesError.message }, { status: 500 });
  }

  const variantRows = normalizeVariantRows(resourceId, resource?.downloads || []);

  if (variantRows.length > 0) {
    const { error: insertFilesError } = await supabase.from("resource_item_files").insert(variantRows);

    if (insertFilesError) {
      return NextResponse.json({ ok: false, message: insertFilesError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, id: resourceId });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);

  if (auth.error) {
    return auth.error;
  }

  const supabase = getAdminSupabase(request);

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Client Supabase admin indisponible." }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as { id?: string } | null;
  const resourceId = (payload?.id || "").trim();

  if (!resourceId) {
    return NextResponse.json({ ok: false, message: "Ressource manquante." }, { status: 400 });
  }

  const { error } = await supabase
    .from("resource_items")
    .update({ deleted_at: new Date().toISOString(), visible: false })
    .eq("id", resourceId);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const supabase = getAdminSupabase(request);
  if (!supabase) return NextResponse.json({ ok: false, message: "Client Supabase admin indisponible." }, { status: 503 });

  const payload = (await request.json().catch(() => null)) as {
    action?: "visibility" | "move" | "restore";
    id?: string;
    visible?: boolean;
    targetId?: string;
    currentSortOrder?: number;
    targetSortOrder?: number;
  } | null;
  if (!payload?.action || !payload.id) {
    return NextResponse.json({ ok: false, message: "Action outil invalide." }, { status: 400 });
  }

  if (payload.action === "restore") {
    const { error } = await supabase.from("resource_items").update({ deleted_at: null, visible: payload.visible !== false }).eq("id", payload.id);
    return error ? NextResponse.json({ ok: false, message: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (payload.action === "visibility") {
    const { error } = await supabase.from("resource_items").update({ visible: Boolean(payload.visible) }).eq("id", payload.id);
    return error ? NextResponse.json({ ok: false, message: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (!payload.targetId) return NextResponse.json({ ok: false, message: "Outil cible manquant." }, { status: 400 });
  const [{ error: currentError }, { error: targetError }] = await Promise.all([
    supabase.from("resource_items").update({ sort_order: payload.targetSortOrder ?? 0 }).eq("id", payload.id),
    supabase.from("resource_items").update({ sort_order: payload.currentSortOrder ?? 0 }).eq("id", payload.targetId),
  ]);
  const error = currentError || targetError;
  return error ? NextResponse.json({ ok: false, message: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
