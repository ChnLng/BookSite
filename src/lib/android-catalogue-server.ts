import "server-only";
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/site-config";
import { defaultCatalogue, validateCatalogue, type CatalogueKind } from "@/lib/android-catalogue";

export async function loadAndroidCatalogue(kind: CatalogueKind) {
  if (!siteConfig.supabaseUrl || !siteConfig.supabaseAnonKey) return { config: defaultCatalogue(kind), setupNeeded: true };
  const client = createClient(siteConfig.supabaseUrl, siteConfig.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(6000) }) },
  });
  try {
    const { data, error } = await client.rpc("android_catalogue_read", { p_kind: kind });
    if (error) {
      // A missing migration may use the bundled edition. Any later outage fails
      // closed so an edition explicitly disabled by an admin is not restored.
      if (["PGRST202", "42883"].includes(error.code)) return { config: defaultCatalogue(kind), setupNeeded: true };
      return { config: null, unavailable: true };
    }
    if (data?.disabled) return { config: null, disabled: true };
    if (data?.configured === false) return { config: defaultCatalogue(kind), setupNeeded: false };
    const config = validateCatalogue(data?.config);
    return config.enabled ? { config, setupNeeded: false } : { config: null, disabled: true };
  } catch { return { config: null, unavailable: true }; }
}
