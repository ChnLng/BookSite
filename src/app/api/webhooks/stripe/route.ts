import Stripe from "stripe";
import { NextResponse } from "next/server";
import { recordStripePurchase } from "@/lib/stripe-purchases";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json(
      { ok: false, message: "Webhook Stripe non configuré." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { ok: false, message: "Signature Stripe manquante." },
      { status: 400 },
    );
  }

  const stripe = new Stripe(secretKey);
  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Signature Stripe invalide.",
      },
      { status: 400 },
    );
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.downloadKind === "book" || session.metadata?.downloadKind === "resource") {
        await recordStripePurchase(session);
      }
    }
  } catch (error) {
    // Returning a non-2xx response asks Stripe to retry the signed event.
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Enregistrement du paiement impossible.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, received: true });
}
