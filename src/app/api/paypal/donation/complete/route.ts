import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { paypalAccessToken, paypalBaseUrl } from "@/lib/paypal-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as { orderId?: string; captureId?: string; note?: string } | null;
  const orderId = String(payload?.orderId || "").trim();
  if (!orderId) return NextResponse.json({ ok: false, message: "Commande PayPal manquante." }, { status: 400 });
  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
  const existing = await supabase.from("donations").select("id").eq("paypal_order_id", orderId).maybeSingle();
  if (existing.data) return NextResponse.json({ ok: true, alreadyRecorded: true });
  try {
    const token = await paypalAccessToken();
    const statusResponse = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    let order = await statusResponse.json() as any;
    if (!statusResponse.ok) throw new Error("Le paiement PayPal n'est pas confirme.");
    if (order.status === "APPROVED") {
      const captureResponse = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
      order = await captureResponse.json();
      if (!captureResponse.ok) throw new Error("La confirmation du paiement PayPal a échoué.");
    }
    if (order.status !== "COMPLETED") throw new Error("Le paiement PayPal n'est pas confirme.");
    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    const amount = Number(capture?.amount?.value || order.purchase_units?.[0]?.amount?.value || 0);
    const user = await getUserFromRequest(request);
    const payerName = [order.payer?.name?.given_name, order.payer?.name?.surname].filter(Boolean).join(" ");
    const verifiedNote = String(order.purchase_units?.[0]?.description || payload?.note || "Soutien libre").slice(0, 160);
    const { error } = await supabase.from("donations").insert({ user_id: user?.id || null, user_name: payerName || user?.email?.split("@")[0] || null, user_email: order.payer?.email_address || user?.email || null, amount, currency: capture?.amount?.currency_code || "EUR", note: verifiedNote, payment_status: "paid", paid_at: capture?.create_time || new Date().toISOString(), paypal_order_id: orderId, paypal_capture_id: capture?.id || payload?.captureId || null });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Enregistrement impossible." }, { status: 400 });
  }
}
