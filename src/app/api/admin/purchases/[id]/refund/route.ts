import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  const token = request.headers.get("Authorization")?.replace("Bearer ", "") || undefined;
  if (!user || !(await isAdminUser(user, token))) return NextResponse.json({ ok: false, message: "Acces admin requis." }, { status: 403 });
  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });
  const { id } = await context.params;
  const payload = (await request.json().catch(() => ({}))) as { reason?: string };
  const { data: purchase } = await supabase.from("downloads").select("*").eq("id", id).maybeSingle();
  if (!purchase) return NextResponse.json({ ok: false, message: "Achat introuvable." }, { status: 404 });
  if (purchase.payment_status === "refunded") return NextResponse.json({ ok: false, message: "Achat deja rembourse." }, { status: 409 });
  if (Number(purchase.amount_paid || 0) <= 0) return NextResponse.json({ ok: false, message: "Aucun montant a rembourser." }, { status: 400 });
  try {
    let refundId = "";
    if (purchase.stripe_payment_intent_id || purchase.stripe_session_id) {
      if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY manquant.");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      let paymentIntent = purchase.stripe_payment_intent_id;
      if (!paymentIntent && purchase.stripe_session_id) {
        const session = await stripe.checkout.sessions.retrieve(purchase.stripe_session_id);
        paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      }
      if (!paymentIntent) throw new Error("Identifiant de paiement Stripe absent.");
      const refund = await stripe.refunds.create({ payment_intent: paymentIntent, reason: "requested_by_customer" });
      refundId = refund.id;
    } else if (purchase.paypal_capture_id) {
      const clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
      const secret = process.env.PAYPAL_CLIENT_SECRET;
      if (!clientId || !secret) throw new Error("Identifiants serveur PayPal manquants.");
      const base = process.env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
      const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
      const tokenResponse = await fetch(`${base}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
      const tokenData = await tokenResponse.json() as { access_token?: string };
      if (!tokenResponse.ok || !tokenData.access_token) throw new Error("Connexion PayPal impossible.");
      const response = await fetch(`${base}/v2/payments/captures/${purchase.paypal_capture_id}/refund`, { method: "POST", headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ note_to_payer: payload.reason || "Remboursement demande par le client" }) });
      const result = await response.json() as { id?: string; message?: string };
      if (!response.ok) throw new Error(result.message || "Remboursement PayPal refuse.");
      refundId = result.id || "paypal";
    } else {
      throw new Error("Ancien achat: identifiant de capture absent. Remboursez-le depuis le tableau de bord du prestataire.");
    }
    const refundedAt = new Date().toISOString();
    await supabase.from("downloads").update({ payment_status: "refunded", refunded_at: refundedAt, refund_amount: purchase.amount_paid, refund_reason: payload.reason || null, refund_provider_id: refundId }).eq("id", id);
    return NextResponse.json({ ok: true, refundedAt });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Remboursement impossible." }, { status: 400 });
  }
}
