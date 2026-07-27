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

export function getSupabaseRequestClient(accessToken?: string) {
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || siteConfig.supabaseAnonKey;

  if (!siteConfig.supabaseUrl || !apiKey) {
    return null;
  }

  return createClient(siteConfig.supabaseUrl, apiKey, {
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
