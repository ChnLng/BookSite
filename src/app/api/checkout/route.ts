import Stripe from "stripe";
import { NextResponse } from "next/server";
import { donationOptions } from "@/data/books";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export async function POST(request: Request) {
  const payload = await request.json();
  const kind = String(payload.kind || "book");
  const origin = request.headers.get("origin") || "http://localhost:3000";

  if (kind === "book") {
    const bookId = String(payload.id || "").trim();

    if (!bookId) {
      return NextResponse.json({ ok: false, message: "Livre introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      url: `${origin}/livres/${encodeURIComponent(bookId)}?buy=1`,
    });
  }

  if (!stripeSecretKey) {
    return NextResponse.json({
      ok: false,
      message: "STRIPE_SECRET_KEY manquant. L'interface locale reste visible.",
    });
  }

  const stripe = new Stripe(stripeSecretKey);

  if (kind === "donation") {
    const donation = donationOptions.find((item) => item.id === payload.id);
    const amount = donation?.amount ?? 5;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/account?success=1`,
      cancel_url: `${origin}/?cancel=1`,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Donation ${donation?.label ?? "Visd AR"}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
    });

    return NextResponse.json({ ok: true, url: session.url });
  }

  return NextResponse.json({ ok: false, message: "Type de paiement inconnu." }, { status: 400 });
}
