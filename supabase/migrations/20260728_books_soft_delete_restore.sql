alter table public.books
  add column if not exists deleted_at timestamptz;

create index if not exists books_active_sort_idx
  on public.books (sort_order, created_at)
  where deleted_at is null;
