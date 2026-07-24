import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { books as staticBooks } from "@/data/books";
import {
  BOOK_PUBLIC_SELECT,
  getStaticDisplayBooks,
  mapBookRow,
  type BookRow,
  type DisplayBook,
} from "@/lib/books-service";
import { siteConfig } from "@/lib/site-config";

function createSupabaseServerClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || siteConfig.supabaseAnonKey;

  if (!siteConfig.supabaseUrl || !key) {
    return null;
  }

  return createClient(siteConfig.supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function loadPublicDisplayBooksRaw(): Promise<DisplayBook[]> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return getStaticDisplayBooks();
  }

  const { data } = await supabase
    .from("books")
    .select(BOOK_PUBLIC_SELECT)
    .eq("visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!data || data.length === 0) {
    return getStaticDisplayBooks();
  }

  return (data as BookRow[]).map((row) => {
    const fallback = staticBooks.find((book) => book.id === (row.slug || row.id));
    return mapBookRow(row, fallback);
  });
}

export const loadCachedPublicDisplayBooks = unstable_cache(loadPublicDisplayBooksRaw, ["public-display-books"], {
  revalidate: 300,
  tags: ["books"],
});
