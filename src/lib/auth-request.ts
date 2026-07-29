import type { User } from "@supabase/supabase-js";
import { getSupabaseRequestClient, getSupabaseServiceClient } from "@/lib/supabase-server";

// Server-only emergency allowlist. Never expose the administrator list through
// a NEXT_PUBLIC_* variable because those values are bundled into browser code.
const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

export async function getUserFromRequest(request: Request): Promise<User | null> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getSupabaseRequestClient(token);

  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
}

export async function isAdminUser(user: User, accessToken?: string): Promise<boolean> {
  const email = user.email?.toLowerCase() || "";

  if (email && adminEmails.includes(email)) {
    return true;
  }

  const serviceClient = getSupabaseServiceClient() || getSupabaseRequestClient(accessToken);

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
