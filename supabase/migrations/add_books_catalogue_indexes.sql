create extension if not exists pg_trgm;

create index if not exists books_catalogue_visible_sort_idx
  on public.books (visible, sort_order, created_at);

create index if not exists books_title_fr_trgm_idx
  on public.books using gin (lower(title_fr) gin_trgm_ops);

create index if not exists books_title_zh_trgm_idx
  on public.books using gin (lower(title_zh) gin_trgm_ops);
