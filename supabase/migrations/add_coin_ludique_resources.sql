create extension if not exists pgcrypto;

create table if not exists public.resource_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title_fr text not null,
  summary_fr text,
  qr_image_url text,
  external_url text,
  visible boolean not null default true,
  sort_order integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resource_items
  add column if not exists slug text,
  add column if not exists title_fr text,
  add column if not exists summary_fr text,
  add column if not exists qr_image_url text,
  add column if not exists external_url text,
  add column if not exists visible boolean not null default true,
  add column if not exists sort_order integer not null default 10,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists resource_items_slug_unique_idx
  on public.resource_items (slug)
  where slug is not null;

create index if not exists resource_items_visible_sort_idx
  on public.resource_items (visible, sort_order, created_at);

create table if not exists public.resource_item_files (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resource_items(id) on delete cascade,
  platform text not null default '通用'
    check (platform in ('通用', 'Mac', 'Windows', 'Linux', '手机')),
  label_fr text not null,
  file_url text,
  file_path text,
  external_url text,
  sort_order integer not null default 10,
  created_at timestamptz not null default now(),
  constraint resource_item_files_source_check check (
    coalesce(length(trim(file_url)), 0) > 0
    or coalesce(length(trim(file_path)), 0) > 0
    or coalesce(length(trim(external_url)), 0) > 0
  )
);

alter table public.resource_item_files
  add column if not exists resource_id uuid references public.resource_items(id) on delete cascade,
  add column if not exists platform text not null default '通用',
  add column if not exists label_fr text,
  add column if not exists file_url text,
  add column if not exists file_path text,
  add column if not exists external_url text,
  add column if not exists sort_order integer not null default 10,
  add column if not exists created_at timestamptz not null default now();

update public.resource_item_files
set file_url = file_path
where file_url is null
  and file_path is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'resource_item_files_platform_check'
      and conrelid = 'public.resource_item_files'::regclass
  ) then
    alter table public.resource_item_files
      add constraint resource_item_files_platform_check
      check (platform in ('通用', 'Mac', 'Windows', 'Linux', '手机'));
  end if;
end $$;

create index if not exists resource_item_files_resource_sort_idx
  on public.resource_item_files (resource_id, sort_order, created_at);

alter table public.resource_items enable row level security;
alter table public.resource_item_files enable row level security;

drop policy if exists "Anyone can read visible resource items" on public.resource_items;
drop policy if exists "Admins can manage resource items" on public.resource_items;
create policy "Anyone can read visible resource items" on public.resource_items
  for select using (visible = true);
create policy "Admins can manage resource items" on public.resource_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone can read resource item files" on public.resource_item_files;
drop policy if exists "Admins can manage resource item files" on public.resource_item_files;
create policy "Anyone can read resource item files" on public.resource_item_files
  for select using (
    exists (
      select 1
      from public.resource_items
      where public.resource_items.id = resource_id
        and public.resource_items.visible = true
    )
  );
create policy "Admins can manage resource item files" on public.resource_item_files
  for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resource-downloads',
  'resource-downloads',
  true,
  209715200,
  array[
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
    'application/x-7z-compressed'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read resource downloads" on storage.objects;
drop policy if exists "Admins can upload resource downloads" on storage.objects;
drop policy if exists "Admins can update resource downloads" on storage.objects;
drop policy if exists "Admins can delete resource downloads" on storage.objects;

create policy "Public can read resource downloads" on storage.objects
  for select using (bucket_id = 'resource-downloads');

create policy "Admins can upload resource downloads" on storage.objects
  for insert with check (bucket_id = 'resource-downloads' and public.is_admin());

create policy "Admins can update resource downloads" on storage.objects
  for update using (bucket_id = 'resource-downloads' and public.is_admin())
  with check (bucket_id = 'resource-downloads' and public.is_admin());

create policy "Admins can delete resource downloads" on storage.objects
  for delete using (bucket_id = 'resource-downloads' and public.is_admin());

notify pgrst, 'reload schema';
