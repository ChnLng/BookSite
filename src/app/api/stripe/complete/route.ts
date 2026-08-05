import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { recordStripePurchase } from "@/lib/stripe-purchases";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Connexion requise pour confirmer cet achat." },
      { status: 401 },
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { ok: false, message: "Stripe n'est pas encore configuré." },
      { status: 503 },
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | { sessionId?: string }
    | null;
  const sessionId = String(payload?.sessionId || "").trim();
  if (!sessionId) {
    return NextResponse.json(
      { ok: false, message: "Session Stripe manquante." },
      { status: 400 },
    );
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.userId !== user.id) {
      return NextResponse.json(
        { ok: false, message: "Cette session de paiement appartient à un autre compte." },
        { status: 403 },
      );
    }

    const result = await recordStripePurchase(session);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de confirmer le paiement Stripe.",
      },
      { status: 400 },
    );
  }
}
