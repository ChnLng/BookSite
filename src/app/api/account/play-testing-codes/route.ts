import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { playCodeError } from "@/lib/play-code-inventory";
import { getSupabaseRequestClient } from "@/lib/supabase-server";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Authorization",
  "Referrer-Policy": "no-referrer",
};

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user?.id) {
    return NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401, headers });
  }

  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const supabase = getSupabaseRequestClient(token);
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service momentanément indisponible." }, { status: 503, headers });
  }

  const { data, error } = await supabase.rpc("play_testing_account_codes");
  if (error) {
    console.error("play_testing_account_codes_failed", error.code);
    const result = playCodeError(error);
    return NextResponse.json({ ok: false, message: result.message }, { status: result.status, headers });
  }

  return NextResponse.json({ ok: true, codes: data || [] }, { headers });
}
