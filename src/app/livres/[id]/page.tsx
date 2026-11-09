import BookDetailPage from "./book-detail-client";
import { loadCachedPublicDisplayBooks } from "@/lib/books-public-server";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const books = await loadCachedPublicDisplayBooks();
  const initialBook = books.find((book) => book.id === id || book.dbId === id) || null;
  return <BookDetailPage initialBook={initialBook} />;
}
