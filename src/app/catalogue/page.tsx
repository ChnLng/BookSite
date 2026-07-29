import { CatalogueClient } from "@/components/catalogue-client";
import { loadCachedPublicDisplayBooks } from "@/lib/books-public-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CataloguePage() {
  const initialBooks = await loadCachedPublicDisplayBooks();

  return <CatalogueClient initialBooks={initialBooks} />;
}
