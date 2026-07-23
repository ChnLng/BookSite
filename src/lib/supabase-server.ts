import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/site-config";

export function getSupabaseServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!siteConfig.supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(siteConfig.supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
