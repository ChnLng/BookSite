import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminUser } from "@/lib/auth-request";
import { fetchGithubPaidAsset, resolveGithubPaidAssetRedirect } from "@/lib/github-paid-assets";
import { productDocumentGrantCookieName, verifyProductDocumentGrant } from "@/lib/product-document-grants";
import { hasPurchasedBook, hasPurchasedResource } from "@/lib/purchase-access";
import {
  canViewMimeType,
  safeDownloadFilename,
  type ProductDocumentRecord,
  type ProductKind,
} from "@/lib/product-documents";
import { productDocumentSelect, resolveDocumentProduct } from "@/lib/product-documents-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RouteContext = { params: Promise<{ kind: string; id: string; documentId: string }> };

function responseHeaders(document: ProductDocumentRecord, mode: "download" | "view", upstream: Response) {
  const fileName = safeDownloadFilename(document.file_name);
  const asciiFileName = fileName.replace(/[^\x20-\x7e]/g, "_");
  const inline = mode === "view";
  return {
    "Content-Type": document.mime_type || "application/octet-stream",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length") as string } : {}),
    ...(upstream.headers.get("content-range") ? { "Content-Range": upstream.headers.get("content-range") as string } : {}),
    ...(upstream.headers.get("accept-ranges") ? { "Accept-Ranges": upstream.headers.get("accept-ranges") as string } : {}),
    ...(inline ? { "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'" } : {}),
  };
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") || "";
  const match = cookies.split(/;\s*/).find((entry) => entry.startsWith(`${name}=`));
  if (!match) return "";
  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return "";
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { kind, id, documentId } = await context.params;
  const productKind = kind as ProductKind;
  const searchParams = new URL(request.url).searchParams;
  const mode = searchParams.get("mode") === "view" ? "view" : "download";
  if (productKind !== "book" && productKind !== "resource") {
    return NextResponse.json({ ok: false, message: "Type de produit invalide." }, { status: 400 });
  }
  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "Service indisponible." }, { status: 503 });

  try {
    const user = await getUserFromRequest(request);
    const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "").trim() || undefined;
    const admin = user ? await isAdminUser(user, accessToken) : false;
    const product = await resolveDocumentProduct(supabase, productKind, id);
    if (!product) {
      return NextResponse.json({ ok: false, message: "Produit introuvable." }, { status: 404 });
    }
    const grantCookie = cookieValue(request, productDocumentGrantCookieName(documentId, mode));
    const [grantedUserId = "", expiresValue = "", signature = ""] = grantCookie.split(".");
    const expiresAt = Number(expiresValue || 0);
    const validGrant = verifyProductDocumentGrant({
      productKind,
      productId: product.id,
      documentId,
      mode,
      userId: grantedUserId,
      expiresAt,
      signature,
    });
    if (!user && !validGrant) {
      return NextResponse.json({ ok: false, message: "Connexion requise." }, { status: 401 });
    }
    if (!admin && (!product.visible || product.deletedAt)) {
      return NextResponse.json({ ok: false, message: "Produit introuvable." }, { status: 404 });
    }
    const productColumn = productKind === "book" ? "book_id" : "resource_id";
    const { data, error } = await supabase
      .from("product_documents")
      .select(productDocumentSelect)
      .eq("id", documentId)
      .eq(productColumn, product.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const document = data as ProductDocumentRecord | null;
    if (!document || (!admin && (!document.visible || document.deleted_at))) {
      return NextResponse.json({ ok: false, message: "Document introuvable." }, { status: 404 });
    }
    if (mode === "download" && document.delivery_mode === "view") {
      return NextResponse.json({ ok: false, message: "Ce document est disponible uniquement en lecture." }, { status: 403 });
    }
    if (mode === "view" && (document.delivery_mode === "download" || !canViewMimeType(document.mime_type, document.file_extension))) {
      return NextResponse.json({ ok: false, message: "Ce format n'est pas disponible en lecture en ligne." }, { status: 403 });
    }

    const purchased = validGrant || admin || (productKind === "book"
      ? await hasPurchasedBook(supabase, { userId: user!.id, email: user!.email, bookId: product.slug })
      : await hasPurchasedResource(supabase, {
          userId: user!.id,
          email: user!.email,
          resourceId: product.id,
          resourceSlug: product.slug,
        }));
    if (!purchased) return NextResponse.json({ ok: false, message: "Accès non autorisé." }, { status: 403 });

    const asset = mode === "download"
      ? await resolveGithubPaidAssetRedirect(document.asset_reference)
      : await fetchGithubPaidAsset(document.asset_reference, request.headers.get("range"));
    if (!asset?.response.ok || !asset.response.body) {
      const isRedirect = asset?.response.status && asset.response.status >= 300 && asset.response.status < 400;
      if (!isRedirect || !("redirectUrl" in asset) || !asset.redirectUrl) {
        return NextResponse.json({ ok: false, message: "Fichier privé introuvable." }, { status: 404 });
      }
    }

    if (!admin && mode === "download") {
      const purchaseUserId = validGrant ? grantedUserId : user!.id;
      const purchaseQuery = supabase
        .from("downloads")
        .select("id, download_count")
        .eq("user_id", purchaseUserId)
        .order("created_at", { ascending: false })
        .limit(1);
      const { data: purchase } = productKind === "book"
        ? await purchaseQuery.eq("book_id", product.slug).maybeSingle()
        : await purchaseQuery.eq("resource_id", product.id).maybeSingle();
      if (purchase?.id) {
        await supabase.from("downloads").update({
          download_count: Number(purchase.download_count || 0) + 1,
          last_downloaded_at: new Date().toISOString(),
        }).eq("id", purchase.id);
      }
    }

    if (mode === "download" && "redirectUrl" in asset && typeof asset.redirectUrl === "string" && asset.redirectUrl) {
      const redirect = NextResponse.redirect(asset.redirectUrl, 307);
      redirect.headers.set("Cache-Control", "private, no-store");
      return redirect;
    }

    return new NextResponse(asset.response.body, {
      status: asset.response.status,
      headers: responseHeaders(document, mode, asset.response),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Téléchargement impossible." }, { status: 500 });
  }
}
