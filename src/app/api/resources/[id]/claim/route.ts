import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { hasPurchasedResource } from "@/lib/purchase-access";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
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
    .select("id, slug, title_fr, price_eur, visible")
    .or(`slug.eq.${id},id.eq.${id}`)
    .maybeSingle();

  if (!resource || resource.visible === false) {
    return NextResponse.json({ ok: false, message: "Ressource introuvable." }, { status: 404 });
  }

  const price = Number(resource.price_eur || 0);

  if (price > 0) {
    return NextResponse.json({ ok: false, message: "Cette ressource doit etre achetee." }, { status: 400 });
  }

  const admin = await isAdminUser(user);

  if (!admin) {
    const existing = await hasPurchasedResource(supabase, {
      userId: user.id,
      email: user.email,
      resourceId: resource.id,
    });

    if (!existing) {
      await supabase.from("downloads").insert({
        user_id: user.id,
        user_email: user.email || null,
        download_kind: "resource",
        resource_id: resource.id,
        resource_title: resource.title_fr || resource.slug || resource.id,
        download_url: null,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "La ressource est maintenant disponible dans votre espace.",
  });
}
