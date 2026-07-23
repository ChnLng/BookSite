import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!stripeSecretKey) {
    return NextResponse.json({ ok: false, message: "Stripe non configure." }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signature invalide.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const bookId = metadata.bookId;
    const bookTitle = metadata.bookTitle;
    const pdfFile = metadata.pdfFile;

    if (bookId && pdfFile) {
      const supabase = getSupabaseServiceClient();

      if (supabase) {
        const customerEmail = session.customer_details?.email || session.customer_email || null;

        let userId: string | null = null;

        if (customerEmail) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", customerEmail)
            .maybeSingle();

          userId = profile?.id || null;
        }

        await supabase.from("downloads").insert({
          user_id: userId,
          user_email: customerEmail,
          book_id: bookId,
          book_title: bookTitle || bookId,
          download_url: pdfFile,
          stripe_session_id: session.id,
        });
      }
    }
  }

  return NextResponse.json({ ok: true, received: true });
}
