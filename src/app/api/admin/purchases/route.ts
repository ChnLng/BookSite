import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  const token = request.headers.get("Authorization")?.replace("Bearer ", "") || undefined;
  if (!user || !(await isAdminUser(user, token))) return NextResponse.json({ ok: false }, { status: 403 });
  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });
  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() || "";
  const [{ data, error }, { data: profiles }] = await Promise.all([
    supabase.from("downloads").select("id, user_id, user_email, download_kind, book_id, book_title, resource_id, resource_title, amount_paid, currency, payment_status, paid_at, refunded_at, refund_amount, refund_reason, paypal_order_id, paypal_capture_id, stripe_session_id, stripe_payment_intent_id, invoice_number, download_count, last_downloaded_at, created_at").order("paid_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email, display_name"),
  ]);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  const names = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const purchases = (data || []).map((row) => ({ ...row, user_name: names.get(row.user_id)?.display_name || "", user_email: row.user_email || names.get(row.user_id)?.email || "" })).filter((row) => {
    if (!q) return true;
    return [row.user_name, row.user_email, row.book_title, row.resource_title, row.created_at, row.paid_at].some((value) => String(value || "").toLowerCase().includes(q));
  });
  return NextResponse.json({ ok: true, purchases });
}
