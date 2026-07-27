create extension if not exists pgcrypto;

alter table public.categories
  add column if not exists kind text not null default 'book'
    check (kind in ('book', 'resource', 'custom')),
  add column if not exists homepage_visible boolean not null default false,
  add column if not exists homepage_sort_order integer not null default 100,
  add column if not exists icon_name text not null default 'sparkles',
  add column if not exists intro_fr text,
  add column if not exists allowed_file_types text[] not null default '{}';

create table if not exists public.category_field_rules (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  field_key text not null,
  label_fr text not null,
  field_type text not null default 'text'
    check (field_type in ('text', 'textarea', 'url', 'file', 'image', 'number', 'boolean')),
  required boolean not null default false,
  show_in_card boolean not null default true,
  placeholder_fr text,
  sort_order integer not null default 10,
  created_at timestamptz not null default now()
);

create unique index if not exists category_field_rules_unique_key_idx
  on public.category_field_rules (category_id, field_key);

create index if not exists category_field_rules_sort_idx
  on public.category_field_rules (category_id, sort_order);

create table if not exists public.category_entries (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  title_fr text not null,
  subtitle_fr text,
  summary_fr text,
  cover_image_url text,
  external_url text,
  file_url text,
  payload jsonb not null default '{}'::jsonb,
  visible boolean not null default true,
  sort_order integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists category_entries_category_sort_idx
  on public.category_entries (category_id, sort_order, created_at);

create table if not exists public.resource_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
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

create index if not exists resource_items_sort_idx
  on public.resource_items (sort_order, created_at);

create table if not exists public.resource_item_files (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resource_items(id) on delete cascade,
  platform text not null default '通用',
  label_fr text not null,
  file_path text,
  external_url text,
  sort_order integer not null default 10,
  created_at timestamptz not null default now()
);

create index if not exists resource_item_files_sort_idx
  on public.resource_item_files (resource_id, sort_order, created_at);

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

create index if not exists partner_links_sort_idx
  on public.partner_links (sort_order, created_at);

alter table public.category_field_rules enable row level security;
alter table public.category_entries enable row level security;
alter table public.resource_items enable row level security;
alter table public.resource_item_files enable row level security;
alter table public.partner_links enable row level security;

drop policy if exists "Anyone can read category field rules" on public.category_field_rules;
drop policy if exists "Admins can manage category field rules" on public.category_field_rules;
create policy "Anyone can read category field rules" on public.category_field_rules
  for select using (true);
create policy "Admins can manage category field rules" on public.category_field_rules
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone can read visible category entries" on public.category_entries;
drop policy if exists "Admins can manage category entries" on public.category_entries;
create policy "Anyone can read visible category entries" on public.category_entries
  for select using (visible = true);
create policy "Admins can manage category entries" on public.category_entries
  for all using (public.is_admin()) with check (public.is_admin());

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

drop policy if exists "Anyone can read visible partner links" on public.partner_links;
drop policy if exists "Admins can manage partner links" on public.partner_links;
create policy "Anyone can read visible partner links" on public.partner_links
  for select using (visible = true);
create policy "Admins can manage partner links" on public.partner_links
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
