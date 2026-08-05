import type Stripe from "stripe";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RecordedStripePurchase = {
  accountUrl: string;
  readUrl?: string;
  resourceUrl?: string;
};

function paymentIntentId(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id || null;
}

export async function recordStripePurchase(
  session: Stripe.Checkout.Session,
): Promise<RecordedStripePurchase> {
  if (session.status !== "complete" || session.payment_status !== "paid") {
    throw new Error("Le paiement Stripe n'est pas confirmé.");
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase indisponible.");
  }

  const metadata = session.metadata || {};
  const kind = metadata.downloadKind;
  const userId = metadata.userId || null;
  const userEmail =
    session.customer_details?.email ||
    session.customer_email ||
    metadata.userEmail ||
    null;
  const paidAt = session.created
    ? new Date(session.created * 1000).toISOString()
    : new Date().toISOString();
  const amountPaid = Number(session.amount_total || 0) / 100;
  const common = {
    user_id: userId,
    user_email: userEmail,
    stripe_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId(session),
    amount_paid: amountPaid,
    currency: String(session.currency || "eur").toUpperCase(),
    payment_status: "paid",
    paid_at: paidAt,
  };

  if (kind === "book" && metadata.bookId) {
    const row = {
      ...common,
      download_kind: "book",
      book_id: metadata.bookId,
      book_title: metadata.bookTitle || metadata.bookId,
      download_url: metadata.downloadUrl || null,
    };
    const { error } = await supabase
      .from("downloads")
      .upsert(row, { onConflict: "stripe_session_id" });

    if (error) throw new Error(error.message);

    return {
      accountUrl: "/account",
      readUrl: `/read/${encodeURIComponent(metadata.bookId)}`,
    };
  }

  if (kind === "resource" && metadata.resourceId) {
    const resourceSlug = metadata.resourceSlug || metadata.resourceId;
    const row = {
      ...common,
      download_kind: "resource",
      resource_id: metadata.resourceId,
      resource_title: metadata.resourceTitle || resourceSlug,
      resource_file_id: metadata.resourceFileId || null,
      download_url: metadata.downloadUrl || null,
    };
    const { error } = await supabase
      .from("downloads")
      .upsert(row, { onConflict: "stripe_session_id" });

    if (error) throw new Error(error.message);

    return {
      accountUrl: "/account",
      resourceUrl: `/outils/${encodeURIComponent(resourceSlug)}`,
    };
  }

  throw new Error("Le produit associé au paiement Stripe est introuvable.");
}
