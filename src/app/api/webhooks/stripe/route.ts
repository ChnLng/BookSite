import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message:
      "Webhook placeholder pret. La prochaine etape reliera remboursement, dispute et blocage du telechargement.",
  });
}
