import "server-only";

import { createClient } from "@supabase/supabase-js";
import { playTestingApps } from "@/lib/play-testing";
import { siteConfig } from "@/lib/site-config";

type ResourceRow = {
  id: string;
  slug: string | null;
  summary_fr: string | null;
};

/**
 * The mobile guide deliberately mirrors the public product pages. Product
 * descriptions remain editable in the existing resource administration area,
 * rather than becoming a second, stale copy in the catalogue configuration.
 */
export async function loadAndroidMobileGuideDescriptions(): Promise<Record<string, string>> {
  if (!siteConfig.supabaseUrl || !siteConfig.supabaseAnonKey) return {};

  const client = createClient(siteConfig.supabaseUrl, siteConfig.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(6000) }) },
  });

  try {
    const { data, error } = await client
      .from("resource_items")
      .select("id, slug, summary_fr")
      .eq("visible", true);
    if (error) return {};

    const rows = (data || []) as ResourceRow[];
    return Object.fromEntries(playTestingApps.flatMap((app) => {
      const row = rows.find((resource) => app.resourceRefs.includes(resource.id) || Boolean(resource.slug && app.resourceRefs.includes(resource.slug)));
      return row?.summary_fr?.trim() ? [[app.packageName, row.summary_fr.trim()]] : [];
    }));
  } catch {
    return {};
  }
}
