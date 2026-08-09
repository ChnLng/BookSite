import { NextResponse } from "next/server";
import { books as fallbackBooks } from "@/data/books";
import { getUserFromRequest } from "@/lib/auth-request";
import { isUuid } from "@/lib/database-identifiers";
import { hasPurchasedBook } from "@/lib/purchase-access";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
  }

  const bookQuery = supabase
      .from("books")
      .select("id, slug, visible")
      .limit(1);
  const [{ data: book }, user] = await Promise.all([
    (isUuid(id) ? bookQuery.eq("id", id) : bookQuery.eq("slug", id)).maybeSingle(),
    getUserFromRequest(request),
  ]);

  const fallback = fallbackBooks.find((item) => item.id === id);

  if ((book && book.visible === false) || (!book && !fallback)) {
    return NextResponse.json({ ok: false, message: "Livre introuvable." }, { status: 404 });
  }

  if (!user) {
    return NextResponse.json({ ok: true, hasAccess: false, requiresLogin: true });
  }

  const hasAccess = await hasPurchasedBook(supabase, {
    userId: user.id,
    email: user.email,
    bookId: book?.slug || fallback?.id || id,
  });

  return NextResponse.json({ ok: true, hasAccess, requiresLogin: false });
}
