import { createClient, type User } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/site-config";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

export async function getUserFromRequest(request: Request): Promise<User | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token || !siteConfig.supabaseUrl || !siteConfig.supabaseAnonKey) {
    return null;
  }

  const supabase = createClient(siteConfig.supabaseUrl, siteConfig.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function isAdminUser(user: User): Promise<boolean> {
  const email = user.email?.toLowerCase() || "";

  if (email && adminEmails.includes(email)) {
    return true;
  }

  const serviceClient = getSupabaseServiceClient();

  if (!serviceClient) {
    return false;
  }

  const { data } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return data?.role === "admin";
}
