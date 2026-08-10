import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { richTextToPlainText } from "@/lib/rich-text";
import { getSupabaseRequestClient, getSupabaseServiceClient } from "@/lib/supabase-server";

type ReviewSource = "home" | "book" | "resource";

type AdminReview = {
  id: string;
  source: ReviewSource;
  entityId: string | null;
  locationLabel: string;
  locationHref: string;
  authorName: string;
  userEmail: string;
  rating: number | null;
  content: string;
  visible: boolean;
  createdAt: string | null;
};

async function requireAdmin(request: Request) {
  const user = await getUserFromRequest(request);
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;

  if (!user) {
    return { error: NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 }) };
  }

  if (!(await isAdminUser(user, accessToken))) {
    return { error: NextResponse.json({ ok: false, message: "Accès administrateur requis." }, { status: 403 }) };
  }

  return { accessToken };
}

function getAdminSupabase(accessToken?: string) {
  return getSupabaseServiceClient() || getSupabaseRequestClient(accessToken);
}

function profileValue(
  profiles: Map<string, { email?: string | null; display_name?: string | null }>,
  userId: string | null | undefined,
) {
  return userId ? profiles.get(userId) : undefined;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const supabase = getAdminSupabase(auth.accessToken);
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Client Supabase administrateur indisponible." }, { status: 503 });
  }

  const [bookResult, resourceResult, profileResult, booksResult, resourcesResult] = await Promise.all([
    supabase
      .from("book_reviews")
      .select("id, book_id, user_id, user_email, author_name, rating, review_text, visible, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("resource_reviews")
      .select("id, resource_id, user_id, user_email, author_name, rating, review_text, visible, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email, display_name"),
    supabase.from("books").select("id, slug, title_fr, title_zh"),
    supabase.from("resource_items").select("id, slug, title_fr"),
  ]);

  const homeResult = await supabase
    .from("comments")
    .select("id, user_id, user_email, author_name, content, visible, created_at")
    .order("created_at", { ascending: false });
  let homeSupportsVisibility = true;
  let homeRows = (homeResult.data || []) as Array<{
    id: string;
    user_id: string | null;
    user_email?: string | null;
    author_name: string | null;
    content: string | null;
    visible?: boolean | null;
    created_at: string | null;
  }>;
  let homeError = homeResult.error;

  if (homeResult.error) {
    const fallback = await supabase
      .from("comments")
      .select("id, user_id, author_name, content, created_at")
      .order("created_at", { ascending: false });

    if (!fallback.error) {
      homeSupportsVisibility = false;
      homeRows = fallback.data || [];
      homeError = null;
    }
  }

  const fatalError = bookResult.error || resourceResult.error || homeError;
  if (fatalError) {
    return NextResponse.json({ ok: false, message: fatalError.message }, { status: 500 });
  }

  const profiles = new Map(
    (profileResult.data || []).map((profile) => [profile.id, profile]),
  );
  const books = new Map<string, { slug?: string | null; title_fr?: string | null; title_zh?: string | null }>();
  for (const book of booksResult.data || []) {
    books.set(String(book.id), book);
    if (book.slug) books.set(String(book.slug), book);
  }
  const resources = new Map((resourcesResult.data || []).map((resource) => [String(resource.id), resource]));

  const homeReviews: AdminReview[] = homeRows.map((row) => {
    const profile = profileValue(profiles, row.user_id);
    return {
      id: row.id,
      source: "home",
      entityId: null,
      locationLabel: "主页 Accueil",
      locationHref: "/#commentaires",
      authorName: row.author_name || profile?.display_name || "Anonyme",
      userEmail: row.user_email || profile?.email || "",
      rating: null,
      content: row.content || "",
      visible: homeSupportsVisibility ? row.visible !== false : true,
      createdAt: row.created_at || null,
    };
  });

  const bookReviews: AdminReview[] = (bookResult.data || []).map((row) => {
    const profile = profileValue(profiles, row.user_id);
    const book = books.get(String(row.book_id));
    const slug = book?.slug || String(row.book_id);
    const title = richTextToPlainText(book?.title_fr || book?.title_zh) || String(row.book_id);
    return {
      id: row.id,
      source: "book",
      entityId: String(row.book_id),
      locationLabel: `图书 Livre · ${title}`,
      locationHref: `/livres/${slug}`,
      authorName: row.author_name || profile?.display_name || "Lecteur",
      userEmail: row.user_email || profile?.email || "",
      rating: Number(row.rating || 0),
      content: row.review_text || "",
      visible: row.visible !== false,
      createdAt: row.created_at || null,
    };
  });

  const resourceReviews: AdminReview[] = (resourceResult.data || []).map((row) => {
    const profile = profileValue(profiles, row.user_id);
    const resource = resources.get(String(row.resource_id));
    const slug = resource?.slug || String(row.resource_id);
    const title = richTextToPlainText(resource?.title_fr) || String(row.resource_id);
    return {
      id: row.id,
      source: "resource",
      entityId: String(row.resource_id),
      locationLabel: `工具 Outil · ${title}`,
      locationHref: `/outils/${slug}`,
      authorName: row.author_name || profile?.display_name || "Lecteur",
      userEmail: row.user_email || profile?.email || "",
      rating: Number(row.rating || 0),
      content: row.review_text || "",
      visible: row.visible !== false,
      createdAt: row.created_at || null,
    };
  });

  const reviews = [...homeReviews, ...bookReviews, ...resourceReviews].sort((left, right) => {
    return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
  });

  return NextResponse.json({
    ok: true,
    reviews,
    homeSupportsVisibility,
    warnings: [profileResult.error, booksResult.error, resourcesResult.error]
      .filter(Boolean)
      .map((error) => error?.message || ""),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const supabase = getAdminSupabase(auth.accessToken);
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Client Supabase administrateur indisponible." }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { id?: string; source?: ReviewSource; visible?: boolean }
    | null;
  const id = String(payload?.id || "").trim();
  const source = payload?.source;

  if (!id || !source || !["home", "book", "resource"].includes(source)) {
    return NextResponse.json({ ok: false, message: "Évaluation introuvable." }, { status: 400 });
  }

  const table = source === "home" ? "comments" : source === "book" ? "book_reviews" : "resource_reviews";
  const { error } = await supabase.from(table).update({ visible: Boolean(payload?.visible) }).eq("id", id);

  if (error) {
    const migrationHint = source === "home" && /visible|column|schema cache/i.test(error.message)
      ? " Exécutez d’abord la migration Supabase 20260810_admin_review_moderation.sql."
      : "";
    return NextResponse.json({ ok: false, message: `${error.message}${migrationHint}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
