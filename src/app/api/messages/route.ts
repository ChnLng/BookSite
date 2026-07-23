import { NextResponse } from "next/server";

type CommentRecord = {
  id: string;
  name: string;
  content: string;
  badge: string;
  icon: string;
  createdAt: string;
};

const comments: CommentRecord[] = [];

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
  return NextResponse.json({ ok: true, comments });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") || "").trim();
  const content = String(formData.get("content") || "").trim();

  if (!name || !content) {
    return NextResponse.json(
      { ok: false, message: "Nom et commentaire sont requis." },
      { status: 400 },
    );
  }

  const comment: CommentRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    content,
    badge: makeBadge(comments.length),
    icon: icons[Math.floor(Math.random() * icons.length)],
    createdAt: formatDateTime(new Date()),
  };

  comments.push(comment);

  if (comments.length > 2) {
    comments.shift();
  }

  return NextResponse.json({ ok: true, comment, message: "Commentaire ajouté." });
}
