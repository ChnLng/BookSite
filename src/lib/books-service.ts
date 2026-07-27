import { books as staticBooks, defaultRelatedBookIds, type Book } from "@/data/books";
import { bookAssetExtensions, bookCoverPath, bookPdfPath } from "@/lib/book-assets";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { hasSupabaseConfig } from "@/lib/site-config";

export type BookRow = {
  id: string;
  slug: string | null;
  sort_order?: number | null;
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
  related_book_ids?: string[] | null;
  created_at?: string | null;
};

export type DisplayBook = Book & {
  dbId?: string;
  visible: boolean;
  coverImage: string;
  pdfFile: string;
  relatedBookIds: string[];
};

export const BOOK_PUBLIC_SELECT =
  "id, slug, sort_order, title_fr, title_zh, visible, price_eur, cover_image, pdf_file, synopsis_fr, synopsis_zh, amazon_ebook_url, amazon_paperback_url, asin, related_book_ids, created_at";

const BOOK_CACHE_TTL_MS = 60_000;
const bookListCache = new Map<boolean, { expiresAt: number; data: DisplayBook[] }>();
const bookListInFlight = new Map<boolean, Promise<DisplayBook[]>>();

function normalizeRelatedBookIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }

  return [];
}

export function getStaticDisplayBooks(): DisplayBook[] {
  return staticBooks.map((book) => {
    const ext = bookAssetExtensions[book.id] || "jpg";
    return {
      ...book,
      visible: true,
      coverImage: bookCoverPath(book.id, ext),
      pdfFile: bookPdfPath(book.id),
      relatedBookIds: defaultRelatedBookIds[book.id] || [],
    };
  });
}

function fallbackBookById(bookId: string) {
  return staticBooks.find((book) => book.id === bookId);
}

export function mapBookRow(row: BookRow, fallback?: Book): DisplayBook {
  const slug = row.slug || fallback?.id || row.id;
  const ext = bookAssetExtensions[slug] || "jpg";
  const normalizedRelatedBookIds = normalizeRelatedBookIds(row.related_book_ids);

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
    relatedBookIds: normalizedRelatedBookIds.length > 0 ? normalizedRelatedBookIds : defaultRelatedBookIds[slug] || [],
  };
}

function findDisplayBookByRef(books: DisplayBook[], bookId: string) {
  return books.find((book) => book.id === bookId || book.dbId === bookId) || null;
}

async function fetchDisplayBooks(includeHidden = false): Promise<DisplayBook[]> {
  const supabase = getSupabaseBrowserClient();

  if (!hasSupabaseConfig || !supabase) {
    return getStaticDisplayBooks();
  }

  const query = supabase
    .from("books")
    .select(BOOK_PUBLIC_SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const { data } = includeHidden ? await query : await query.eq("visible", true);

  if (!data || data.length === 0) {
    return getStaticDisplayBooks();
  }

  return (data as BookRow[]).map((row) => {
    const fallback = staticBooks.find((book) => book.id === (row.slug || row.id));
    return mapBookRow(row, fallback);
  });
}

export async function loadDisplayBooks(includeHidden = false): Promise<DisplayBook[]> {
  const now = Date.now();
  const cached = bookListCache.get(includeHidden);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const inFlight = bookListInFlight.get(includeHidden);

  if (inFlight) {
    return inFlight;
  }

  const request = fetchDisplayBooks(includeHidden)
    .then((data) => {
      bookListCache.set(includeHidden, {
        data,
        expiresAt: Date.now() + BOOK_CACHE_TTL_MS,
      });
      return data;
    })
    .finally(() => {
      bookListInFlight.delete(includeHidden);
    });

  bookListInFlight.set(includeHidden, request);
  return request;
}

export async function resolveDisplayBookById(
  bookId: string,
  includeHidden = false,
): Promise<DisplayBook | null> {
  const cachedBooks = await loadDisplayBooks(includeHidden);
  const cachedMatch = findDisplayBookByRef(cachedBooks, bookId);

  if (cachedMatch) {
    return cachedMatch;
  }

  const supabase = getSupabaseBrowserClient();

  if (hasSupabaseConfig && supabase) {
    let query = supabase
      .from("books")
      .select(BOOK_PUBLIC_SELECT)
      .or(`slug.eq.${bookId},id.eq.${bookId}`)
      .limit(1);

    if (!includeHidden) {
      query = query.eq("visible", true);
    }

    const { data } = await query.maybeSingle();

    if (data) {
      const row = data as BookRow;
      const fallback = staticBooks.find((book) => book.id === (row.slug || row.id));
      const mapped = mapBookRow(row, fallback);
      const current = bookListCache.get(includeHidden);

      if (current && current.expiresAt > Date.now()) {
        bookListCache.set(includeHidden, {
          ...current,
          data: [...current.data.filter((book) => book.id !== mapped.id && book.dbId !== mapped.dbId), mapped],
        });
      }

      return mapped;
    }
  }

  const fallback = fallbackBookById(bookId);
  return fallback ? mapBookRow({
    id: fallback.id,
    slug: fallback.id,
    title_fr: fallback.titleFr,
    title_zh: fallback.titleZh,
    visible: true,
    price_eur: fallback.priceEur,
    cover_image: null,
    pdf_file: bookPdfPath(fallback.id),
    synopsis_fr: fallback.synopsisFr,
    synopsis_zh: fallback.synopsisZh || null,
    amazon_ebook_url: fallback.amazonEbookUrl,
    amazon_paperback_url: fallback.amazonPaperbackUrl,
    asin: fallback.asin,
    related_book_ids: defaultRelatedBookIds[fallback.id] || [],
  }, fallback) : null;
}

export function getStaticBookById(bookId: string) {
  return getStaticDisplayBooks().find((book) => book.id === bookId);
}
