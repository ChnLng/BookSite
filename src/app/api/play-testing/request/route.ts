import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { getSupabaseRequestClient } from "@/lib/supabase-server";
import { getPlayTestingApp } from "@/lib/play-testing";
import { playCodeError, playCodeMessage, type PlayCodeStatus } from "@/lib/play-code-inventory";

const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization", "Referrer-Policy": "no-referrer" };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });

async function handle(request: Request, claim: boolean) {
  const user = await getUserFromRequest(request);
  if (!user?.id) return json({ ok: false, message: "Connectez-vous pour retrouver votre code personnel." }, 401);
  const payload = claim ? await request.json().catch(() => null) : { packageName: new URL(request.url).searchParams.get("app") };
  const app = getPlayTestingApp(typeof payload?.packageName === "string" ? payload.packageName : "");
  if (!app || payload.packageName !== app.packageName) return json({ ok: false, message: "Choisissez une application de test." }, 400);
  if (claim && (payload?.consent !== true || payload?.groupConfirmed !== true || payload?.testConfirmed !== true || typeof payload?.playEmail !== "string" || payload.playEmail.length > 254)) {
    return json({ ok: false, message: "Vérifiez votre adresse et les trois confirmations avant de demander un code." }, 400);
  }
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const supabase = getSupabaseRequestClient(token);
  if (!supabase) return json({ ok: false, message: "Service momentanément indisponible." }, 503);
  const { data, error } = await supabase.rpc(claim ? "play_testing_claim" : "play_testing_status", claim ? {
    p_package: app.packageName, p_play_email: payload.playEmail.trim(), p_consent: true, p_group_confirmed: true, p_test_confirmed: true,
  } : { p_package: app.packageName });
  if (error) {
    console.error("play_testing_rpc_failed", error.code);
    const result = playCodeError(error);
    return json({ ok: false, message: result.message }, result.status);
  }
  const result = data as PlayCodeStatus;
  return json({ ok: true, ...result, message: playCodeMessage(result) });
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
