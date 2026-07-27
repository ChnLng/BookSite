import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

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
  summaryFr?: string;
  coverImageUrl?: string;
  qrImageUrl?: string;
  externalUrl?: string;
  priceEur?: string;
  visible?: boolean;
  sortOrder?: string;
  downloads?: ResourceVariantPayload[];
};

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

export async function GET(request: Request) {
  const auth = await requireAdmin(request);

  if (auth.error) {
    return auth.error;
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "SUPABASE_SERVICE_ROLE_KEY manquant." }, { status: 503 });
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
        titleFr: item.title_fr || item.title_zh || item.name || "Categorie",
        kind: "resource",
      }));
    }
  } else {
    categories = ((categoriesResult.data || []) as LegacyCategoryRow[])
      .filter((item) => !item.kind || item.kind === "resource" || item.kind === "custom")
      .map((item) => ({
        id: item.id,
        titleFr: item.title_fr || item.title_zh || item.name || "Categorie",
        kind: item.kind || "resource",
      }));
  }

  const resourcesResult = await supabase
    .from("resource_items")
    .select("id, category_id, slug, title_fr, summary_fr, cover_image_url, qr_image_url, external_url, price_eur, visible, sort_order")
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
        cover_image_url: item.qr_image_url || null,
        price_eur: 0,
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

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "SUPABASE_SERVICE_ROLE_KEY manquant." }, { status: 503 });
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
    summary_fr: (resource?.summaryFr || "").trim() || null,
    cover_image_url: (resource?.coverImageUrl || "").trim() || null,
    qr_image_url: (resource?.qrImageUrl || "").trim() || null,
    external_url: (resource?.externalUrl || "").trim() || null,
    price_eur: Number.parseFloat(String(resource?.priceEur || "0")) || 0,
    visible: resource?.visible !== false,
    sort_order: Number(resource?.sortOrder || 0),
  };

  let resourceId = (resource?.id || "").trim();

  if (resourceId) {
    const { error } = await supabase.from("resource_items").update(rowPayload).eq("id", resourceId);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
  } else {
    const { data, error } = await supabase.from("resource_items").insert(rowPayload).select("id").single();

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

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "SUPABASE_SERVICE_ROLE_KEY manquant." }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as { id?: string } | null;
  const resourceId = (payload?.id || "").trim();

  if (!resourceId) {
    return NextResponse.json({ ok: false, message: "Ressource manquante." }, { status: 400 });
  }

  const { error: deleteFilesError } = await supabase.from("resource_item_files").delete().eq("resource_id", resourceId);

  if (deleteFilesError) {
    return NextResponse.json({ ok: false, message: deleteFilesError.message }, { status: 500 });
  }

  const { error } = await supabase.from("resource_items").delete().eq("id", resourceId);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
