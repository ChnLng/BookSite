alter table public.resource_items
  add column if not exists cover_image_url text,
  add column if not exists price_eur numeric(10, 2) not null default 0;

update public.resource_items
set cover_image_url = coalesce(cover_image_url, qr_image_url)
where cover_image_url is null
  and qr_image_url is not null;

alter table public.downloads
  add column if not exists download_kind text not null default 'book',
  add column if not exists resource_id uuid references public.resource_items(id) on delete set null,
  add column if not exists resource_title text,
  add column if not exists resource_file_id uuid references public.resource_item_files(id) on delete set null;

create index if not exists downloads_resource_lookup_idx
  on public.downloads (resource_id, user_id, user_email, created_at desc);

create table if not exists public.partner_links (
  id uuid primary key default gen_random_uuid(),
  title_fr text not null,
  icon_url text not null,
  target_url text not null,
  sort_order integer not null default 10,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.partner_links
  add column if not exists title_fr text,
  add column if not exists icon_url text,
  add column if not exists target_url text,
  add column if not exists sort_order integer not null default 10,
  add column if not exists visible boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists partner_links_visible_sort_idx
  on public.partner_links (visible, sort_order, created_at);

alter table public.partner_links enable row level security;

drop policy if exists "Anyone can read visible partner links" on public.partner_links;
drop policy if exists "Admins can manage partner links" on public.partner_links;

create policy "Anyone can read visible partner links" on public.partner_links
  for select using (visible = true);

create policy "Admins can manage partner links" on public.partner_links
  for all using (public.is_admin()) with check (public.is_admin());

update storage.buckets
set public = false
where id = 'resource-downloads';

drop policy if exists "Public can read resource downloads" on storage.objects;
drop policy if exists "Admins can upload resource downloads" on storage.objects;
drop policy if exists "Admins can update resource downloads" on storage.objects;
drop policy if exists "Admins can delete resource downloads" on storage.objects;

create policy "Admins can upload resource downloads" on storage.objects
  for insert with check (bucket_id = 'resource-downloads' and public.is_admin());

create policy "Admins can update resource downloads" on storage.objects
  for update using (bucket_id = 'resource-downloads' and public.is_admin())
  with check (bucket_id = 'resource-downloads' and public.is_admin());

create policy "Admins can delete resource downloads" on storage.objects
  for delete using (bucket_id = 'resource-downloads' and public.is_admin());

notify pgrst, 'reload schema';
