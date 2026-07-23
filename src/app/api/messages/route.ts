import { NextResponse } from "next/server";
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

  if (!name || !content) {
    return NextResponse.json(
      { ok: false, message: "Nom et commentaire sont requis." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      author_name: name,
      content: content,
      user_id: null, // 匿名评论
      user_email: null,
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
