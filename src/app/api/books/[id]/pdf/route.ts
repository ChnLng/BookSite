import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-request";
import { books } from "@/data/books";
import { bookPdfPath, booksBucketName, isSupabaseBookPdfAsset, normalizeBookPdfAsset } from "@/lib/book-assets";
import { isUuid } from "@/lib/database-identifiers";
import { hasPurchasedBook } from "@/lib/purchase-access";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { fetchGithubPaidAsset, parseGithubPaidAssetReference } from "@/lib/github-paid-assets";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ResolvedBook = {
  id: string;
  pdfFile: string;
};

function contentHeaders(fileName: string, contentType = "application/octet-stream") {
  const safeName = path.basename(fileName).replace(/["\\\r\n]/g, "-");
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${safeName}"`,
    "Cache-Control": "private, no-store",
  };
}

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
    const query = serviceClient
      .from("books")
      .select("id, slug, pdf_file")
      .limit(1);
    const { data } = await (isUuid(id) ? query.eq("id", id) : query.eq("slug", id)).maybeSingle();

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
    return NextResponse.json({ ok: false, message: "Accès non autorisé." }, { status: 403 });
  }

  if (serviceClient) {
    const { data: purchase } = await serviceClient
      .from("downloads")
      .select("id, download_count")
      .eq("user_id", user.id)
      .or(`book_id.eq.${id},book_id.eq.${book.id}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (purchase?.id) {
      await serviceClient.from("downloads").update({
        download_count: Number(purchase.download_count || 0) + 1,
        last_downloaded_at: new Date().toISOString(),
      }).eq("id", purchase.id);
    }
  }

  const normalizedPdf = normalizeBookPdfAsset(book.pdfFile);

  if (!normalizedPdf) {
    return NextResponse.json({ ok: false, message: "Fichier PDF introuvable." }, { status: 404 });
  }

  if (parseGithubPaidAssetReference(normalizedPdf)) {
    const asset = await fetchGithubPaidAsset(normalizedPdf);
    if (!asset?.response.ok || !asset.response.body) {
      return NextResponse.json({ ok: false, message: "Fichier GitHub privé introuvable." }, { status: 404 });
    }
    return new NextResponse(asset.response.body, {
      status: 200,
      headers: contentHeaders(asset.fileName, asset.response.headers.get("content-type") || undefined),
    });
  }

  if (/^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\//i.test(normalizedPdf)) {
    const asset = await fetchGithubPaidAsset(normalizedPdf);
    if (!asset?.response.ok || !asset.response.body) {
      return NextResponse.json({ ok: false, message: "Fichier GitHub Release introuvable." }, { status: 404 });
    }
    return new NextResponse(asset.response.body, {
      status: 200,
      headers: contentHeaders(asset.fileName, asset.response.headers.get("content-type") || undefined),
    });
  }

  if (serviceClient && isSupabaseBookPdfAsset(normalizedPdf)) {
    const { data, error } = await serviceClient.storage
      .from(booksBucketName)
      .download(normalizedPdf);

    if (!error && data) {
      const fileBuffer = Buffer.from(await data.arrayBuffer());

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: contentHeaders(normalizedPdf, data.type),
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
    headers: contentHeaders(absolutePath),
  });
}
