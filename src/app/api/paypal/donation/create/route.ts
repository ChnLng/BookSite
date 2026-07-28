import { NextResponse } from "next/server";
import { paypalAccessToken, paypalBaseUrl } from "@/lib/paypal-server";

const allowedPurposes = new Set([
  "✨ Soutien libre et spontané",
  "🍵 Un thé pour la créatrice",
  "📖 Soutenir un livre",
]);

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as { amount?: number; note?: string } | null;
  const amount = Number(payload?.amount);
  const note = allowedPurposes.has(String(payload?.note || ""))
    ? String(payload?.note)
    : "✨ Soutien libre et spontané";

  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
    return NextResponse.json({ ok: false, message: "Veuillez saisir un montant valide." }, { status: 400 });
  }

  try {
    const accessToken = await paypalAccessToken();
    const origin = new URL(request.url).origin;
    const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          custom_id: "donation-visdar",
          description: note,
          amount: { currency_code: "EUR", value: amount.toFixed(2) },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "Visd AR",
              locale: "fr-FR",
              landing_page: "NO_PREFERENCE",
              user_action: "PAY_NOW",
              return_url: `${origin}/?donation=approve`,
              cancel_url: `${origin}/?donation=cancelled`,
            },
          },
        },
      }),
      cache: "no-store",
    });
    const order = await response.json() as { id?: string; links?: Array<{ rel?: string; href?: string }> };
    const approvalUrl = order.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href;
    if (!response.ok || !order.id || !approvalUrl) {
      throw new Error("Impossible d'ouvrir le paiement PayPal.");
    }
    return NextResponse.json({ ok: true, orderId: order.id, approvalUrl });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "PayPal est indisponible." },
      { status: 502 },
    );
  }
}
