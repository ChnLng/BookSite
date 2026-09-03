import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { playTestingApps } from "@/lib/play-testing";
import { siteConfig } from "@/lib/site-config";
import { getSupabaseRequestClient, getSupabaseServiceClient } from "@/lib/supabase-server";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Authorization",
  "Referrer-Policy": "no-referrer",
};
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RequestPayload = {
  packageNames?: unknown;
  playEmail?: unknown;
  consent?: unknown;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createMailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.office365.com";
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || user;

  if (!user || !pass || !from) return null;

  return {
    from,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
  };
}

async function notifyAdmin(args: { accountEmail: string; playEmail: string; appTitles: string[] }) {
  const mailer = createMailTransporter();
  if (!mailer) return false;

  const { accountEmail, playEmail, appTitles } = args;
  const appsText = appTitles.map((title) => `• ${title}`).join("\n");
  await mailer.transporter.sendMail({
    from: `"Visd AR — demandes de test" <${mailer.from}>`,
    sender: mailer.from,
    to: siteConfig.adminInbox,
    replyTo: playEmail,
    subject: `Demande gratuite Google Play — ${appTitles.length} application${appTitles.length > 1 ? "s" : ""}`,
    text: [
      "Nouvelle demande de test Google Play depuis visdar.fr",
      "",
      `Compte Visd AR : ${accountEmail}`,
      `Compte Google Play déclaré : ${playEmail}`,
      "",
      "Applications demandées :",
      appsText,
      "",
      "Rappel : ce test est gratuit. Le demandeur a été informé de ne réaliser aucun achat.",
      "Traiter sous 48 heures ou répondre à cette demande.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <h2 style="margin:0 0 16px;color:#4c357a">Nouvelle demande de test Google Play</h2>
        <p><strong>Compte Visd AR :</strong> ${escapeHtml(accountEmail)}</p>
        <p><strong>Compte Google Play déclaré :</strong> ${escapeHtml(playEmail)}</p>
        <p><strong>Applications demandées :</strong></p>
        <ul>${appTitles.map((title) => `<li>${escapeHtml(title)}</li>`).join("")}</ul>
        <p style="padding:12px 14px;border-radius:12px;background:#fff6df"><strong>Test gratuit :</strong> le demandeur a été informé de ne réaliser aucun achat. Traiter sous 48 heures.</p>
      </div>`,
  });
  return true;
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user?.id || !user.email) {
    return NextResponse.json({ ok: false, message: "Connectez-vous à Visd AR avant d’envoyer votre demande." }, { status: 401, headers });
  }

  const payload = await request.json().catch(() => null) as RequestPayload | null;
  const packageNames = Array.isArray(payload?.packageNames)
    ? [...new Set(payload.packageNames.filter((value): value is string => typeof value === "string"))]
    : [];
  const selectedApps = packageNames
    .map((packageName) => playTestingApps.find((app) => app.packageName === packageName))
    .filter((app): app is (typeof playTestingApps)[number] => Boolean(app));
  const playEmail = typeof payload?.playEmail === "string" ? payload.playEmail.trim().toLowerCase() : "";

  if (!packageNames.length || packageNames.length !== selectedApps.length || selectedApps.length > playTestingApps.length) {
    return NextResponse.json({ ok: false, message: "Choisissez au moins une application proposée." }, { status: 400, headers });
  }
  if (!emailPattern.test(playEmail) || playEmail.length > 254) {
    return NextResponse.json({ ok: false, message: "Saisissez l’adresse e-mail associée à Google Play." }, { status: 400, headers });
  }
  if (payload?.consent !== true) {
    return NextResponse.json({ ok: false, message: "Confirmez l’autorisation de traitement de votre demande." }, { status: 400, headers });
  }

  const accessToken = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const supabase = getSupabaseServiceClient() || getSupabaseRequestClient(accessToken);
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Le service de demande est momentanément indisponible. Contactez visdar@outlook.fr." }, { status: 503, headers });
  }

  const appTitles = selectedApps.map((app) => app.title);
  const content = [
    "Demande gratuite de test Google Play",
    `Compte Google Play déclaré : ${playEmail}`,
    "",
    "Applications demandées :",
    ...appTitles.map((title) => `- ${title}`),
    "",
    "Le demandeur a confirmé le traitement de cette adresse pour son accès de test. Aucun achat ne doit être effectué.",
  ].join("\n");
  const visitorToken = `play-testing:manual:${user.id}`;
  const baseMessage = {
    user_id: user.id,
    user_email: user.email,
    email: playEmail,
    pseudo: "Demande de test Google Play",
    content,
    visitor_token: visitorToken,
  };

  let insert = await supabase.from("admin_messages").insert(baseMessage);
  if (insert.error && /email|column|schema cache/i.test(insert.error.message)) {
    insert = await supabase.from("admin_messages").insert({
      user_id: user.id,
      user_email: user.email,
      pseudo: "Demande de test Google Play",
      content,
      visitor_token: visitorToken,
    });
  }
  if (insert.error) {
    return NextResponse.json({ ok: false, message: "Impossible d’enregistrer votre demande. Contactez visdar@outlook.fr." }, { status: 500, headers });
  }

  try {
    await notifyAdmin({ accountEmail: user.email, playEmail, appTitles });
  } catch (error) {
    console.error("play_testing_manual_notification_failed", error);
  }

  return NextResponse.json({
    ok: true,
    message: "Votre demande gratuite a bien été envoyée à Visd AR. Elle sera traitée sous 48 heures maximum ; aucun achat n’est nécessaire.",
  }, { headers });
}
