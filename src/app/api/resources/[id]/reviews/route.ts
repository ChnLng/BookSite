import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isUuid } from "@/lib/database-identifiers";
import { siteConfig } from "@/lib/site-config";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

async function resolveResourceId(idOrSlug: string, accessToken?: string) {
  const supabase = createServerSupabaseClient(accessToken);

  if (!supabase) {
    return null;
  }

  const query = supabase
    .from("resource_items")
    .select("id, slug")
    .limit(1);
  const { data } = await (isUuid(idOrSlug) ? query.eq("id", idOrSlug) : query.eq("slug", idOrSlug)).maybeSingle();

  return data?.id || null;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;
  const supabase = createServerSupabaseClient(accessToken);
  const resourceId = await resolveResourceId(id, accessToken);

  if (!supabase || !resourceId) {
    return NextResponse.json({
      ok: true,
      summary: {
        averageRating: 0,
        totalReviews: 0,
      },
      reviews: [],
    });
  }

  const { data, error } = await supabase
    .from("resource_reviews")
    .select("id, author_name, rating, review_text, created_at")
    .eq("resource_id", resourceId)
    .eq("visible", true)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const reviews = (data || []).map((row) => ({
    id: row.id,
    authorName: row.author_name || "Lecteur",
    rating: Number(row.rating || 0),
    reviewText: row.review_text || "",
    createdAt: row.created_at || null,
  }));

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1))
      : 0;

  return NextResponse.json({
    ok: true,
    summary: {
      averageRating,
      totalReviews,
    },
    reviews,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;
  const payload = (await request.json().catch(() => null)) as
    | {
        authorName?: string;
        rating?: number;
        reviewText?: string;
      }
    | null;

  const rating = Number(payload?.rating || 0);
  const reviewText = String(payload?.reviewText || "").trim();
  const suppliedName = String(payload?.authorName || "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !reviewText) {
    return NextResponse.json(
      { ok: false, message: "Merci d'indiquer une note de 1 a 5 et un avis." },
      { status: 400 },
    );
  }

  const resourceId = await resolveResourceId(id, accessToken);

  if (!resourceId) {
    return NextResponse.json({ ok: false, message: "Ressource introuvable." }, { status: 404 });
  }

  const supabase = createServerSupabaseClient(accessToken);

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Configuration Supabase manquante." }, { status: 503 });
  }

  const user = await getUserFromAccessToken(accessToken);
  const authorName =
    suppliedName ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Lecteur";

  const basePayload = {
    resource_id: resourceId,
    user_id: user?.id || null,
    user_email: user?.email || null,
    author_name: authorName,
    rating,
    review_text: reviewText,
    visible: true,
    updated_at: new Date().toISOString(),
  };

  if (user?.id) {
    const { data: existing } = await supabase
      .from("resource_reviews")
      .select("id, created_at")
      .eq("resource_id", resourceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from("resource_reviews")
        .update(basePayload)
        .eq("id", existing.id)
        .select("id, author_name, rating, review_text, created_at")
        .single();

      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        review: {
          id: data.id,
          authorName: data.author_name || "Lecteur",
          rating: Number(data.rating || 0),
          reviewText: data.review_text || "",
          createdAt: data.created_at || null,
        },
      });
    }
  }

  const { data, error } = await supabase
    .from("resource_reviews")
    .insert({
      ...basePayload,
      created_at: new Date().toISOString(),
    })
    .select("id, author_name, rating, review_text, created_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    review: {
      id: data.id,
      authorName: data.author_name || "Lecteur",
      rating: Number(data.rating || 0),
      reviewText: data.review_text || "",
      createdAt: data.created_at || null,
    },
  });
}
