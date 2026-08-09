import "server-only";

import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/site-config";

export type PublicResourceSeo = {
  id: string;
  slug: string;
  titleFr: string;
  summaryFr: string;
  coverImageUrl: string;
  priceEur: number;
  createdAt: string | null;
};

export async function loadPublicResourcesForSeo(): Promise<PublicResourceSeo[]> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || siteConfig.supabaseAnonKey;
  if (!siteConfig.supabaseUrl || !key) return [];

  const supabase = createClient(siteConfig.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("resource_items")
    .select("id, slug, title_fr, summary_fr, cover_image_url, qr_image_url, price_eur, created_at")
    .eq("visible", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data || []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug || row.id),
    titleFr: String(row.title_fr || "Ressource numérique"),
    summaryFr: String(row.summary_fr || "Ressource numérique pour apprendre le chinois en français."),
    coverImageUrl: String(row.cover_image_url || row.qr_image_url || "/images/site-icon-512.png"),
    priceEur: Number(row.price_eur || 0),
    createdAt: row.created_at ? String(row.created_at) : null,
  }));
}
