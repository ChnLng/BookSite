import { books as staticBooks, type Book } from "@/data/books";
import { bookAssetExtensions, bookCoverPath, bookPdfPath } from "@/lib/book-assets";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { hasSupabaseConfig } from "@/lib/site-config";

export type BookRow = {
  id: string;
  slug: string | null;
  title_fr: string;
  title_zh: string;
  visible: boolean;
  price_eur: number | null;
  cover_image: string | null;
  pdf_file: string | null;
  synopsis_fr: string | null;
  synopsis_zh: string | null;
  amazon_ebook_url: string | null;
  amazon_paperback_url: string | null;
  asin: string | null;
  created_at?: string | null;
};

export type DisplayBook = Book & {
  dbId?: string;
  visible: boolean;
  coverImage: string;
  pdfFile: string;
};

function staticDisplayBooks(): DisplayBook[] {
  return staticBooks.map((book) => {
    const ext = bookAssetExtensions[book.id] || "jpg";
    return {
      ...book,
      visible: true,
      coverImage: bookCoverPath(book.id, ext),
      pdfFile: bookPdfPath(book.id),
    };
  });
}

export function mapBookRow(row: BookRow, fallback?: Book): DisplayBook {
  const slug = row.slug || fallback?.id || row.id;
  const ext = bookAssetExtensions[slug] || "jpg";

  return {
    id: slug,
    dbId: row.id,
    asin: row.asin || fallback?.asin || "",
    titleFr: row.title_fr,
    titleZh: row.title_zh,
    accent: fallback?.accent || "linear-gradient(135deg, #f8c28f 0%, #f5e6ca 45%, #fff8ef 100%)",
    animal: fallback?.animal || "",
    priceEur: Number(row.price_eur ?? fallback?.priceEur ?? 0),
    publishDate: fallback?.publishDate || "",
    synopsisFr: row.synopsis_fr || fallback?.synopsisFr || "",
    teachingPointFr: fallback?.teachingPointFr || "",
    amazonEbookUrl: row.amazon_ebook_url || fallback?.amazonEbookUrl || "",
    amazonPaperbackUrl: row.amazon_paperback_url || fallback?.amazonPaperbackUrl || "",
    visible: row.visible,
    coverImage: row.cover_image || bookCoverPath(slug, ext),
    pdfFile: row.pdf_file || bookPdfPath(slug),
  };
}

export async function loadDisplayBooks(includeHidden = false): Promise<DisplayBook[]> {
  const supabase = getSupabaseBrowserClient();

  if (!hasSupabaseConfig || !supabase) {
    return staticDisplayBooks();
  }

  const query = supabase
    .from("books")
    .select(
      "id, slug, title_fr, title_zh, visible, price_eur, cover_image, pdf_file, synopsis_fr, synopsis_zh, amazon_ebook_url, amazon_paperback_url, asin, created_at",
    )
    .order("created_at", { ascending: true });

  const { data } = includeHidden ? await query : await query.eq("visible", true);

  if (!data || data.length === 0) {
    return staticDisplayBooks();
  }

  return (data as BookRow[]).map((row) => {
    const fallback = staticBooks.find((book) => book.id === (row.slug || row.id));
    return mapBookRow(row, fallback);
  });
}

export function getStaticBookById(bookId: string) {
  return staticDisplayBooks().find((book) => book.id === bookId);
}
