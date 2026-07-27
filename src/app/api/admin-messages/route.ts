import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { getSupabaseRequestClient, getSupabaseServiceClient } from "@/lib/supabase-server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user?.id || !user.email) {
    return NextResponse.json(
      { ok: false, message: "Veuillez vous connecter pour envoyer un message a l'administrateur." },
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

  // 1. 存入数据库
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

  // 2. 发送真实邮件到你的 Outlook
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-mail.outlook.com",
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: process.env.EMAIL_USER, // 你的发信邮箱 (visdar@outlook.fr)
        pass: process.env.EMAIL_PASS, // 你的 Outlook 专用应用密码 (Mot de passe d'application)
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: "visdar@outlook.fr",
      subject: `[BookSite] Nouveau message de ${pseudo || user.email}`,
      text: `De: ${pseudo} (${user.email})\n\nMessage:\n${content}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h3 style="color: #6366f1;">Nouveau message reçu sur BookSite</h3>
          <p><strong>De :</strong> ${pseudo} (${user.email})</p>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="white-space: pre-wrap; font-size: 15px; color: #333;">${content}</p>
        </div>
      `,
    });
  } catch (mailErr) {
    console.error("Erreur d'envoi d'email:", mailErr);
    // 即使邮件发送因网络或配置延迟，数据库已经存好了，不影响整体成功提示
  }

  return NextResponse.json({
    ok: true,
    message: "Message envoyé à l'administrateur avec succès !",
  });
}