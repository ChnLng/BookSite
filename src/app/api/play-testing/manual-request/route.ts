import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    { ok: false, message: "Les demandes de test sont closes." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
