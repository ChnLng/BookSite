import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { getSupabaseRequestClient } from "@/lib/supabase-server";
import { getPlayTestingApp } from "@/lib/play-testing";
import { parsePlayCodesCsv, playCodeError } from "@/lib/play-code-inventory";

const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });

async function handle(request: Request, mutate: boolean) {
  const user = await getUserFromRequest(request);
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!user || !(await isAdminUser(user, token))) return json({ ok: false, message: "Accès administrateur requis." }, 403);
  const supabase = getSupabaseRequestClient(token);
  if (!supabase) return json({ ok: false, message: "Service indisponible." }, 503);
  let fn = "play_testing_inventory";
  let args: Record<string, unknown> = {};
  if (mutate) {
    const raw = await request.text();
    if (raw.length > 800_000) return json({ ok: false, message: "Fichier trop volumineux." }, 413);
    let payload;
    try { payload = JSON.parse(raw); } catch { return json({ ok: false, message: "Données invalides." }, 400); }
    try {
      if (payload?.action === "import") {
        const app = getPlayTestingApp(payload.packageName);
        if (!app || app.packageName !== payload.packageName || typeof payload.csv !== "string" || typeof payload.label !== "string" || payload.unusedConfirmed !== true) throw new Error("Vérifiez l’application, le fichier et la confirmation des codes inutilisés.");
        if (!Number.isFinite(Date.parse(payload.validFrom)) || !Number.isFinite(Date.parse(payload.validUntil))) throw new Error("Indiquez les dates exactes de la promotion Google Play.");
        fn = "play_testing_import";
        args = { p_package: app.packageName, p_label: payload.label, p_from: payload.validFrom, p_until: payload.validUntil, p_codes: parsePlayCodesCsv(payload.csv), p_unused_confirmed: true };
      } else if (payload?.action === "batch") {
        if (typeof payload.batchId !== "string" || !/^[a-f0-9-]{36}$/i.test(payload.batchId) || typeof payload.enabled !== "boolean") throw new Error("Lot invalide.");
        fn = "play_testing_batch";
        args = { p_batch: payload.batchId, p_enabled: payload.enabled, p_google_active_confirmed: payload.googleActiveConfirmed === true };
      } else if (payload?.action === "block" && typeof payload.csv === "string") {
        fn = "play_testing_block"; args = { p_codes: parsePlayCodesCsv(payload.csv) };
      } else throw new Error("Action inconnue.");
    } catch (error) { return json({ ok: false, message: error instanceof Error ? error.message : "Import invalide." }, 400); }
  }
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error("play_testing_admin_rpc_failed", error.code);
    const result = playCodeError(error);
    return json({ ok: false, message: result.message }, result.status);
  }
  return json({ ok: true, ...data });
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
