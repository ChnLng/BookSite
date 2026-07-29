import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { createInvoicePdf } from "@/lib/simple-invoice-pdf";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  const supabase = getSupabaseServiceClient();

  if (!user) return NextResponse.json({ message: "Connexion requise." }, { status: 401 });
  if (!supabase) return NextResponse.json({ message: "Service indisponible." }, { status: 503 });

  const { id } = await context.params;
  const { data } = await supabase.from("donations").select("*").eq("id", id).maybeSingle();
  const sameEmail = String(data?.user_email || "").toLowerCase() === String(user.email || "").toLowerCase();

  if (!data || (data.user_id !== user.id && !sameEmail)) {
    return NextResponse.json({ message: "Facture introuvable." }, { status: 404 });
  }

  const number = `DON-${String(data.id).replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const status = data.payment_status === "refunded" ? "Rembourse" : data.payment_status === "paid" ? "Paye" : "En attente";
  const pdf = createInvoicePdf([
    "VISD AR - RECU DE DONATION",
    `Facture : ${number}`,
    `Date : ${new Date(data.paid_at || data.created_at).toLocaleDateString("fr-FR")}`,
    `Donateur : ${data.user_email || user.email || ""}`,
    `Motif du don : ${data.note || "Soutien libre"}`,
    `Statut : ${status}`,
    `Montant : ${Number(data.amount || 0).toFixed(2)} ${data.currency || "EUR"}`,
  ]);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-donation-${number}.pdf"`,
    },
  });
}
