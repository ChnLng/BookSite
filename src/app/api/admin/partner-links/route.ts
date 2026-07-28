import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { getSupabaseRequestClient, getSupabaseServiceClient } from "@/lib/supabase-server";

type PartnerLinkPayload = {
  id?: string;
  titleFr?: string;
  iconUrl?: string;
  targetUrl?: string;
  sortOrder?: string;
  visible?: boolean;
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

  const { data, error } = await supabase
    .from("partner_links")
    .select("id, title_fr, icon_url, target_url, sort_order, visible")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, links: data || [] });
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

  const payload = (await request.json().catch(() => null)) as { payload?: PartnerLinkPayload } | null;
  const link = payload?.payload;

  if (!link?.titleFr?.trim() || !link.iconUrl?.trim() || !link.targetUrl?.trim()) {
    return NextResponse.json({ ok: false, message: "Remplissez le titre, l'icone et l'URL cible." }, { status: 400 });
  }

  const rowPayload = {
    title_fr: link.titleFr.trim(),
    icon_url: link.iconUrl.trim(),
    target_url: link.targetUrl.trim(),
    sort_order: Number(link.sortOrder || 0),
    visible: link.visible !== false,
  };

  if ((link.id || "").trim()) {
    const { error } = await supabase.from("partner_links").update(rowPayload).eq("id", link.id!.trim());

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: link.id!.trim() });
  }

  const { data, error } = await supabase.from("partner_links").insert(rowPayload).select("id").single();

  if (error || !data?.id) {
    return NextResponse.json({ ok: false, message: error?.message || "Creation du lien impossible." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);

  if (auth.error) {
    return auth.error;
  }

  const supabase = getAdminSupabase(request);

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Client Supabase admin indisponible." }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        action?: "move" | "visibility" | "restore";
        id?: string;
        visible?: boolean;
        currentId?: string;
        targetId?: string;
        currentSortOrder?: number;
        targetSortOrder?: number;
      }
    | null;

  if (payload?.action === "visibility" || payload?.action === "restore") {
    const id = (payload.id || "").trim();
    if (!id) return NextResponse.json({ ok: false, message: "Lien manquant." }, { status: 400 });
    const update = payload.action === "restore"
      ? { deleted_at: null, visible: payload.visible !== false }
      : { visible: Boolean(payload.visible) };
    const { error } = await supabase.from("partner_links").update(update).eq("id", id);
    return error ? NextResponse.json({ ok: false, message: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  const currentId = (payload?.currentId || "").trim();
  const targetId = (payload?.targetId || "").trim();

  if (!currentId || !targetId) {
    return NextResponse.json({ ok: false, message: "Elements de tri manquants." }, { status: 400 });
  }

  const [{ error: currentError }, { error: targetError }] = await Promise.all([
    supabase.from("partner_links").update({ sort_order: payload?.targetSortOrder || 0 }).eq("id", currentId),
    supabase.from("partner_links").update({ sort_order: payload?.currentSortOrder || 0 }).eq("id", targetId),
  ]);

  if (currentError || targetError) {
    return NextResponse.json(
      { ok: false, message: currentError?.message || targetError?.message || "Tri impossible." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
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
  const linkId = (payload?.id || "").trim();

  if (!linkId) {
    return NextResponse.json({ ok: false, message: "Lien manquant." }, { status: 400 });
  }

  const { error } = await supabase
    .from("partner_links")
    .update({ deleted_at: new Date().toISOString(), visible: false })
    .eq("id", linkId);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
