"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { books as staticBooks, defaultRelatedBookIds } from "@/data/books";
import { bookAssetExtensions, bookCoverPath, bookPdfPath } from "@/lib/book-assets";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { bookIdFromDownload } from "@/lib/purchase-access";
import { isPromoActive, mapPromoRow, type PromoCode, type PromoRow } from "@/lib/promo";

type BookRow = {
  id: string;
  slug: string | null;
  sort_order: number | null;
  title_fr: string;
  title_zh: string;
  visible: boolean;
  price_eur: number | null;
  cover_image: string | null;
  pdf_file: string | null;
  synopsis_fr: string | null;
  synopsis_zh: string | null;
  asin: string | null;
  amazon_ebook_url: string | null;
  amazon_paperback_url: string | null;
  related_book_ids?: string[] | null;
  created_at?: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  created_at?: string | null;
};

type DownloadRow = {
  id: string;
  book_id: string | null;
  user_email: string | null;
  book_title: string | null;
  download_url: string | null;
  created_at: string | null;
};

type DonationRow = {
  id: string;
  user_email: string | null;
  amount: number | null;
  note: string | null;
  created_at: string | null;
};

type BookFormState = {
  slug: string;
  titleFr: string;
  titleZh: string;
  asin: string;
  priceEur: string;
  coverImage: string;
  pdfFile: string;
  synopsisFr: string;
  synopsisZh: string;
  amazonEbookUrl: string;
  amazonPaperbackUrl: string;
  visible: boolean;
  relatedBookIds: string[];
};

type BookEditState = BookFormState;

type CategoryEditState = {
  name: string;
  description: string;
};

type PromoFormState = {
  code: string;
  discountPercent: string;
  validFrom: string;
  validUntil: string;
  active: boolean;
  showBanner: boolean;
  bannerTextFr: string;
  bannerTextZh: string;
};

type PromoEditState = PromoFormState;
type AssetKind = "image" | "pdf";
type PdfStorageStatus = {
  exists: boolean;
  message: string;
};

const adminSections = [
  { key: "books", label: "图书 Livres" },
  { key: "categories", label: "类目 Categories" },
  { key: "promo", label: "优惠码 Codes promo" },
  { key: "downloads", label: "下载 Downloads" },
  { key: "donations", label: "赞助 Donations" },
] as const;

type AdminSectionKey = (typeof adminSections)[number]["key"];

const defaultBookForm: BookFormState = {
  slug: "",
  titleFr: "",
  titleZh: "",
  asin: "",
  priceEur: "",
  coverImage: "",
  pdfFile: "",
  synopsisFr: "",
  synopsisZh: "",
  amazonEbookUrl: "",
  amazonPaperbackUrl: "",
  visible: true,
  relatedBookIds: [],
};

const defaultPromoForm: PromoFormState = {
  code: "",
  discountPercent: "10",
  validFrom: "",
  validUntil: "",
  active: true,
  showBanner: false,
  bannerTextFr: "",
  bannerTextZh: "",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function imageExtensionFromFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  if (extension === "jpeg") {
    return "jpg";
  }

  if (["jpg", "png", "webp", "svg"].includes(extension)) {
    return extension;
  }

  return "jpg";
}

