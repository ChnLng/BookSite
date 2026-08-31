import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { getSupabaseRequestClient } from "@/lib/supabase-server";
import { defaultCatalogue, isCatalogueKind, validateCatalogue } from "@/lib/android-catalogue";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });
async function handle(request: Request, write: boolean) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const user = await getUserFromRequest(request);
  if (!user || !(await isAdminUser(user, token))) return json({ message: "Accès administrateur requis." }, 403);
  const kind = new URL(request.url).searchParams.get("edition");
  if (!isCatalogueKind(kind)) return json({ message: "Catalogue inconnu." }, 400);
  const client = getSupabaseRequestClient(token);
  if (!client) return json({ message: "Service indisponible." }, 503);
  try {
    if (write) {
      const raw = await request.text();
      if (raw.length > 60000) return json({ message: "Contenu trop volumineux." }, 413);
      let body;
      try { body=JSON.parse(raw); } catch { return json({ message:"Données invalides." },400); }
      if (!Number.isInteger(body?.revision) || body.revision < 0) return json({ message: "Version invalide." }, 400);
      let config;
      try { config = validateCatalogue(body.config); } catch(error) { return json({ message: error instanceof Error ? error.message : "Contenu invalide." },400); }
      const { data, error } = await client.rpc("android_catalogue_save", { p_kind: kind, p_config: config, p_revision: body.revision });
      if (error) {
        if(error.message.includes("REVISION_CONFLICT")) return json({message:"Une autre modification a été enregistrée. Rechargez avant de réessayer."},409);
        return json({message:"Enregistrement impossible. Vérifiez la migration Supabase et votre rôle administrateur."},503);
      }
      return json({ ok: true, revision: data });
    }
    const { data, error } = await client.rpc("android_catalogue_read", { p_kind: kind, p_admin: true });
    if(error) return json({ config: defaultCatalogue(kind), revision: 0, setupNeeded: true, message: "L’édition intégrée est consultable. Pour enregistrer, appliquez la migration 20260830_android_catalogues.sql dans Supabase." });
    return json({ config: data?.configured ? validateCatalogue(data.config) : defaultCatalogue(kind), revision: data?.revision || 0, setupNeeded:false });
  } catch { return json({ message: "Le service ne répond pas. Aucun changement n’a été confirmé." },503); }
}
export const GET = (request:Request) => handle(request,false);
export const PUT = (request:Request) => handle(request,true);
