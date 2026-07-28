alter table public.downloads
  add column if not exists amount_paid numeric(10,2),
  add column if not exists currency text not null default 'EUR',
  add column if not exists download_count integer not null default 0,
  add column if not exists last_downloaded_at timestamptz;

create index if not exists downloads_book_report_idx
  on public.downloads (book_id, created_at desc);

create index if not exists downloads_resource_report_idx
  on public.downloads (resource_id, created_at desc);

notify pgrst, 'reload schema';
