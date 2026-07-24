import { CatalogueClient } from "@/components/catalogue-client";
import { loadCachedPublicDisplayBooks } from "@/lib/books-public-server";

export default async function CataloguePage() {
  const initialBooks = await loadCachedPublicDisplayBooks();

  return <CatalogueClient initialBooks={initialBooks} />;
}
