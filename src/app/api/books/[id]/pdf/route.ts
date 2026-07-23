import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { books } from "@/data/books";
import { bookPdfPath, booksBucketName, isSupabaseBookPdfAsset, normalizeBookPdfAsset } from "@/lib/book-assets";
import { hasPurchasedBook } from "@/lib/purchase-access";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ResolvedBook = {
  id: string;
  pdfFile: string;
};

function resolvePublicPdfAbsolutePath(pdfFile: string) {
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

function resolveBooksFolderAbsolutePath(pdfFile: string) {
  const normalized = normalizeBookPdfAsset(pdfFile);

  if (!normalized || normalized.startsWith("/") || /^https?:\/\//i.test(normalized)) {
    return null;
  }

  const absolutePath = path.join(process.cwd(), "books", normalized);

  if (!absolutePath.startsWith(path.join(process.cwd(), "books"))) {
    return null;
  }

  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  return absolutePath;
}

async function resolveBook(id: string): Promise<ResolvedBook | null> {
  const serviceClient = getSupabaseServiceClient();

  if (serviceClient) {
    const { data } = await serviceClient
      .from("books")
      .select("id, slug, pdf_file")
      .or(`slug.eq.${id},id.eq.${id}`)
      .maybeSingle();

    if (data) {
      return {
        id: data.slug || id,
        pdfFile: data.pdf_file || bookPdfPath(data.slug || id),
      };
    }
  }

  const fallback = books.find((item) => item.id === id);

  if (!fallback) {
    return null;
  }

  return {
    id: fallback.id,
    pdfFile: bookPdfPath(fallback.id),
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const book = await resolveBook(id);

  if (!book) {
    return NextResponse.json({ ok: false, message: "Livre introuvable." }, { status: 404 });
  }

  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 });
  }

  const admin = await isAdminUser(user);
  const serviceClient = getSupabaseServiceClient();

  if (!admin) {
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

  const normalizedPdf = normalizeBookPdfAsset(book.pdfFile);

  if (!normalizedPdf) {
    return NextResponse.json({ ok: false, message: "Fichier PDF introuvable." }, { status: 404 });
  }

  if (serviceClient && isSupabaseBookPdfAsset(normalizedPdf)) {
    const { data, error } = await serviceClient.storage
      .from(booksBucketName)
      .download(normalizedPdf);

    if (!error && data) {
      const fileBuffer = Buffer.from(await data.arrayBuffer());

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${book.id}_book.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
  }

  const publicAbsolutePath = normalizedPdf.startsWith("/") ? resolvePublicPdfAbsolutePath(normalizedPdf) : null;
  const booksFolderAbsolutePath = resolveBooksFolderAbsolutePath(normalizedPdf);
  const absolutePath = publicAbsolutePath || booksFolderAbsolutePath;

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
