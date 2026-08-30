import "server-only";

import { createClient } from "@supabase/supabase-js";
import { selectLatestProducts, type LatestProduct, type LatestProductRow } from "@/lib/latest-products";
import { siteConfig } from "@/lib/site-config";

export async function loadLatestProducts(): Promise<LatestProduct[]> {
  if (!siteConfig.supabaseUrl || !siteConfig.supabaseAnonKey) return [];

  // Use public access only. Never expose drafts or paid document fields here.
  const supabase = createClient(siteConfig.supabaseUrl, siteConfig.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  const commonFields = "id, slug, title_fr, price_eur, created_at, visible, deleted_at";

  try {
    const [books, resources] = await Promise.all([
      supabase.from("books").select(`${commonFields}, cover_image`)
        .eq("visible", true).is("deleted_at", null).not("created_at", "is", null)
        .order("created_at", { ascending: false }).order("id", { ascending: true }).limit(2)
        .abortSignal(AbortSignal.timeout(5000)),
      supabase.from("resource_items").select(`${commonFields}, cover_image_url, qr_image_url`)
        .eq("visible", true).is("deleted_at", null).not("created_at", "is", null)
        .order("created_at", { ascending: false }).order("id", { ascending: true }).limit(2)
        .abortSignal(AbortSignal.timeout(5000)),
    ]);

    // A partial list could misidentify older items as the newest products.
    if (books.error || resources.error) return [];
    return selectLatestProducts(books.data as LatestProductRow[], resources.data as LatestProductRow[]);
  } catch {
    return [];
  }
}