function formatDateTimeLocal(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (entry: number) => String(entry).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeRelatedBookIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function bookEditFromRow(book: BookRow): BookEditState {
  const slug = book.slug || book.id;
  const ext = bookAssetExtensions[slug] || "jpg";
  const relatedBookIds = normalizeRelatedBookIds(book.related_book_ids);

  return {
    slug,
    titleFr: book.title_fr,
    titleZh: book.title_zh,
    asin: book.asin || "",
    priceEur: String(book.price_eur ?? 0),
    coverImage: book.cover_image || bookCoverPath(slug, ext),
    pdfFile: book.pdf_file || bookPdfPath(slug),
    synopsisFr: book.synopsis_fr || "",
    synopsisZh: book.synopsis_zh || "",
    amazonEbookUrl: book.amazon_ebook_url || "",
    amazonPaperbackUrl: book.amazon_paperback_url || "",
    visible: Boolean(book.visible),
    relatedBookIds: relatedBookIds.length > 0 ? relatedBookIds : defaultRelatedBookIds[slug] || [],
  };
}

function categoryEditFromRow(category: CategoryRow): CategoryEditState {
  return {
    name: category.name,
    description: category.description || "",
  };
}

function bookSortValue(book: BookRow, index: number) {
  return book.sort_order ?? index + 1;
}

function fallbackBookRow(index: number, book: (typeof staticBooks)[number]): BookRow {
  const slug = book.id;
  const ext = bookAssetExtensions[slug] || "jpg";

  return {
    id: slug,
    slug,
    sort_order: index + 1,
    title_fr: book.titleFr,
    title_zh: book.titleZh,
    visible: true,
    price_eur: book.priceEur,
    cover_image: bookCoverPath(slug, ext),
    pdf_file: bookPdfPath(slug),
    synopsis_fr: book.synopsisFr,
    synopsis_zh: book.synopsisZh || null,
    asin: book.asin,
    amazon_ebook_url: book.amazonEbookUrl,
    amazon_paperback_url: book.amazonPaperbackUrl,
    related_book_ids: defaultRelatedBookIds[slug] || [],
    created_at: null,
  };
}

function mergeBooksWithFallback(rows: BookRow[]) {
  const knownKeys = new Set(
    rows.flatMap((row) => [row.id, row.slug || ""]).filter(Boolean).map((value) => value.toLowerCase()),
  );

  const missingStaticRows = staticBooks
    .filter((book) => !knownKeys.has(book.id.toLowerCase()))
    .map((book, index) => fallbackBookRow(index, book));

  return [...rows, ...missingStaticRows].sort((left, right) => {
    const leftSort = left.sort_order ?? Number.MAX_SAFE_INTEGER;
    const rightSort = right.sort_order ?? Number.MAX_SAFE_INTEGER;
    return leftSort - rightSort || left.title_fr.localeCompare(right.title_fr);
  });
}

function relationValueFromBook(book: Pick<BookRow, "id" | "slug">) {
  return book.slug || book.id;
}

function promoEditFromCode(promo: PromoCode): PromoEditState {
  return {
    code: promo.code,
    discountPercent: String(promo.discountPercent),
    validFrom: formatDateTimeLocal(promo.validFrom),
    validUntil: formatDateTimeLocal(promo.validUntil),
    active: promo.active,
    showBanner: promo.showBanner,
    bannerTextFr: promo.bannerTextFr || "",
    bannerTextZh: promo.bannerTextZh || "",
  };
}

function AdminPageContent() {
  const { profile, session } = useAuth();
  const [books, setBooks] = useState<BookRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<AdminSectionKey>("books");
  const [form, setForm] = useState<BookFormState>(defaultBookForm);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [promoForm, setPromoForm] = useState<PromoFormState>(defaultPromoForm);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [bookEdits, setBookEdits] = useState<Record<string, BookEditState>>({});
  const [categoryEdits, setCategoryEdits] = useState<Record<string, CategoryEditState>>({});
  const [promoEdits, setPromoEdits] = useState<Record<string, PromoEditState>>({});
  const [pdfStatuses, setPdfStatuses] = useState<Record<string, PdfStorageStatus>>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const reload = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      const fallbackBooks = mergeBooksWithFallback([]);
      setBooks(fallbackBooks);
      setBookEdits(Object.fromEntries(fallbackBooks.map((book) => [book.id, bookEditFromRow(book)])));
      setLoading(false);
      return;
    }

    setLoading(true);

    const [
      { data: booksData },
      { data: categoryData },
      { data: promoData },
      { data: downloadData },
      { data: donationData },
      { data: relationData, error: relationError },
    ] =
      await Promise.all([
        supabase
          .from("books")
          .select(
            "id, slug, sort_order, title_fr, title_zh, visible, price_eur, cover_image, pdf_file, synopsis_fr, synopsis_zh, asin, amazon_ebook_url, amazon_paperback_url, created_at",
          )
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase.from("categories").select("id, name, description, created_at").order("created_at", { ascending: false }),
        supabase
          .from("promo_codes")
          .select("id, code, discount_percent, valid_from, valid_until, active, show_banner, banner_text_fr, banner_text_zh")
          .order("created_at", { ascending: false }),
        supabase
          .from("downloads")
          .select("id, book_id, user_email, book_title, download_url, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("donations").select("id, user_email, amount, note, created_at").order("created_at", { ascending: false }),
        supabase.from("books").select("id, slug, related_book_ids"),
      ]);

    const relatedMap = new Map<string, string[]>();

    if (!relationError && relationData) {
      ((relationData || []) as BookRow[]).forEach((row) => {
        const relatedIds = normalizeRelatedBookIds(row.related_book_ids);
        [row.id, row.slug || ""].filter(Boolean).forEach((key) => {
          relatedMap.set(key, relatedIds);
        });
      });
    }

    const nextBooks = mergeBooksWithFallback(
      ((booksData || []) as BookRow[]).map((row) => {
        const slug = row.slug || row.id;

        return {
          ...row,
          related_book_ids: relatedMap.get(slug) || relatedMap.get(row.id) || row.related_book_ids || null,
        };
      }),
    );
    const nextCategories = (categoryData || []) as CategoryRow[];
    const nextPromos = ((promoData || []) as PromoRow[]).map(mapPromoRow);

    setBooks(nextBooks);
    setCategories(nextCategories);
    setPromoCodes(nextPromos);
    setDownloads((downloadData || []) as DownloadRow[]);
    setDonations((donationData || []) as DonationRow[]);
    setBookEdits(Object.fromEntries(nextBooks.map((book) => [book.id, bookEditFromRow(book)])));
    setCategoryEdits(Object.fromEntries(nextCategories.map((category) => [category.id, categoryEditFromRow(category)])));
    setPromoEdits(Object.fromEntries(nextPromos.map((promo) => [promo.id, promoEditFromCode(promo)])));
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (!session?.access_token || books.length === 0) {
      setPdfStatuses({});
      return;
    }

    const controller = new AbortController();

    const loadPdfStatuses = async () => {
      const assetPaths = books
        .map((book) => book.pdf_file || bookPdfPath(book.slug || book.id))
        .filter(Boolean);

      if (assetPaths.length === 0) {
        setPdfStatuses({});
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set("kind", "pdf-status");
        assetPaths.forEach((assetPath) => params.append("assetPath", assetPath));

        const response = await authorizedAdminFetch(`/api/admin/assets?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        const result = (await response.json()) as {
          ok?: boolean;
          statuses?: Record<string, PdfStorageStatus>;
          message?: string;
        };

        if (!response.ok || !result.statuses) {
          throw new Error(result.message || "无法读取 PDF 状态。");
        }

        const mappedStatuses = Object.fromEntries(
          books.map((book) => {
            const assetPath = book.pdf_file || bookPdfPath(book.slug || book.id);
            return [book.id, result.statuses?.[assetPath] || { exists: false, message: "未上传到 Supabase" }];
          }),
        );

        setPdfStatuses(mappedStatuses);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const fallbackMessage = error instanceof Error ? error.message : "状态检查失败";
        setPdfStatuses(
          Object.fromEntries(
            books.map((book) => [book.id, { exists: false, message: fallbackMessage }]),
          ),
        );
      }
    };

    void loadPdfStatuses();

    return () => {
      controller.abort();
    };
  }, [books, session?.access_token]);

  const title = useMemo(() => profile?.displayName || profile?.email || "Admin", [profile]);

  const sectionCounts = useMemo(
    () => ({
      books: books.length,
      categories: categories.length,
      promo: promoCodes.length,
      downloads: downloads.length,
      donations: donations.length,
    }),
    [books.length, categories.length, promoCodes.length, downloads.length, donations.length],
  );

  const downloadCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    downloads.forEach((download) => {
      const slug = bookIdFromDownload(download);

      if (slug) {
        counts[slug] = (counts[slug] || 0) + 1;
      }
    });

    return counts;
  }, [downloads]);

  const withBusyState = async <T,>(key: string, action: () => Promise<T>) => {
    setBusyKey(key);

    try {
      return await action();
    } finally {
      setBusyKey(null);
    }
  };

  const authorizedAdminFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!session?.access_token) {
      throw new Error("管理员会话已失效，请重新登录后再操作。");
    }

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);

    return fetch(input, {
      ...init,
      headers,
    });
  };

  const uploadAsset = async (kind: AssetKind, file: File, filename: string) => {
    const body = new FormData();
    body.append("kind", kind);
    body.append("filename", filename);
    body.append("file", file);

    const response = await authorizedAdminFetch("/api/admin/assets", {
      method: "POST",
      body,
    });

    const result = (await response.json()) as { ok?: boolean; message?: string; assetPath?: string };

    if (!response.ok || !result.assetPath) {
      throw new Error(result.message || "上传失败。");
    }

    return result.assetPath;
  };

  const removeAsset = async (kind: AssetKind, assetPath: string) => {
    const response = await authorizedAdminFetch("/api/admin/assets", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ kind, assetPath }),
    });

    const result = (await response.json()) as { ok?: boolean; message?: string };

    if (!response.ok) {
      throw new Error(result.message || "删除失败。");
    }
  };

  const validateBookForm = (state: BookFormState) => {
    if (!state.titleFr.trim() || !state.titleZh.trim()) {
      throw new Error("请先填写法语标题和中文标题。");
    }

    if (!state.slug.trim()) {
      throw new Error("请先填写书籍 slug。");
    }
  };

  const createBook = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const nextForm = { ...form, slug: slugify(form.slug || form.titleFr) };

    try {
      validateBookForm(nextForm);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "书籍信息不完整。");
      return;
    }

    await withBusyState("create-book", async () => {
      const ext = bookAssetExtensions[nextForm.slug] || "jpg";
      const nextSortOrder =
        books.reduce((max, book, index) => Math.max(max, bookSortValue(book, index)), 0) + 1;
      const relatedBookIds = nextForm.relatedBookIds
        .map((entry) => entry.trim())
        .filter((entry) => entry && entry !== nextForm.slug);

      const { error } = await supabase.from("books").insert({
        slug: nextForm.slug,
        sort_order: nextSortOrder,
        title_fr: nextForm.titleFr,
        title_zh: nextForm.titleZh,
        asin: nextForm.asin.trim() || null,
        visible: nextForm.visible,
        price_eur: Number(nextForm.priceEur || 0),
        cover_image: nextForm.coverImage || bookCoverPath(nextForm.slug, ext),
        pdf_file: nextForm.pdfFile || bookPdfPath(nextForm.slug),
        synopsis_fr: nextForm.synopsisFr || null,
        synopsis_zh: nextForm.synopsisZh || null,
        amazon_ebook_url: nextForm.amazonEbookUrl || null,
        amazon_paperback_url: nextForm.amazonPaperbackUrl || null,
        related_book_ids: relatedBookIds.length > 0 ? relatedBookIds : null,
      });

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setForm(defaultBookForm);
      setStatusMessage("新书已创建，后台数据已刷新。");
      await reload();
    });
  };

  const saveBook = async (bookId: string) => {
    const supabase = getSupabaseBrowserClient();
    const edit = bookEdits[bookId];

    if (!supabase || !edit) {
      return;
    }

    try {
      validateBookForm(edit);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "书籍信息不完整。");
      return;
    }

    await withBusyState(`save-book-${bookId}`, async () => {
      const relatedBookIds = edit.relatedBookIds
        .map((entry) => entry.trim())
        .filter((entry) => entry && entry !== edit.slug && entry !== bookId);

      const { error } = await supabase
        .from("books")
        .update({
          slug: edit.slug,
          title_fr: edit.titleFr,
          title_zh: edit.titleZh,
          asin: edit.asin || null,
          price_eur: Number(edit.priceEur || 0),
          cover_image: edit.coverImage || null,
          pdf_file: edit.pdfFile || null,
          synopsis_fr: edit.synopsisFr || null,
          synopsis_zh: edit.synopsisZh || null,
          amazon_ebook_url: edit.amazonEbookUrl || null,
          amazon_paperback_url: edit.amazonPaperbackUrl || null,
          visible: edit.visible,
          related_book_ids: relatedBookIds.length > 0 ? relatedBookIds : null,
        })
        .eq("id", bookId);

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setEditingBookId(null);
      setStatusMessage("书籍信息已更新。");
      await reload();
    });
  };

  const updateBookAssetField = async (
    bookId: string,
    field: "cover_image" | "pdf_file",
    value: string | null,
    successMessage: string,
  ) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const { error } = await supabase.from("books").update({ [field]: value }).eq("id", bookId);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    setStatusMessage(successMessage);
    await reload();
  };

  const toggleVisibility = async (id: string, visible: boolean) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await withBusyState(`toggle-book-${id}`, async () => {
      const { error } = await supabase.from("books").update({ visible: !visible }).eq("id", id);

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setStatusMessage(visible ? "图书已隐藏。" : "图书已发布。");
      await reload();
    });
  };

  const deleteBook = async (id: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await withBusyState(`delete-book-${id}`, async () => {
      const { error } = await supabase.from("books").delete().eq("id", id);

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setStatusMessage("书籍记录已删除。");
      await reload();
    });
  };

  const moveBook = async (bookId: string, direction: "up" | "down") => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const currentIndex = books.findIndex((book) => book.id === bookId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= books.length) {
      return;
    }

    const currentBook = books[currentIndex];
    const targetBook = books[targetIndex];
    const currentSortOrder = bookSortValue(currentBook, currentIndex);
    const targetSortOrder = bookSortValue(targetBook, targetIndex);

    await withBusyState(`move-book-${bookId}-${direction}`, async () => {
      const [{ error: currentError }, { error: targetError }] = await Promise.all([
        supabase.from("books").update({ sort_order: targetSortOrder }).eq("id", currentBook.id),
        supabase.from("books").update({ sort_order: currentSortOrder }).eq("id", targetBook.id),
      ]);

      if (currentError || targetError) {
        setStatusMessage(currentError?.message || targetError?.message || "排序更新失败。");
        return;
      }

      setStatusMessage(direction === "up" ? "图书已上移。" : "图书已下移。");
      await reload();
    });
  };

  const handleCreateAssetUpload = async (kind: AssetKind, file: File) => {
    const draftSlug = slugify(form.slug || form.titleFr);

    if (!draftSlug) {
      setStatusMessage("请先填写 slug 或法语标题，再上传资源。");
      return;
    }

    const filename =
      kind === "image"
        ? `${draftSlug}_cover.${imageExtensionFromFile(file)}`
        : `${draftSlug}_book.pdf`;

    await withBusyState(`create-${kind}`, async () => {
      try {
        const assetPath = await uploadAsset(kind, file, filename);
        setForm((current) => ({
          ...current,
          slug: draftSlug,
          coverImage: kind === "image" ? assetPath : current.coverImage,
          pdfFile: kind === "pdf" ? assetPath : current.pdfFile,
        }));
        setStatusMessage(kind === "image" ? "封面已上传到 GitHub images。" : "PDF 已上传到 Supabase books bucket。");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "资源上传失败。");
      }
    });
  };

  const handleCreateAssetDelete = async (kind: AssetKind) => {
    const assetPath = kind === "image" ? form.coverImage : form.pdfFile;

    if (!assetPath) {
      return;
    }

    await withBusyState(`delete-create-${kind}`, async () => {
      try {
        await removeAsset(kind, assetPath);
        setForm((current) => ({
          ...current,
          coverImage: kind === "image" ? "" : current.coverImage,
          pdfFile: kind === "pdf" ? "" : current.pdfFile,
        }));
        setStatusMessage(kind === "image" ? "草稿封面已删除。" : "草稿 PDF 已删除。");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "资源删除失败。");
      }
    });
  };

  const handleExistingAssetUpload = async (book: BookRow, kind: AssetKind, file: File) => {
    const edit = bookEdits[book.id];
    const slug = edit?.slug || book.slug || book.id;
    const filename =
      kind === "image"
        ? `${slug}_cover.${imageExtensionFromFile(file)}`
        : `${slug}_book.pdf`;

    await withBusyState(`upload-${kind}-${book.id}`, async () => {
      try {
        const assetPath = await uploadAsset(kind, file, filename);
        setBookEdits((current) => ({
          ...current,
          [book.id]: {
            ...current[book.id],
            coverImage: kind === "image" ? assetPath : current[book.id].coverImage,
            pdfFile: kind === "pdf" ? assetPath : current[book.id].pdfFile,
          },
        }));

        await updateBookAssetField(
          book.id,
          kind === "image" ? "cover_image" : "pdf_file",
          assetPath,
          kind === "image" ? "封面已更新到 GitHub。" : "PDF 已更新到 Supabase。",
        );
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "资源上传失败。");
      }
    });
  };

  const handleExistingAssetDelete = async (book: BookRow, kind: AssetKind) => {
    const edit = bookEdits[book.id];
    const assetPath = kind === "image" ? edit?.coverImage : edit?.pdfFile;

    if (!assetPath) {
      return;
    }

    await withBusyState(`delete-${kind}-${book.id}`, async () => {
      try {
        await removeAsset(kind, assetPath);
        setBookEdits((current) => ({
          ...current,
          [book.id]: {
            ...current[book.id],
            coverImage: kind === "image" ? "" : current[book.id].coverImage,
            pdfFile: kind === "pdf" ? "" : current[book.id].pdfFile,
          },
        }));

        await updateBookAssetField(
          book.id,
          kind === "image" ? "cover_image" : "pdf_file",
          null,
          kind === "image" ? "封面已删除。" : "PDF 已删除。",
        );
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "资源删除失败。");
      }
    });
  };

  const createCategory = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !categoryName.trim()) {
      setStatusMessage("请先填写类目名称。");
      return;
    }

    await withBusyState("create-category", async () => {
      const { error } = await supabase.from("categories").insert({
        name: categoryName.trim(),
        description: categoryDescription.trim() || null,
      });

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setCategoryName("");
      setCategoryDescription("");
      setStatusMessage("类目已新增。");
      await reload();
    });
  };

  const saveCategory = async (categoryId: string) => {
    const supabase = getSupabaseBrowserClient();
    const edit = categoryEdits[categoryId];

    if (!supabase || !edit) {
      return;
    }

    await withBusyState(`save-category-${categoryId}`, async () => {
      const { error } = await supabase
        .from("categories")
        .update({
          name: edit.name.trim(),
          description: edit.description.trim() || null,
        })
        .eq("id", categoryId);

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setEditingCategoryId(null);
      setStatusMessage("类目已更新。");
      await reload();
    });
  };

  const deleteCategory = async (categoryId: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await withBusyState(`delete-category-${categoryId}`, async () => {
      const { error } = await supabase.from("categories").delete().eq("id", categoryId);

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setStatusMessage("类目已删除。");
      await reload();
    });
  };

  const createPromo = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !promoForm.code.trim() || !promoForm.validFrom || !promoForm.validUntil) {
      setStatusMessage("请先填写优惠码与适用时间。");
      return;
    }

    await withBusyState("create-promo", async () => {
      const { error } = await supabase.from("promo_codes").insert({
        code: promoForm.code.trim().toUpperCase(),
        discount_percent: Number(promoForm.discountPercent || 0),
        valid_from: new Date(promoForm.validFrom).toISOString(),
        valid_until: new Date(promoForm.validUntil).toISOString(),
        active: promoForm.active,
        show_banner: promoForm.showBanner,
        banner_text_fr: promoForm.bannerTextFr || null,
        banner_text_zh: promoForm.bannerTextZh || null,
      });

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setPromoForm(defaultPromoForm);
      setStatusMessage("优惠码已创建。");
      await reload();
    });
  };

  const savePromo = async (promoId: string) => {
    const supabase = getSupabaseBrowserClient();
    const edit = promoEdits[promoId];

    if (!supabase || !edit || !edit.validFrom || !edit.validUntil) {
      setStatusMessage("请先补全优惠码的开始和结束时间。");
      return;
    }

    await withBusyState(`save-promo-${promoId}`, async () => {
      const { error } = await supabase
        .from("promo_codes")
        .update({
          code: edit.code.trim().toUpperCase(),
          discount_percent: Number(edit.discountPercent || 0),
          valid_from: new Date(edit.validFrom).toISOString(),
          valid_until: new Date(edit.validUntil).toISOString(),
          active: edit.active,
          show_banner: edit.showBanner,
          banner_text_fr: edit.bannerTextFr || null,
          banner_text_zh: edit.bannerTextZh || null,
        })
        .eq("id", promoId);

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setEditingPromoId(null);
      setStatusMessage("优惠码已更新。");
      await reload();
    });
  };

  const togglePromoBanner = async (promo: PromoCode) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await withBusyState(`toggle-banner-${promo.id}`, async () => {
      const { error } = await supabase.from("promo_codes").update({ show_banner: !promo.showBanner }).eq("id", promo.id);

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setStatusMessage(!promo.showBanner ? "首页飘屏已开启。" : "首页飘屏已关闭。");
      await reload();
    });
  };

  const togglePromoActive = async (promo: PromoCode) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await withBusyState(`toggle-promo-${promo.id}`, async () => {
      const { error } = await supabase.from("promo_codes").update({ active: !promo.active }).eq("id", promo.id);

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setStatusMessage(promo.active ? "优惠码已停用。" : "优惠码已启用。");
      await reload();
    });
  };

  const deletePromo = async (promoId: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await withBusyState(`delete-promo-${promoId}`, async () => {
      const { error } = await supabase.from("promo_codes").delete().eq("id", promoId);

      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setStatusMessage("优惠码已删除。");
      await reload();
    });
  };

  const toggleRelatedBookSelection = (
    currentValue: string[],
    relatedBookId: string,
  ) => {
    if (currentValue.includes(relatedBookId)) {
      return currentValue.filter((entry) => entry !== relatedBookId);
    }

    return [...currentValue, relatedBookId];
  };

  return (
    <main className="page-shell">
      <TopNav subtitle="后台概览 Admin" title="Visd AR 管理台" showAdmin showLogout />

      <section className="dashboard-grid">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div className="admin-sidebar-title">
              <strong>Admin</strong>
              <span className="tiny">后台管理</span>
            </div>
          </div>
          <div className="admin-sidebar-sections">
            {adminSections.map((section) => (
              <button
                key={section.key}
                className={activeSection === section.key ? "admin-sidebar-item active" : "admin-sidebar-item"}
                type="button"
                onClick={() => setActiveSection(section.key)}
              >
                <span className="admin-sidebar-item-line" />
                <span>{section.label}</span>
                <span className="admin-sidebar-count">{sectionCounts[section.key]}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel glass">
          <h1 className="section-title" style={{ fontFamily: "var(--font-heading), serif" }}>
            管理后台 Admin bilingue
          </h1>
          <p className="section-caption">
            Bienvenue {title} - 后台现在可管理书籍、PDF、封面、类目、优惠码、下载记录与主页飘屏。
          </p>
          {statusMessage ? <p className="tiny">{statusMessage}</p> : null}

          {activeSection === "books" ? (
            <>
              <div className="section-block">
                <h3>Ajouter un livre 新增图书</h3>
                <div className="input-group admin-form-grid" style={{ marginTop: 10 }}>
                  <input
                    className="input"
                    placeholder="Slug (ex: nouveau-livre)"
                    value={form.slug}
                    onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })}
                  />
                  <input
                    className="input"
                    placeholder="Titre FR"
                    value={form.titleFr}
                    onChange={(event) => setForm({ ...form, titleFr: event.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Titre ZH"
                    value={form.titleZh}
                    onChange={(event) => setForm({ ...form, titleZh: event.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="ASIN Amazon"
                    value={form.asin}
                    onChange={(event) => setForm({ ...form, asin: event.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Prix EUR"
                    value={form.priceEur}
                    onChange={(event) => setForm({ ...form, priceEur: event.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Lien ebook Amazon"
                    value={form.amazonEbookUrl}
                    onChange={(event) => setForm({ ...form, amazonEbookUrl: event.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Lien livre papier Amazon"
                    value={form.amazonPaperbackUrl}
                    onChange={(event) => setForm({ ...form, amazonPaperbackUrl: event.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Couverture /images/..."
                    value={form.coverImage}
                    onChange={(event) => setForm({ ...form, coverImage: event.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="PDF Supabase (ex: livre_book.pdf)"
                    value={form.pdfFile}
                    onChange={(event) => setForm({ ...form, pdfFile: event.target.value })}
                  />
                  <textarea
                    className="textarea"
                    placeholder="Synopsis FR"
                    value={form.synopsisFr}
                    onChange={(event) => setForm({ ...form, synopsisFr: event.target.value })}
                  />
                  <textarea
                    className="textarea"
                    placeholder="简介 ZH"
                    value={form.synopsisZh}
                    onChange={(event) => setForm({ ...form, synopsisZh: event.target.value })}
                  />
                  <label className="tiny">
                    <input
                      type="checkbox"
                      checked={form.visible}
                      onChange={() => setForm({ ...form, visible: !form.visible })}
                    />{" "}
                    Visible
                  </label>
                </div>

                <div className="section-block" style={{ marginTop: 14 }}>
                  <div className="split-line">
                    <strong>关联商品 Produits associes</strong>
                    <span className="tiny">勾选后会显示在商品详情页</span>
                  </div>
                  <div className="admin-related-grid" style={{ marginTop: 12 }}>
                    {books.length === 0 ? (
                      <p className="tiny">请先创建至少一本其它图书。</p>
                    ) : (
                      books
                        .filter((book) => relationValueFromBook(book) !== (form.slug || slugify(form.titleFr)))
                        .map((book) => {
                          const relatedValue = relationValueFromBook(book);

                          return (
                            <label className="admin-related-option" key={`create-related-${book.id}`}>
                              <input
                                type="checkbox"
                                checked={form.relatedBookIds.includes(relatedValue)}
                                onChange={() =>
                                  setForm({
                                    ...form,
                                    relatedBookIds: toggleRelatedBookSelection(form.relatedBookIds, relatedValue),
                                  })
                                }
                              />
                              <span>{book.title_zh} {book.title_fr}</span>
                            </label>
                          );
                        })
                    )}
                  </div>
                </div>

                <div className="section-block" style={{ marginTop: 14 }}>
                  <div className="split-line">
                    <strong>封面上传到 GitHub</strong>
                    {form.coverImage ? (
                      <a className="pill-button" href={form.coverImage} target="_blank" rel="noreferrer">
                        Apercu
                      </a>
                    ) : (
                      <span className="tiny">未上传封面</span>
                    )}
                  </div>
                  <div className="actions-row">
                    <input
                      className="input"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleCreateAssetUpload("image", file);
                        }
                        event.currentTarget.value = "";
                      }}
                    />
                    {form.coverImage ? (
                      <button
                        className="pill-button"
                        type="button"
                        onClick={() => void handleCreateAssetDelete("image")}
                      >
                        删除封面
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="section-block" style={{ marginTop: 14 }}>
                  <div className="split-line">
                    <strong>PDF 上传到 Supabase books</strong>
                    {form.pdfFile ? <span className="tiny">{form.pdfFile}</span> : <span className="tiny">未上传 PDF</span>}
                  </div>
                  <div className="actions-row">
                    <input
                      className="input"
                      type="file"
                      accept="application/pdf"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleCreateAssetUpload("pdf", file);
                        }
                        event.currentTarget.value = "";
                      }}
                    />
                    {form.pdfFile ? (
                      <button
                        className="pill-button"
                        type="button"
                        onClick={() => void handleCreateAssetDelete("pdf")}
                      >
                        删除 PDF
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="actions-row" style={{ marginTop: 14 }}>
                  <button
                    className="cta-button"
                    type="button"
                    disabled={busyKey === "create-book"}
                    onClick={() => void createBook()}
                  >
                    {busyKey === "create-book" ? "Création..." : "Créer"}
                  </button>
                </div>
              </div>

              <div className="section-block">
                <h3>Livres 图书</h3>
                {loading ? (
                  <p className="muted">Chargement...</p>
                ) : books.length === 0 ? (
                  <p className="muted">暂无图书数据。</p>
                ) : (
                  books.map((book) => {
                    const edit = bookEdits[book.id];
                    const isEditing = editingBookId === book.id;
                    const downloadCount = downloadCounts[book.slug || book.id] || 0;
                    const pdfStatus = pdfStatuses[book.id];

                    return (
                      <div className="admin-book-card" key={book.id}>
                        <div className="admin-book-preview">
                          <Image
                            src={edit?.coverImage || bookCoverPath(book.slug || book.id, "jpg")}
                            alt={book.title_fr}
                            width={88}
                            height={118}
                            className="admin-book-cover"
                          />
                          <div>
                            <strong>{book.title_zh}</strong>
                            <div className="tiny">{book.title_fr}</div>
                            <div className="tiny">{book.price_eur?.toFixed(2) || "0.00"} EUR</div>
                            <div className="tiny">排序 Sort: {bookSortValue(book, books.findIndex((entry) => entry.id === book.id))}</div>
                            <div className="tiny">Slug: {book.slug || book.id}</div>
                            <div className="tiny">Downloads 下载次数: {downloadCount}</div>
                            <div className="tiny">{book.visible ? "已上架 Visible" : "已隐藏 Hidden"}</div>
                            <div className="tiny">
                              PDF 状态: {pdfStatus ? pdfStatus.message : "检查中..."}
                            </div>
                          </div>
                        </div>

                        {isEditing && edit ? (
                          <>
                            <div className="input-group admin-form-grid">
                              <input
                                className="input"
                                placeholder="Slug"
                                value={edit.slug}
                                onChange={(event) =>
                                  setBookEdits({ ...bookEdits, [book.id]: { ...edit, slug: slugify(event.target.value) } })
                                }
                              />
                              <input
                                className="input"
                                placeholder="Titre FR"
                                value={edit.titleFr}
                                onChange={(event) =>
                                  setBookEdits({ ...bookEdits, [book.id]: { ...edit, titleFr: event.target.value } })
                                }
                              />
                              <input
                                className="input"
                                placeholder="Titre ZH"
                                value={edit.titleZh}
                                onChange={(event) =>
                                  setBookEdits({ ...bookEdits, [book.id]: { ...edit, titleZh: event.target.value } })
                                }
                              />
                              <input
                                className="input"
                                placeholder="ASIN Amazon"
                                value={edit.asin}
                                onChange={(event) =>
                                  setBookEdits({ ...bookEdits, [book.id]: { ...edit, asin: event.target.value } })
                                }
                              />
                              <input
                                className="input"
                                placeholder="Prix EUR"
                                value={edit.priceEur}
                                onChange={(event) =>
                                  setBookEdits({ ...bookEdits, [book.id]: { ...edit, priceEur: event.target.value } })
                                }
                              />
                              <input
                                className="input"
                                placeholder="Lien ebook Amazon"
                                value={edit.amazonEbookUrl}
                                onChange={(event) =>
                                  setBookEdits({ ...bookEdits, [book.id]: { ...edit, amazonEbookUrl: event.target.value } })
                                }
                              />
                              <input
                                className="input"
                                placeholder="Lien livre papier Amazon"
                                value={edit.amazonPaperbackUrl}
                                onChange={(event) =>
                                  setBookEdits({ ...bookEdits, [book.id]: { ...edit, amazonPaperbackUrl: event.target.value } })
                                }
                              />
                              <input
                                className="input"
                                placeholder="Couverture"
                                value={edit.coverImage}
                                onChange={(event) =>
                                  setBookEdits({ ...bookEdits, [book.id]: { ...edit, coverImage: event.target.value } })
                                }
                              />
                              <input
                                className="input"
                                placeholder="PDF"
                                value={edit.pdfFile}
                                onChange={(event) =>
                                  setBookEdits({ ...bookEdits, [book.id]: { ...edit, pdfFile: event.target.value } })
                                }
                              />
                              <textarea
                                className="textarea"
                                placeholder="Synopsis FR"
                                value={edit.synopsisFr}
                                onChange={(event) =>
                                  setBookEdits({ ...bookEdits, [book.id]: { ...edit, synopsisFr: event.target.value } })
                                }
                              />
                              <textarea
                                className="textarea"
                                placeholder="简介 ZH"
                                value={edit.synopsisZh}
                                onChange={(event) =>
                                  setBookEdits({ ...bookEdits, [book.id]: { ...edit, synopsisZh: event.target.value } })
                                }
                              />
                              <label className="tiny">
                                <input
                                  type="checkbox"
                                  checked={edit.visible}
                                  onChange={() =>
                                    setBookEdits({ ...bookEdits, [book.id]: { ...edit, visible: !edit.visible } })
                                  }
                                />{" "}
                                Visible
                              </label>
                            </div>

                            <div className="section-block" style={{ marginTop: 14 }}>
                              <div className="split-line">
                                <strong>关联商品 Produits associes</strong>
                                <span className="tiny">详情页左侧会显示这些商品</span>
                              </div>
                              <div className="admin-related-grid" style={{ marginTop: 12 }}>
                                {books
                                  .filter((candidate) => relationValueFromBook(candidate) !== relationValueFromBook(book))
                                  .map((candidate) => {
                                    const relatedValue = relationValueFromBook(candidate);

                                    return (
                                      <label className="admin-related-option" key={`${book.id}-related-${candidate.id}`}>
                                        <input
                                          type="checkbox"
                                          checked={edit.relatedBookIds.includes(relatedValue)}
                                          onChange={() =>
                                            setBookEdits({
                                              ...bookEdits,
                                              [book.id]: {
                                                ...edit,
                                                relatedBookIds: toggleRelatedBookSelection(edit.relatedBookIds, relatedValue),
                                              },
                                            })
                                          }
                                        />
                                        <span>{candidate.title_zh} {candidate.title_fr}</span>
                                      </label>
                                    );
                                  })}
                              </div>
                            </div>

                            <div className="section-block" style={{ marginTop: 14 }}>
                              <div className="split-line">
                                <strong>封面 GitHub</strong>
                                {edit.coverImage ? (
                                  <a className="pill-button" href={edit.coverImage} target="_blank" rel="noreferrer">
                                    Apercu
                                  </a>
                                ) : (
                                  <span className="tiny">暂无封面</span>
                                )}
                              </div>
                              <div className="actions-row">
                                <input
                                  className="input"
                                  type="file"
                                  accept="image/*"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) {
                                      void handleExistingAssetUpload(book, "image", file);
                                    }
                                    event.currentTarget.value = "";
                                  }}
                                />
                                {edit.coverImage ? (
                                  <button
                                    className="pill-button"
                                    type="button"
                                    onClick={() => void handleExistingAssetDelete(book, "image")}
                                  >
                                    删除封面
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            <div className="section-block" style={{ marginTop: 14 }}>
                              <div className="split-line">
                                <strong>PDF Supabase</strong>
                                {edit.pdfFile ? <span className="tiny">{edit.pdfFile}</span> : <span className="tiny">暂无 PDF</span>}
                              </div>
                              <p className="tiny" style={{ marginTop: 8 }}>
                                当前状态: {pdfStatus ? pdfStatus.message : "检查中..."}
                              </p>
                              <div className="actions-row">
                                <input
                                  className="input"
                                  type="file"
                                  accept="application/pdf"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) {
                                      void handleExistingAssetUpload(book, "pdf", file);
                                    }
                                    event.currentTarget.value = "";
                                  }}
                                />
                                {edit.pdfFile ? (
                                  <button
                                    className="pill-button"
                                    type="button"
                                    onClick={() => void handleExistingAssetDelete(book, "pdf")}
                                  >
                                    删除 PDF
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="muted tiny">{book.synopsis_fr || "Sans synopsis"}</p>
                        )}

                        <div className="actions-row">
                          {isEditing ? (
                            <>
                              <button
                                className="pill-button"
                                type="button"
                                disabled={busyKey === `save-book-${book.id}`}
                                onClick={() => void saveBook(book.id)}
                              >
                                {busyKey === `save-book-${book.id}` ? "Enregistrement..." : "Enregistrer"}
                              </button>
                              <button className="pill-button" type="button" onClick={() => setEditingBookId(null)}>
                                Annuler
                              </button>
                            </>
                          ) : (
                            <button className="pill-button" type="button" onClick={() => setEditingBookId(book.id)}>
                              Modifier
                            </button>
                          )}
                          <button className="pill-button" type="button" onClick={() => void toggleVisibility(book.id, Boolean(book.visible))}>
                            {book.visible ? "Masquer" : "Publier"}
                          </button>
                          <button
                            className="pill-button"
                            type="button"
                            disabled={busyKey === `move-book-${book.id}-up`}
                            onClick={() => void moveBook(book.id, "up")}
                          >
                            Monter
                          </button>
                          <button
                            className="pill-button"
                            type="button"
                            disabled={busyKey === `move-book-${book.id}-down`}
                            onClick={() => void moveBook(book.id, "down")}
                          >
                            Descendre
                          </button>
                          <button className="pill-button" type="button" onClick={() => void deleteBook(book.id)}>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : null}

          {activeSection === "categories" ? (
            <>
              <div className="section-block">
                <h3>Créer une catégorie 新增类目</h3>
                <div className="input-group" style={{ marginTop: 10 }}>
                  <input
                    className="input"
                    placeholder="Nom de la categorie"
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Description"
                    value={categoryDescription}
                    onChange={(event) => setCategoryDescription(event.target.value)}
                  />
                  <button className="cta-button" type="button" onClick={() => void createCategory()}>
                    Créer la catégorie
                  </button>
                </div>
              </div>

              <div className="section-block">
                <h3>Catégories dynamiques 动态类目</h3>
                <div className="admin-list">
                  {categories.map((category) => {
                    const edit = categoryEdits[category.id];
                    const isEditing = editingCategoryId === category.id;

                    return (
                      <div className="admin-book-card" key={category.id}>
                        {isEditing && edit ? (
                          <div className="input-group">
                            <input
                              className="input"
                              placeholder="Nom"
                              value={edit.name}
                              onChange={(event) =>
                                setCategoryEdits({ ...categoryEdits, [category.id]: { ...edit, name: event.target.value } })
                              }
                            />
                            <input
                              className="input"
                              placeholder="Description"
                              value={edit.description}
                              onChange={(event) =>
                                setCategoryEdits({
                                  ...categoryEdits,
                                  [category.id]: { ...edit, description: event.target.value },
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div className="split-line">
                            <strong>{category.name}</strong>
                            <span className="tiny">{category.description || "Sans description"}</span>
                          </div>
                        )}

                        <div className="actions-row">
                          {isEditing ? (
                            <>
                              <button className="pill-button" type="button" onClick={() => void saveCategory(category.id)}>
                                Enregistrer
                              </button>
                              <button className="pill-button" type="button" onClick={() => setEditingCategoryId(null)}>
                                Annuler
                              </button>
                            </>
                          ) : (
                            <button className="pill-button" type="button" onClick={() => setEditingCategoryId(category.id)}>
                              Modifier
                            </button>
                          )}
                          <button className="pill-button" type="button" onClick={() => void deleteCategory(category.id)}>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

          {activeSection === "promo" ? (
            <>
              <div className="section-block">
                <h3>Créer un code promo 新增优惠码</h3>
                <div className="input-group admin-form-grid" style={{ marginTop: 10 }}>
                  <input
                    className="input"
                    placeholder="Code"
                    value={promoForm.code}
                    onChange={(event) => setPromoForm({ ...promoForm, code: event.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Remise %"
                    value={promoForm.discountPercent}
                    onChange={(event) => setPromoForm({ ...promoForm, discountPercent: event.target.value })}
                  />
                  <input
                    className="input"
                    type="datetime-local"
                    value={promoForm.validFrom}
                    onChange={(event) => setPromoForm({ ...promoForm, validFrom: event.target.value })}
                  />
                  <input
                    className="input"
                    type="datetime-local"
                    value={promoForm.validUntil}
                    onChange={(event) => setPromoForm({ ...promoForm, validUntil: event.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Texte bannière FR"
                    value={promoForm.bannerTextFr}
                    onChange={(event) => setPromoForm({ ...promoForm, bannerTextFr: event.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="漂浮提示 ZH"
                    value={promoForm.bannerTextZh}
                    onChange={(event) => setPromoForm({ ...promoForm, bannerTextZh: event.target.value })}
                  />
                  <label className="tiny">
                    <input
                      type="checkbox"
                      checked={promoForm.active}
                      onChange={() => setPromoForm({ ...promoForm, active: !promoForm.active })}
                    />{" "}
                    Actif
                  </label>
                  <label className="tiny">
                    <input
                      type="checkbox"
                      checked={promoForm.showBanner}
                      onChange={() => setPromoForm({ ...promoForm, showBanner: !promoForm.showBanner })}
                    />{" "}
                    Afficher sur l&apos;accueil
                  </label>
                  <button className="cta-button" type="button" onClick={() => void createPromo()}>
                    Créer le code
                  </button>
                </div>
              </div>

              <div className="section-block">
                <h3>Codes promo 优惠码管理</h3>
                {promoCodes.length === 0 ? (
                  <p className="muted">Aucun code promo pour le moment.</p>
                ) : (
                  promoCodes.map((promo) => {
                    const edit = promoEdits[promo.id];
                    const isEditing = editingPromoId === promo.id;

                    return (
                      <div className="admin-book-card" key={promo.id}>
                        {isEditing && edit ? (
                          <div className="input-group admin-form-grid">
                            <input
                              className="input"
                              placeholder="Code"
                              value={edit.code}
                              onChange={(event) =>
                                setPromoEdits({ ...promoEdits, [promo.id]: { ...edit, code: event.target.value } })
                              }
                            />
                            <input
                              className="input"
                              placeholder="Remise %"
                              value={edit.discountPercent}
                              onChange={(event) =>
                                setPromoEdits({
                                  ...promoEdits,
                                  [promo.id]: { ...edit, discountPercent: event.target.value },
                                })
                              }
                            />
                            <input
                              className="input"
                              type="datetime-local"
                              value={edit.validFrom}
                              onChange={(event) =>
                                setPromoEdits({ ...promoEdits, [promo.id]: { ...edit, validFrom: event.target.value } })
                              }
                            />
                            <input
                              className="input"
                              type="datetime-local"
                              value={edit.validUntil}
                              onChange={(event) =>
                                setPromoEdits({ ...promoEdits, [promo.id]: { ...edit, validUntil: event.target.value } })
                              }
                            />
                            <input
                              className="input"
                              placeholder="Texte bannière FR"
                              value={edit.bannerTextFr}
                              onChange={(event) =>
                                setPromoEdits({
                                  ...promoEdits,
                                  [promo.id]: { ...edit, bannerTextFr: event.target.value },
                                })
                              }
                            />
                            <input
                              className="input"
                              placeholder="漂浮提示 ZH"
                              value={edit.bannerTextZh}
                              onChange={(event) =>
                                setPromoEdits({
                                  ...promoEdits,
                                  [promo.id]: { ...edit, bannerTextZh: event.target.value },
                                })
                              }
                            />
                            <label className="tiny">
                              <input
                                type="checkbox"
                                checked={edit.active}
                                onChange={() =>
                                  setPromoEdits({ ...promoEdits, [promo.id]: { ...edit, active: !edit.active } })
                                }
                              />{" "}
                              Actif
                            </label>
                            <label className="tiny">
                              <input
                                type="checkbox"
                                checked={edit.showBanner}
                                onChange={() =>
                                  setPromoEdits({
                                    ...promoEdits,
                                    [promo.id]: { ...edit, showBanner: !edit.showBanner },
                                  })
                                }
                              />{" "}
                              飘屏
                            </label>
                          </div>
                        ) : (
                          <div className="split-line">
                            <div>
                              <strong>{promo.code}</strong>
                              <div className="tiny">
                                -{promo.discountPercent}% · {new Date(promo.validFrom).toLocaleDateString("fr-FR")} →{" "}
                                {new Date(promo.validUntil).toLocaleDateString("fr-FR")}
                              </div>
                              <div className="tiny">
                                {isPromoActive(promo) ? "En cours" : "Hors période"} · Bannière{" "}
                                {promo.showBanner ? "visible" : "masquée"}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="actions-row">
                          {isEditing ? (
                            <>
                              <button className="pill-button" type="button" onClick={() => void savePromo(promo.id)}>
                                Enregistrer
                              </button>
                              <button className="pill-button" type="button" onClick={() => setEditingPromoId(null)}>
                                Annuler
                              </button>
                            </>
                          ) : (
                            <button className="pill-button" type="button" onClick={() => setEditingPromoId(promo.id)}>
                              Modifier
                            </button>
                          )}
                          <button className="pill-button" type="button" onClick={() => void togglePromoBanner(promo)}>
                            {promo.showBanner ? "关闭飘屏" : "开启飘屏"}
                          </button>
                          <button className="pill-button" type="button" onClick={() => void togglePromoActive(promo)}>
                            {promo.active ? "Désactiver" : "Activer"}
                          </button>
                          <button className="pill-button" type="button" onClick={() => void deletePromo(promo.id)}>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : null}

          {activeSection === "downloads" ? (
            <div className="section-block">
              <h3>Historique de téléchargements 下载记录</h3>
              <div className="admin-list" style={{ marginBottom: 16 }}>
                {books.map((book) => (
                  <div className="split-line" key={book.id}>
                    <span>{book.title_fr}</span>
                    <span className="tiny">{downloadCounts[book.slug || book.id] || 0} 次下载</span>
                  </div>
                ))}
              </div>
              {downloads.length === 0 ? (
                <p className="muted">Aucun téléchargement enregistré.</p>
              ) : (
                downloads.map((download) => (
                  <div className="split-line" key={download.id}>
                    <span>{download.book_title || "Livre"}</span>
                    <span className="tiny">{download.user_email || "—"}</span>
                    <span className="tiny">
                      {download.created_at ? new Date(download.created_at).toLocaleString("fr-FR") : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {activeSection === "donations" ? (
            <div className="section-block">
              <h3>Dons Donations</h3>
              {donations.length === 0 ? (
                <p className="muted">Aucune donation enregistrée.</p>
              ) : (
                donations.map((donation) => (
                  <div className="split-line" key={donation.id}>
                    <span>{donation.note || "Donation"}</span>
                    <span className="tiny">{donation.user_email || "—"}</span>
                    <span className="tiny">{donation.amount ? `${donation.amount.toFixed(2)} EUR` : "—"}</span>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminPageContent />
    </AdminGuard>
  );
}
