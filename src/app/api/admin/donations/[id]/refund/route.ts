import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { paypalAccessToken, paypalBaseUrl } from "@/lib/paypal-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request); const token = request.headers.get("Authorization")?.replace("Bearer ", "") || undefined;
  if (!user || !(await isAdminUser(user, token))) return NextResponse.json({ ok: false, message: "Acces admin requis." }, { status: 403 });
  const supabase = getSupabaseServiceClient(); if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });
  const { id } = await context.params; const body = await request.json().catch(() => ({})) as { reason?: string };
  const { data } = await supabase.from("donations").select("*").eq("id", id).maybeSingle();
  if (!data?.paypal_capture_id) return NextResponse.json({ ok: false, message: "Identifiant de capture PayPal absent." }, { status: 400 });
  if (data.payment_status === "refunded") return NextResponse.json({ ok: false, message: "Don deja rembourse." }, { status: 409 });
  try {
    const accessToken = await paypalAccessToken();
    const response = await fetch(`${paypalBaseUrl()}/v2/payments/captures/${data.paypal_capture_id}/refund`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ note_to_payer: body.reason || "Remboursement demande" }) });
    const refund = await response.json() as { id?: string; message?: string }; if (!response.ok) throw new Error(refund.message || "Remboursement refuse.");
    const refundedAt = new Date().toISOString(); await supabase.from("donations").update({ payment_status: "refunded", refunded_at: refundedAt, refund_amount: data.amount, refund_reason: body.reason || null, refund_provider_id: refund.id || null }).eq("id", id);
    return NextResponse.json({ ok: true, refundedAt });
  } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Remboursement impossible." }, { status: 400 }); }
}
