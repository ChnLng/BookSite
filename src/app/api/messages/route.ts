import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/site-config";

type CommentRecord = {
  id: string;
  name: string;
  content: string;
  icon: string;
  createdAt: string;
  likeCount: number;
  likedByViewer: boolean;
};

const icons = ["✨", "🛸", "📖", "🍵", "🌙", "💫"];

const formatDateTime = (date: Date) =>
  date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeHeaderText(value: string) {
  return value.replace(/[\r\n"]/g, " ").trim();
}

function pickIcon(seed: string) {
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return icons[total % icons.length];
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

function createServerSupabaseClient(accessToken?: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || siteConfig.supabaseAnonKey;

  if (!siteConfig.supabaseUrl || !key) {
    return null;
  }

  return createClient(siteConfig.supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

async function getUserFromAccessToken(accessToken?: string) {
  if (!accessToken) {
    return null;
  }

  const supabase = createServerSupabaseClient(accessToken);

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function buildLikeStats(args: {
  supabase: ReturnType<typeof createServerSupabaseClient>;
  commentIds: string[];
  userId?: string | null;
  visitorToken?: string;
}) {
  const { supabase, commentIds, userId, visitorToken } = args;

  if (!supabase || commentIds.length === 0) {
    return new Map<string, { likeCount: number; likedByViewer: boolean }>();
  }

  const { data } = await supabase
    .from("comment_likes")
    .select("comment_id, user_id, visitor_token")
    .in("comment_id", commentIds);

  const stats = new Map<string, { likeCount: number; likedByViewer: boolean }>();

  for (const commentId of commentIds) {
    stats.set(commentId, { likeCount: 0, likedByViewer: false });
  }

  for (const row of data || []) {
    const current = stats.get(row.comment_id) || { likeCount: 0, likedByViewer: false };
    const likedByViewer =
      (userId && row.user_id === userId) ||
      (!userId && visitorToken && row.visitor_token === visitorToken);

    stats.set(row.comment_id, {
      likeCount: current.likeCount + 1,
      likedByViewer: current.likedByViewer || Boolean(likedByViewer),
    });
  }

  return stats;
}

export async function GET(request: Request) {
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;
  const visitorToken = request.headers.get("x-visitor-token")?.trim() || undefined;
  const user = await getUserFromAccessToken(accessToken);
  const supabase = createServerSupabaseClient(accessToken);
  
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
  }
  
  const { data } = await supabase
    .from("comments")
    .select("id, content, author_name, created_at")
    .order("created_at", { ascending: false })
    .limit(2);

  const rows = [...(data || [])].reverse();
  const likeStats = await buildLikeStats({
    supabase,
    commentIds: rows.map((item) => item.id),
    userId: user?.id,
    visitorToken,
  });

  const comments: CommentRecord[] = rows.map((item) => ({
    id: item.id,
    name: item.author_name || "Anonyme",
    content: item.content || "",
    icon: pickIcon(item.id),
    createdAt: item.created_at ? formatDateTime(new Date(item.created_at)) : "",
    likeCount: likeStats.get(item.id)?.likeCount || 0,
    likedByViewer: likeStats.get(item.id)?.likedByViewer || false,
  }));
  
  return NextResponse.json({ ok: true, comments });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const mode = String(formData.get("mode") || "site").trim();
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;

  if (!name || !content) {
    return NextResponse.json(
      { ok: false, message: "Nom et commentaire sont requis." },
      { status: 400 },
    );
  }

  const user = await getUserFromAccessToken(accessToken);
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
      const safeName = sanitizeHeaderText(name);
      const safeUserEmail = sanitizeHeaderText(userEmail);

      await mailer.transporter.sendMail({
        from: `"${safeName} via Visd AR" <${mailer.from}>`,
        sender: mailer.from,
        to: siteConfig.adminInbox,
        replyTo: `"${safeName}" <${safeUserEmail}>`,
        subject: `Message de ${safeName} via Visd AR`,
        text: [
          "Nouveau message depuis le site Visd AR",
          "",
          `Expediteur connecte: ${name}`,
          `Email de connexion: ${userEmail}`,
          "",
          "Commentaire:",
          content,
        ].join("\n"),
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
            <h2 style="margin-bottom: 12px;">Nouveau message depuis le site Visd AR</h2>
            <p><strong>Expediteur connecte :</strong> ${escapeHtml(name)}</p>
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

  const supabase = createServerSupabaseClient(accessToken);

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Configuration Supabase manquante sur le serveur." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      author_name: name,
      content: content,
      user_id: user?.id || null,
    })
    .select("id, author_name, content, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message || "Erreur lors de l'enregistrement." },
      { status: 500 },
    );
  }

  const comment: CommentRecord = {
    id: data.id,
    name: data.author_name || "Anonyme",
    content: data.content || "",
    icon: pickIcon(data.id),
    createdAt: data.created_at ? formatDateTime(new Date(data.created_at)) : "",
    likeCount: 0,
    likedByViewer: false,
  };

  return NextResponse.json({ ok: true, comment, message: "Commentaire ajouté." });
}
