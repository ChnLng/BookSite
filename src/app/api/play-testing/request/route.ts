import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { getSupabaseRequestClient } from "@/lib/supabase-server";
import { getPlayTestingApp, playTestingGroupEmail } from "@/lib/play-testing";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user?.id || !user.email) return NextResponse.json({ ok: false, message: "Connectez-vous pour faire votre demande." }, { status: 401 });
  const payload = await request.json().catch(() => null);
  const app = getPlayTestingApp(typeof payload?.packageName === "string" ? payload.packageName : "");
  const playEmail = typeof payload?.playEmail === "string" ? payload.playEmail.trim().toLowerCase() : "";
  if (!app || payload?.packageName !== app.packageName || payload?.consent !== true || playEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(playEmail)) {
    return NextResponse.json({ ok: false, message: "Vérifiez l’application, votre adresse Google Play et votre autorisation." }, { status: 400 });
  }
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const supabase = getSupabaseRequestClient(token);
  if (!supabase) return NextResponse.json({ ok: false, message: "Service momentanément indisponible." }, { status: 503 });

  // A stable primary key makes repeated/concurrent requests idempotent without
  // granting visitors read or update access to the administrator's inbox.
  const hash = createHash("sha256").update(`visdar-play-test:${user.id}:${app.packageName}`).digest("hex");
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  const { error } = await supabase.from("admin_messages").insert({
    id, user_id: user.id, user_email: user.email, email: user.email,
    pseudo: "Demande de test Google Play",
    visitor_token: `play-testing:${app.packageName}`,
    content: ["DEMANDE GRATUITE — TEST FERMÉ GOOGLE PLAY", `Application : ${app.title}`, `Package : ${app.packageName}`, `Compte Google Play déclaré : ${playEmail}`, `Groupe : ${playTestingGroupEmail}`, "Consentement : autorisation explicite reçue pour traiter la demande et l’accès au groupe.", "À vérifier : cette adresse est déclarée par le demandeur ; l’adhésion au groupe et l’opt-in ne sont pas confirmés.", "Aucun paiement, aucun code attribué automatiquement. Ne distribuer qu’un code unique après vérification."].join("\n"),
  });
  if (error && error.code !== "23505") return NextResponse.json({ ok: false, message: "Impossible d’enregistrer la demande pour le moment. Réessayez plus tard." }, { status: 503 });
  return NextResponse.json({ ok: true, message: error?.code === "23505"
    ? "Une demande existe déjà pour cette application. Attendez la réponse de Visd AR ; pour corriger votre adresse Google Play, contactez l’administrateur."
    : "Demande enregistrée auprès de Visd AR. Un administrateur vérifiera votre accès au test avant de vous transmettre un code, sous réserve de disponibilité." }, { headers: { "Cache-Control": "no-store" } });
}
