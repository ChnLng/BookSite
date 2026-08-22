-- Unified private digital documents for every sellable product category.
-- Safe to run repeatedly in the Supabase SQL editor.

begin;

do $migration$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'categories'
      and column_name = 'allowed_delivery_modes'
  ) then
    alter table public.categories
      add column allowed_delivery_modes text[] not null default array['download']::text[];
    update public.categories
    set allowed_delivery_modes = array['download', 'view']::text[]
    where kind in ('book', 'resource', 'custom');
  end if;
end
$migration$;

update public.categories
set allowed_file_types = case
  when kind = 'book' then array['.pdf', '.epub', '.zip', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.txt', '.md']::text[]
  else array[
    '.pdf', '.epub', '.zip', '.7z', '.rar', '.svg', '.png', '.jpg', '.jpeg', '.webp',
    '.txt', '.md', '.csv', '.json', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
    '.fbx', '.glb', '.gltf', '.obj', '.stl', '.blend', '.usdz', '.dwg', '.dxf',
    '.mp3', '.wav', '.mp4', '.mov', '.webm', '.exe', '.dmg', '.apk', '.aab', '.apks', '.xapk', '.ipa'
  ]::text[]
end
where coalesce(array_length(allowed_file_types, 1), 0) = 0;

create table if not exists public.product_documents (
  id uuid primary key default gen_random_uuid(),
  product_kind text not null check (product_kind in ('book', 'resource')),
  book_id uuid references public.books(id) on delete cascade,
  resource_id uuid references public.resource_items(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  label_fr text not null,
  label_zh text,
  file_name text not null,
  file_extension text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  asset_reference text not null,
  delivery_mode text not null default 'download' check (delivery_mode in ('download', 'view', 'both')),
  visible boolean not null default true,
  sort_order integer not null default 10,
  version integer not null default 1 check (version > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_documents_exact_product check (
    (product_kind = 'book' and book_id is not null and resource_id is null)
    or
    (product_kind = 'resource' and resource_id is not null and book_id is null)
  )
);

create index if not exists product_documents_book_sort_idx
  on public.product_documents (book_id, visible, sort_order, created_at)
  where deleted_at is null;

create index if not exists product_documents_resource_sort_idx
  on public.product_documents (resource_id, visible, sort_order, created_at)
  where deleted_at is null;

create unique index if not exists product_documents_active_asset_unique_idx
  on public.product_documents (asset_reference)
  where deleted_at is null;

insert into public.product_documents (
  product_kind, book_id, category_id, label_fr, file_name, file_extension,
  mime_type, asset_reference, delivery_mode, visible, sort_order
)
select
  'book',
  book.id,
  book.category_id,
  coalesce(nullif(book.title_fr, ''), nullif(book.title_zh, ''), book.slug, 'Livre numérique'),
  coalesce(nullif(substring(book.pdf_file from '[^/:]+$'), ''), coalesce(book.slug, book.id::text) || '_book.pdf'),
  coalesce(nullif(lower(substring(book.pdf_file from '\.([a-zA-Z0-9]+)(?:[?#].*)?$')), ''), 'pdf'),
  case lower(coalesce(substring(book.pdf_file from '\.([a-zA-Z0-9]+)(?:[?#].*)?$'), 'pdf'))
    when 'pdf' then 'application/pdf'
    when 'epub' then 'application/epub+zip'
    when 'svg' then 'image/svg+xml'
    else 'application/octet-stream'
  end,
  book.pdf_file,
  case when lower(coalesce(substring(book.pdf_file from '\.([a-zA-Z0-9]+)(?:[?#].*)?$'), '')) = 'pdf' then 'both' else 'download' end,
  true,
  10
from public.books book
where coalesce(trim(book.pdf_file), '') <> ''
  and book.deleted_at is null
  and not exists (
    select 1 from public.product_documents document
    where document.book_id = book.id and document.deleted_at is null
  );

insert into public.product_documents (
  product_kind, resource_id, category_id, label_fr, file_name, file_extension,
  mime_type, asset_reference, delivery_mode, visible, sort_order
)
select
  'resource',
  item.id,
  item.category_id,
  coalesce(nullif(file.label_fr, ''), nullif(file.platform, ''), item.title_fr, 'Téléchargement'),
  coalesce(
    nullif(substring(coalesce(file.file_path, file.file_url) from '[^/]+$'), ''),
    item.slug || '-' || file.id::text
  ),
  coalesce(nullif(lower(substring(coalesce(file.file_path, file.file_url) from '\.([a-zA-Z0-9]+)(?:[?#].*)?$')), ''), 'bin'),
  'application/octet-stream',
  coalesce(file.file_path, file.file_url),
  'download',
  true,
  coalesce(file.sort_order, 10)
from public.resource_item_files file
join public.resource_items item on item.id = file.resource_id
where coalesce(trim(coalesce(file.file_path, file.file_url)), '') <> ''
  and item.deleted_at is null
  and not exists (
    select 1 from public.product_documents document
    where document.resource_id = item.id
      and document.asset_reference = coalesce(file.file_path, file.file_url)
      and document.deleted_at is null
  );

alter table public.product_documents enable row level security;

revoke all on table public.product_documents from anon, authenticated;
grant select, insert, update, delete on table public.product_documents to authenticated;

drop policy if exists "Admins can manage product documents" on public.product_documents;
create policy "Admins can manage product documents"
on public.product_documents for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Product document metadata and private asset references are intentionally not
-- readable by anonymous storefront clients. Public metadata is exposed only by
-- the sanitized API route.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('admin-upload-staging', 'admin-upload-staging', false, null, null)
on conflict (id) do update
set public = excluded.public,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload staged product files" on storage.objects;
create policy "Admins can upload staged product files"
on storage.objects for insert to authenticated
with check (bucket_id = 'admin-upload-staging' and public.is_admin());

drop policy if exists "Admins can update staged product files" on storage.objects;
create policy "Admins can update staged product files"
on storage.objects for update to authenticated
using (bucket_id = 'admin-upload-staging' and public.is_admin())
with check (bucket_id = 'admin-upload-staging' and public.is_admin());

drop policy if exists "Admins can delete staged product files" on storage.objects;
create policy "Admins can delete staged product files"
on storage.objects for delete to authenticated
using (bucket_id = 'admin-upload-staging' and public.is_admin());

notify pgrst, 'reload schema';

commit;
