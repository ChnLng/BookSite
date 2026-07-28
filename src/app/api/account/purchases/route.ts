import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  const supabase = getSupabaseServiceClient();
  if (!user) return NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 });
  if (!supabase) return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
  const fields = "id, download_kind, book_id, book_title, resource_id, resource_title, resource_file_id, amount_paid, currency, payment_status, paid_at, refunded_at, invoice_number, download_count, last_downloaded_at, created_at";
  const filters = [`user_id.eq.${user.id}`];
  if (user.email) filters.push(`user_email.ilike.${user.email}`);
  const { data, error } = await supabase.from("downloads").select(fields).or(filters.join(",")).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, purchases: data || [] });
}
