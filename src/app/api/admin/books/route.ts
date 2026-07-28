import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type BookPayload = {
  slug: string;
  category_id?: string | null;
  sort_order: number;
  title_fr: string;
  title_zh: string;
  asin?: string | null;
  visible: boolean;
  price_eur: number;
  cover_image?: string | null;
  pdf_file?: string | null;
  synopsis_fr?: string | null;
  synopsis_zh?: string | null;
  amazon_ebook_url?: string | null;
  amazon_paperback_url?: string | null;
  related_book_ids?: string[] | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function requireAdmin(request: Request) {
  const user = await getUserFromRequest(request);
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;

  if (!user) {
    return { error: NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 }) };
  }

  const admin = await isAdminUser(user, accessToken);

  if (!admin) {
    return { error: NextResponse.json({ ok: false, message: "Acces admin requis." }, { status: 403 }) };
  }

  return { user };
}

async function resolveBookRowId(bookRef: string) {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant.");
  }

  const query = isUuid(bookRef)
    ? supabase.from("books").select("id, slug").or(`id.eq.${bookRef},slug.eq.${bookRef}`).limit(1).maybeSingle()
    : supabase.from("books").select("id, slug").eq("slug", bookRef).limit(1).maybeSingle();

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data?.id || null;
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);

  if (auth.error) {
    return auth.error;
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "SUPABASE_SERVICE_ROLE_KEY manquant." }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as { payload?: BookPayload } | null;

  if (!payload?.payload?.slug || !payload.payload.title_fr || !payload.payload.title_zh) {
    return NextResponse.json({ ok: false, message: "Informations du livre incompletes." }, { status: 400 });
  }

  const { data, error } = await supabase.from("books").insert(payload.payload).select("id, slug").single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, book: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);

  if (auth.error) {
    return auth.error;
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "SUPABASE_SERVICE_ROLE_KEY manquant." }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        action?: "save" | "toggleVisibility" | "move" | "restore";
        bookId?: string;
        payload?: BookPayload;
        visible?: boolean;
        targetBookId?: string;
        currentSortOrder?: number;
        targetSortOrder?: number;
      }
    | null;

  if (!payload?.action || !payload.bookId) {
    return NextResponse.json({ ok: false, message: "Action admin invalide." }, { status: 400 });
  }

  try {
    if (payload.action === "save") {
      if (!payload.payload?.slug || !payload.payload.title_fr || !payload.payload.title_zh) {
        return NextResponse.json({ ok: false, message: "Informations du livre incompletes." }, { status: 400 });
      }

      const existingId = await resolveBookRowId(payload.bookId);

      if (existingId) {
        const { error } = await supabase.from("books").update(payload.payload).eq("id", existingId);

        if (error) {
          return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, mode: "update" });
      }

      const { error } = await supabase.from("books").upsert(payload.payload, { onConflict: "slug" });

      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, mode: "upsert" });
    }

    if (payload.action === "toggleVisibility") {
      const existingId = await resolveBookRowId(payload.bookId);

      if (!existingId) {
        return NextResponse.json({ ok: false, message: "Livre introuvable dans la base." }, { status: 404 });
      }

      const { error } = await supabase.from("books").update({ visible: Boolean(payload.visible) }).eq("id", existingId);

      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (payload.action === "move") {
      if (!payload.targetBookId) {
        return NextResponse.json({ ok: false, message: "Livre cible manquant." }, { status: 400 });
      }

      const currentId = await resolveBookRowId(payload.bookId);
      const targetId = await resolveBookRowId(payload.targetBookId);

      if (!currentId || !targetId) {
        return NextResponse.json({ ok: false, message: "Livre introuvable dans la base." }, { status: 404 });
      }

      const [{ error: currentError }, { error: targetError }] = await Promise.all([
        supabase.from("books").update({ sort_order: payload.targetSortOrder ?? 0 }).eq("id", currentId),
        supabase.from("books").update({ sort_order: payload.currentSortOrder ?? 0 }).eq("id", targetId),
      ]);

      if (currentError || targetError) {
        return NextResponse.json(
          { ok: false, message: currentError?.message || targetError?.message || "Tri impossible." },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (payload.action === "restore") {
      const existingId = await resolveBookRowId(payload.bookId);
      if (!existingId) {
        return NextResponse.json({ ok: false, message: "Livre supprime introuvable." }, { status: 404 });
      }
      const { error } = await supabase
        .from("books")
        .update({ deleted_at: null, visible: payload.visible !== false })
        .eq("id", existingId);
      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, message: "Action admin inconnue." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Operation impossible." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);

  if (auth.error) {
    return auth.error;
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "SUPABASE_SERVICE_ROLE_KEY manquant." }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as { bookId?: string } | null;

  if (!payload?.bookId) {
    return NextResponse.json({ ok: false, message: "Livre manquant." }, { status: 400 });
  }

  try {
    const existingId = await resolveBookRowId(payload.bookId);

    if (!existingId) {
      return NextResponse.json({ ok: false, message: "Livre introuvable dans la base." }, { status: 404 });
    }

    const { error } = await supabase
      .from("books")
      .update({ deleted_at: new Date().toISOString(), visible: false })
      .eq("id", existingId);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Suppression impossible." },
      { status: 500 },
    );
  }
}
