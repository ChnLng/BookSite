import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { siteConfig } from "@/lib/site-config";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type CommentRecord = {
  id: string;
  name: string;
  content: string;
  badge: string;
  icon: string;
  createdAt: string;
};

const icons = ["✨", "🛸", "📖", "🍵", "🌙", "💫"];
const badgeTemplates = ["coup de cœur", "appréciation", "suggestion", "merci", "échange"];

const formatDateTime = (date: Date) =>
  date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const makeBadge = (index: number) => {
  const category = badgeTemplates[index % badgeTemplates.length];
  const number = index + 1;
  return `${number}e ${category}`;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createMailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.office365.com";
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || user;

  if (!user || !pass || !from) {
    return null;
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    }),
    from,
  };
}

export async function GET() {
  const supabase = getSupabaseServiceClient();
  
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
  }
  
  const { data } = await supabase
    .from("comments")
    .select("id, content, author_name, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  
  const comments: CommentRecord[] = (data || []).map((item, index) => ({
    id: item.id,
    name: item.author_name || "Anonyme",
    content: item.content || "",
    badge: makeBadge(index),
    icon: icons[Math.floor(Math.random() * icons.length)],
    createdAt: item.created_at ? formatDateTime(new Date(item.created_at)) : "",
  }));
  
  return NextResponse.json({ ok: true, comments });
}

export async function POST(request: Request) {
  const supabase = getSupabaseServiceClient();
  
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
  }
  
  const formData = await request.formData();
  const name = String(formData.get("name") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const mode = String(formData.get("mode") || "site").trim();

  if (!name || !content) {
    return NextResponse.json(
      { ok: false, message: "Nom et commentaire sont requis." },
      { status: 400 },
    );
  }

  const user = await getUserFromRequest(request);
  const userEmail = user?.email || null;

  if (mode === "email") {
    if (!user || !userEmail) {
      return NextResponse.json(
        { ok: false, message: "Connexion requise pour envoyer un email a l'administrateur." },
        { status: 401 },
      );
    }

    const mailer = createMailTransporter();

    if (!mailer) {
      return NextResponse.json(
        { ok: false, message: "Configuration email manquante sur le serveur." },
        { status: 503 },
      );
    }

    try {
      await mailer.transporter.sendMail({
        from: mailer.from,
        to: siteConfig.adminInbox,
        replyTo: userEmail,
        subject: `Nouveau commentaire Visd AR de ${name}`,
        text: [
          "Nouveau message depuis le site Visd AR",
          "",
          `Nom: ${name}`,
          `Email de connexion: ${userEmail}`,
          "",
          "Commentaire:",
          content,
        ].join("\n"),
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
            <h2 style="margin-bottom: 12px;">Nouveau message depuis le site Visd AR</h2>
            <p><strong>Nom :</strong> ${escapeHtml(name)}</p>
            <p><strong>Email de connexion :</strong> ${escapeHtml(userEmail)}</p>
            <p><strong>Commentaire :</strong></p>
            <div style="padding: 14px 16px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0;">
              ${escapeHtml(content).replace(/\n/g, "<br />")}
            </div>
          </div>
        `,
      });
    } catch {
      return NextResponse.json(
        { ok: false, message: "Impossible d'envoyer l'email pour le moment." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, message: "Message envoye a l'administrateur." });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      author_name: name,
      content: content,
      user_id: user?.id || null,
      user_email: userEmail,
    })
    .select("id, author_name, content, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Erreur lors de l'enregistrement." },
      { status: 500 },
    );
  }

  const comment: CommentRecord = {
    id: data.id,
    name: data.author_name || "Anonyme",
    content: data.content || "",
    badge: makeBadge(0),
    icon: icons[Math.floor(Math.random() * icons.length)],
    createdAt: data.created_at ? formatDateTime(new Date(data.created_at)) : "",
  };

  return NextResponse.json({ ok: true, comment, message: "Commentaire ajouté." });
}
