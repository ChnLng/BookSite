import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/site-config";

type CommentLikeRow = {
  id: string;
  user_id: string | null;
  visitor_token: string | null;
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

async function ensureCommentExists(supabase: SupabaseClient, commentId: string) {
  const { data, error } = await supabase.from("comments").select("id").eq("id", commentId).maybeSingle();

  if (error) {
    return { ok: false as const, message: error.message, status: 500 };
  }

  if (!data?.id) {
    return { ok: false as const, message: "Commentaire introuvable.", status: 404 };
  }

  return { ok: true as const };
}

async function readExistingLike(
  supabase: SupabaseClient,
  commentId: string,
  userId?: string | null,
  visitorToken?: string,
) {
  const query = supabase.from("comment_likes").select("id").eq("comment_id", commentId).limit(1);

  if (userId) {
    return query.eq("user_id", userId).maybeSingle();
  }

  return query.is("user_id", null).eq("visitor_token", visitorToken || "").maybeSingle();
}

async function countLikes(
  supabase: SupabaseClient,
  commentId: string,
  userId?: string | null,
  visitorToken?: string,
) {
  const { data, error } = await supabase
    .from("comment_likes")
    .select("id, user_id, visitor_token")
    .eq("comment_id", commentId);

  if (error) {
    return { ok: false as const, message: error.message, status: 500 };
  }

  const rows = (data || []) as CommentLikeRow[];

  return {
    ok: true as const,
    likeCount: rows.length,
    liked: rows.some((row) =>
      userId ? row.user_id === userId : Boolean(visitorToken) && row.visitor_token === visitorToken,
    ),
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: commentId } = await params;
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;
  const visitorToken = request.headers.get("x-visitor-token")?.trim() || "";
  const user = await getUserFromAccessToken(accessToken);
  const supabase = createServerSupabaseClient(accessToken);

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
  }

  if (!user && !visitorToken) {
    return NextResponse.json(
      { ok: false, message: "Connexion ou identifiant visiteur requis." },
      { status: 400 },
    );
  }

  const commentCheck = await ensureCommentExists(supabase, commentId);

  if (!commentCheck.ok) {
    return NextResponse.json({ ok: false, message: commentCheck.message }, { status: commentCheck.status });
  }

  const { data: existingLike, error: existingError } = await readExistingLike(
    supabase,
    commentId,
    user?.id,
    visitorToken,
  );

  if (existingError) {
    return NextResponse.json({ ok: false, message: existingError.message }, { status: 500 });
  }

  if (existingLike?.id) {
    const { error } = await supabase.from("comment_likes").delete().eq("id", existingLike.id);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase.from("comment_likes").insert({
      comment_id: commentId,
      user_id: user?.id || null,
      visitor_token: user ? null : visitorToken,
    });

    if (error) {
      // Unique conflicts mean the like already exists in the database.
      if (error.code !== "23505") {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }
    }
  }

  const likeState = await countLikes(supabase, commentId, user?.id, visitorToken);

  if (!likeState.ok) {
    return NextResponse.json({ ok: false, message: likeState.message }, { status: likeState.status });
  }

  return NextResponse.json({
    ok: true,
    liked: likeState.liked,
    likeCount: likeState.likeCount,
  });
}
