import type { SupabaseClient } from "@supabase/supabase-js";
import { bookPdfPath } from "./book-assets";

type PurchaseCheckParams = {
  userId: string;
  email?: string | null;
  bookId: string;
};

function expectedPdfPath(bookId: string) {
  return bookPdfPath(bookId);
}

async function matchDownload(
  supabase: SupabaseClient,
  params: PurchaseCheckParams,
) {
  const { userId, email, bookId } = params;
  const pdfPath = expectedPdfPath(bookId);

  const { data: byUserId } = await supabase
    .from("downloads")
    .select("id, book_id, download_url")
    .eq("user_id", userId);

  if (
    byUserId?.some(
      (row) => row.book_id === bookId || row.download_url === pdfPath,
    )
  ) {
    return true;
  }

  if (!email) {
    return false;
  }

  const { data: byEmail } = await supabase
    .from("downloads")
    .select("id, book_id, download_url")
    .eq("user_email", email);

  return Boolean(
    byEmail?.some(
      (row) => row.book_id === bookId || row.download_url === pdfPath,
    ),
  );
}

export async function hasPurchasedBook(
  supabase: SupabaseClient,
  params: PurchaseCheckParams,
): Promise<boolean> {
  const { userId, email, bookId } = params;

  const { data, error } = await supabase
    .from("downloads")
    .select("id")
    .or(`user_id.eq.${userId},user_email.eq.${email}`)
    .eq("book_id", bookId)
    .limit(1);

  if (error) {
    return false;
  }

  return data.length > 0;
}

export function bookIdFromDownload(record: {
  book_id?: string | null;
  download_url?: string | null;
}) {
  if (record.book_id) {
    return record.book_id;
  }

  const match = record.download_url?.match(/\/images\/([a-z0-9_-]+)_book\.pdf/i);
  return match?.[1] || null;
}
