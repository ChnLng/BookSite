import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { hasPurchasedResource } from "@/lib/purchase-access";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
  }

  const [{ data: resource }, user] = await Promise.all([
    supabase
      .from("resource_items")
      .select("id, slug, visible")
      .or(`slug.eq.${id},id.eq.${id}`)
      .maybeSingle(),
    getUserFromRequest(request),
  ]);

  if (!resource || resource.visible === false) {
    return NextResponse.json({ ok: false, message: "Ressource introuvable." }, { status: 404 });
  }

  if (!user) {
    return NextResponse.json({ ok: true, hasAccess: false, requiresLogin: true });
  }

  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;
  const isAdmin = await isAdminUser(user, accessToken);
  const hasAccess = isAdmin || await hasPurchasedResource(supabase, {
    userId: user.id,
    email: user.email,
    resourceId: resource.id,
    resourceSlug: resource.slug,
  });

  return NextResponse.json({ ok: true, hasAccess, requiresLogin: false, isAdmin });
}
