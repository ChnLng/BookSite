create index if not exists downloads_user_book_lookup_idx
  on public.downloads (user_id, book_id, created_at desc)
  where book_id is not null;

create index if not exists downloads_email_book_lookup_idx
  on public.downloads (user_email, book_id, created_at desc)
  where book_id is not null;

create index if not exists downloads_user_resource_lookup_idx
  on public.downloads (user_id, resource_id, created_at desc)
  where resource_id is not null;

create index if not exists downloads_email_resource_lookup_idx
  on public.downloads (user_email, resource_id, created_at desc)
  where resource_id is not null;
