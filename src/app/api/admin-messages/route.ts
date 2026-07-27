import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { getSupabaseRequestClient, getSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user?.id || !user.email) {
    return NextResponse.json(
      { ok: false, message: "Veuillez vous connecter pour envoyer un email a l'administrateur." },
      { status: 401 },
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        pseudo?: string;
        email?: string;
        content?: string;
      }
    | null;

  const pseudo = String(payload?.pseudo || "").trim();
  const email = String(payload?.email || "").trim().toLowerCase();
  const content = String(payload?.content || "").trim();
  const visitorToken = request.headers.get("x-visitor-token")?.trim() || null;

  if (!content) {
    return NextResponse.json({ ok: false, message: "Message vide." }, { status: 400 });
  }

  if (email && email !== user.email.toLowerCase()) {
    return NextResponse.json({ ok: false, message: "Email invalide." }, { status: 400 });
  }

  const supabase =
    getSupabaseServiceClient() ||
    getSupabaseRequestClient(request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined);

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
  }

  const { error } = await supabase.from("admin_messages").insert({
    user_id: user.id,
    user_email: user.email,
    pseudo: pseudo || user.email.split("@")[0] || "Lecteur",
    content,
    visitor_token: visitorToken,
  });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Message envoye a l'administrateur avec succes !",
  });
}
