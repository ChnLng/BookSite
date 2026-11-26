import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { missingPlayResourceRows } from "@/lib/admin-resource-seeds";
import { getSupabaseRequestClient, getSupabaseServiceClient } from "@/lib/supabase-server";

// Older Play-only pages had no resource_items row, so the admin editor could
// not see them. Import missing rows once, preserving every existing admin edit.
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;
  if (!user) return NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 });
  if (!(await isAdminUser(user, accessToken))) {
    return NextResponse.json({ ok: false, message: "Acces admin requis." }, { status: 403 });
  }

  const supabase = getSupabaseServiceClient() || getSupabaseRequestClient(accessToken);
  if (!supabase) return NextResponse.json({ ok: false, message: "Client Supabase admin indisponible." }, { status: 503 });

  const { data, error } = await supabase.from("resource_items").select("slug, price_eur");
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const existing = new Map((data || []).map((row) => [String(row.slug), row]));
  let imported = 0;

  for (const row of missingPlayResourceRows(existing.keys())) {
    const { error: insertError } = await supabase.from("resource_items").insert(row);
    if (insertError && insertError.code !== "23505") {
      return NextResponse.json({ ok: false, message: insertError.message }, { status: 500 });
    }
    if (!insertError) imported += 1;
  }

  // The dictionary's old testing price was 0.19 EUR; keep any other admin
  // value untouched while correcting that known stale value.
  const dictionary = existing.get("dico-contextuel-du-chinois-android");
  if (dictionary && Number(dictionary.price_eur) === 0.19) {
    const { error: priceError } = await supabase.from("resource_items")
      .update({ price_eur: 2.19 })
      .eq("slug", "dico-contextuel-du-chinois-android")
      .eq("price_eur", 0.19);
    if (priceError) return NextResponse.json({ ok: false, message: priceError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, imported });
}
