import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { getStaticBookById } from "@/lib/books-service";
import { hasPurchasedBook } from "@/lib/purchase-access";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function resolvePdfAbsolutePath(pdfFile: string) {
  const normalized = pdfFile.startsWith("/") ? pdfFile.slice(1) : pdfFile;
  const absolutePath = path.join(process.cwd(), "public", normalized);

  if (!absolutePath.startsWith(path.join(process.cwd(), "public"))) {
    return null;
  }

  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  return absolutePath;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const book = getStaticBookById(id);

  if (!book) {
    return NextResponse.json({ ok: false, message: "Livre introuvable." }, { status: 404 });
  }

  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 });
  }

  const admin = await isAdminUser(user);

  if (!admin) {
    const serviceClient = getSupabaseServiceClient();

    if (!serviceClient) {
      return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });
    }

    const hasAccess = await hasPurchasedBook(serviceClient, {
      userId: user.id,
      email: user.email,
      bookId: id,
    });

    if (!hasAccess) {
      return NextResponse.json({ ok: false, message: "Acces non autorise." }, { status: 403 });
    }
  }

  const absolutePath = resolvePdfAbsolutePath(book.pdfFile);

  if (!absolutePath) {
    return NextResponse.json({ ok: false, message: "Fichier PDF introuvable." }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(absolutePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${id}_book.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
