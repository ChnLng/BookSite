import { bookAssetExtensions, bookCoverPath } from "./book-assets";
import { richTextToPlainText } from "./rich-text";

export type LatestProductRow = {
  id: string;
  slug: string | null;
  title_fr: string | null;
  price_eur: number | string | null;
  created_at: string | null;
  visible: boolean | null;
  deleted_at: string | null;
  cover_image?: string | null;
  cover_image_url?: string | null;
  qr_image_url?: string | null;
};

export type LatestProduct = {
  id: string;
  kind: "book" | "resource";
  title: string;
  href: string;
  image: string;
  priceEur: number;
  createdAt: string;
};

export function selectLatestProducts(books: LatestProductRow[], resources: LatestProductRow[]): LatestProduct[] {
  const mapProduct = (row: LatestProductRow, kind: LatestProduct["kind"]): LatestProduct => {
    const slug = row.slug || row.id;
    const price = Number(row.price_eur || 0);
    return {
      id: `${kind}-${row.id}`,
      kind,
      title: richTextToPlainText(row.title_fr) || (kind === "book" ? "Livre bilingue" : "Ressource numérique"),
      href: `/${kind === "book" ? "livres" : "outils"}/${encodeURIComponent(slug)}`,
      image: kind === "book"
        ? row.cover_image || bookCoverPath(slug, bookAssetExtensions[slug] || "jpg")
        : row.cover_image_url || row.qr_image_url || "/images/logo.png",
      priceEur: Number.isFinite(price) ? Math.max(0, price) : 0,
      createdAt: row.created_at!,
    };
  };
  const isPublished = (row: LatestProductRow) =>
    row.visible === true && !row.deleted_at && Boolean(row.created_at) && Number.isFinite(Date.parse(row.created_at!));

  return [
    ...books.filter(isPublished).map((row) => mapProduct(row, "book")),
    ...resources.filter(isPublished).map((row) => mapProduct(row, "resource")),
  ]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.id.localeCompare(right.id))
    .slice(0, 2);
}
