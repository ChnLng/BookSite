alter table public.books
add column if not exists related_book_ids text[];
