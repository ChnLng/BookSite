import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { getSupabaseRequestClient, getSupabaseServiceClient } from "@/lib/supabase-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

  const finalEmail = email || user.email;

  // 1. 存入数据库
  const { error } = await supabase.from("admin_messages").insert({
    user_id: user.id,
    email: finalEmail,
    user_email: user.email,
    pseudo: pseudo || user.email.split("@")[0] || "Lecteur",
    content,
    visitor_token: visitorToken,
  });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  // 2. 通过 Resend 发送真实邮件到你的 Outlook
  try {
    await resend.emails.send({
      from: "BookSite <onboarding@resend.dev>",
      to: ["visdar@outlook.fr"],
      subject: `[BookSite] Nouveau message de ${pseudo || user.email}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h3 style="color: #6366f1;">Nouveau message reçu sur BookSite</h3>
          <p><strong>De :</strong> ${pseudo} (${finalEmail})</p>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="white-space: pre-wrap; font-size: 15px; color: #333;">${content}</p>
        </div>
      `,
    });
  } catch (mailErr: any) {
    console.error("Erreur Resend:", mailErr);
  }

  return NextResponse.json({
    ok: true,
    message: "Message envoyé à l'administrateur avec succès !",
  });
}