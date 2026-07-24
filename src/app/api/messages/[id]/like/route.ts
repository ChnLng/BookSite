import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/site-config";

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
    return NextResponse.json({ ok: false, message: "Identifiant visiteur manquant." }, { status: 400 });
  }

  const query = supabase
    .from("comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .limit(1);

  const { data: existingLike } = user
    ? await query.eq("user_id", user.id).maybeSingle()
    : await query.is("user_id", null).eq("visitor_token", visitorToken).maybeSingle();

  if (existingLike?.id) {
    const deleteQuery = supabase.from("comment_likes").delete().eq("id", existingLike.id);
    const { error } = await deleteQuery;

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
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
  }

  const { data: likes } = await supabase
    .from("comment_likes")
    .select("user_id, visitor_token")
    .eq("comment_id", commentId);

  const likeCount = (likes || []).length;
  const liked = (likes || []).some((row) =>
    user ? row.user_id === user.id : row.visitor_token === visitorToken,
  );

  return NextResponse.json({ ok: true, liked, likeCount });
}
