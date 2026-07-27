import Stripe from "stripe";
import { NextResponse } from "next/server";
import { donationOptions } from "@/data/books";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

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

  if (kind === "resource") {
    const resourceId = String(payload.id || "").trim();

    if (!resourceId) {
      return NextResponse.json({ ok: false, message: "Ressource introuvable." }, { status: 404 });
    }

    if (!stripeSecretKey) {
      return NextResponse.json({
        ok: false,
        message: "STRIPE_SECRET_KEY manquant.",
      });
    }

    const supabase = getSupabaseServiceClient();

    if (!supabase) {
      return NextResponse.json({ ok: false, message: "Supabase indisponible." }, { status: 503 });
    }

    const { data: resource } = await supabase
      .from("resource_items")
      .select("id, slug, title_fr, price_eur, visible")
      .or(`slug.eq.${resourceId},id.eq.${resourceId}`)
      .maybeSingle();

    if (!resource || resource.visible === false) {
      return NextResponse.json({ ok: false, message: "Ressource introuvable." }, { status: 404 });
    }

    const baseAmount = Number(resource.price_eur || 0);
    const requestedAmount = Number(payload.finalPrice);
    const amount =
      Number.isFinite(requestedAmount) && requestedAmount >= 0 && requestedAmount <= baseAmount
        ? Math.round(requestedAmount * 100) / 100
        : baseAmount;

    if (amount <= 0) {
      return NextResponse.json({
        ok: true,
        url: `${origin}/outils/${encodeURIComponent(resource.slug || resource.id)}?free=1`,
      });
    }

    const { data: firstFile } = await supabase
      .from("resource_item_files")
      .select("id, file_path, file_url, external_url")
      .eq("resource_id", resource.id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    const stripe = new Stripe(stripeSecretKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/outils/${encodeURIComponent(resource.slug || resource.id)}?success=1`,
      cancel_url: `${origin}/outils/${encodeURIComponent(resource.slug || resource.id)}?cancel=1`,
      customer_email: String(payload.userEmail || "").trim() || undefined,
      metadata: {
        downloadKind: "resource",
        resourceId: resource.id,
        resourceSlug: resource.slug || resource.id,
        resourceTitle: resource.title_fr || resource.slug || resource.id,
        finalPrice: amount.toFixed(2),
        promoCode: String(payload.promoCode || "").trim().toUpperCase(),
        defaultDownloadUrl: firstFile?.file_path || firstFile?.file_url || firstFile?.external_url || "",
        resourceFileId: firstFile?.id || "",
        userId: String(payload.userId || "").trim(),
      },
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: resource.title_fr || "Ressource numerique",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
    });

    return NextResponse.json({ ok: true, url: session.url });
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
