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
  const { data } = await supabase.from("downloads").select("*").eq("id", id).maybeSingle();
  if (!data || (data.user_id !== user.id && String(data.user_email || "").toLowerCase() !== String(user.email || "").toLowerCase()))
    return NextResponse.json({ message: "Facture introuvable." }, { status: 404 });
  const number = data.invoice_number || `VISD-${String(data.id).slice(0, 8).toUpperCase()}`;
  const title = data.resource_title || data.book_title || "Produit numerique";
  const pdf = createInvoicePdf(["VISD AR - FACTURE", `Facture: ${number}`, `Date: ${new Date(data.paid_at || data.created_at).toLocaleDateString("fr-FR")}`, `Client: ${data.user_email || user.email || ""}`, `Produit: ${title}`, `Statut: ${data.payment_status === "refunded" ? "Rembourse" : "Paye"}`, `Total: ${Number(data.amount_paid || 0).toFixed(2)} ${data.currency || "EUR"}`]);
  return new NextResponse(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="facture-${number}.pdf"` } });
}
