import type { SupabaseClient } from "@supabase/supabase-js";
import { bookPdfPath, extractBookSlugFromPdfAsset, normalizeBookPdfAsset } from "./book-assets";

type PurchaseCheckParams = {
  userId: string;
  email?: string | null;
  bookId: string;
};

type ResourcePurchaseCheckParams = {
  userId: string;
  email?: string | null;
  resourceId: string;
};

function expectedPdfPath(bookId: string) {
  return bookPdfPath(bookId);
}

function normalizePdfPath(url: string | null | undefined) {
  return normalizeBookPdfAsset(url);
}

function downloadMatchesBook(
  row: { book_id?: string | null; download_url?: string | null },
  bookId: string,
  pdfPath: string,
) {
  if (row.book_id === bookId) {
    return true;
  }

  const normalizedUrl = normalizePdfPath(row.download_url);

  if (normalizedUrl === pdfPath) {
    return true;
  }

  return bookIdFromDownload(row) === bookId;
}

async function matchDownload(
  supabase: SupabaseClient,
  params: PurchaseCheckParams,
) {
  const { userId, email, bookId } = params;
  const pdfPath = expectedPdfPath(bookId);
  const [byUserIdResult, byEmailResult] = await Promise.all([
    supabase.from("downloads").select("id, book_id, download_url").eq("user_id", userId),
    email
      ? supabase.from("downloads").select("id, book_id, download_url").eq("user_email", email)
      : Promise.resolve({ data: [] as Array<{ id?: string; book_id?: string | null; download_url?: string | null }> }),
  ]);

  if (byUserIdResult.data?.some((row) => downloadMatchesBook(row, bookId, pdfPath))) {
    return true;
  }

  const byEmail = byEmailResult.data || [];
  return Boolean(byEmail?.some((row) => downloadMatchesBook(row, bookId, pdfPath)));
}

export async function hasPurchasedBook(
  supabase: SupabaseClient,
  params: PurchaseCheckParams,
): Promise<boolean> {
  return matchDownload(supabase, params);
}

export function bookIdFromDownload(record: {
  book_id?: string | null;
  download_url?: string | null;
}) {
  if (record.book_id) {
    return record.book_id;
  }

  return extractBookSlugFromPdfAsset(record.download_url);
}

function resourceDownloadMatches(
  row: { resource_id?: string | null; download_kind?: string | null },
  resourceId: string,
) {
  if (row.resource_id === resourceId) {
    return true;
  }

  return row.download_kind === "resource" && row.resource_id === resourceId;
}

export async function hasPurchasedResource(
  supabase: SupabaseClient,
  params: ResourcePurchaseCheckParams,
): Promise<boolean> {
  const { userId, email, resourceId } = params;
  const [byUserIdResult, byEmailResult] = await Promise.all([
    supabase.from("downloads").select("id, resource_id, download_kind").eq("user_id", userId),
    email
      ? supabase.from("downloads").select("id, resource_id, download_kind").eq("user_email", email)
      : Promise.resolve({ data: [] as Array<{ id?: string; resource_id?: string | null; download_kind?: string | null }> }),
  ]);

  if (byUserIdResult.data?.some((row) => resourceDownloadMatches(row, resourceId))) {
    return true;
  }

  const byEmail = byEmailResult.data || [];
  return Boolean(byEmail?.some((row) => resourceDownloadMatches(row, resourceId)));
}
