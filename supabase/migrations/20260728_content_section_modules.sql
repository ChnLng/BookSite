create extension if not exists pgcrypto;

create table if not exists public.content_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text not null,
  section_type text not null default 'catalog',
  sort_order integer not null default 10,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.content_sections(id) on delete cascade,
  admin_label text not null,
  source_key text not null,
  content_type text not null default 'string',
  module_type text,
  display_position text not null default 'right-top-1',
  show_on_user_page boolean not null default true,
  sort_order integer not null default 10,
  created_at timestamptz not null default now(),
  unique(section_id, source_key)
);

alter table public.content_sections enable row level security;
alter table public.content_section_items enable row level security;

drop policy if exists "Public can read visible content sections" on public.content_sections;
drop policy if exists "Admins can manage content sections" on public.content_sections;
create policy "Public can read visible content sections" on public.content_sections
  for select using (visible = true or public.is_admin());
create policy "Admins can manage content sections" on public.content_sections
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read content section items" on public.content_section_items;
drop policy if exists "Admins can manage content section items" on public.content_section_items;
create policy "Public can read content section items" on public.content_section_items
  for select using (true);
create policy "Admins can manage content section items" on public.content_section_items
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.content_sections (section_key, title, section_type, sort_order)
values
  ('albums', 'Albums illustrés bilingues 🇨🇳 chinois-français 🇫🇷', 'catalog', 10),
  ('coin-ludique', 'Coin ludique', 'catalog', 20),
  ('liens-partenaires', 'Liens partenaires', 'links', 30)
on conflict (section_key) do update set title = excluded.title;

with album as (select id from public.content_sections where section_key = 'albums')
insert into public.content_section_items
  (section_id, admin_label, source_key, content_type, module_type, display_position, show_on_user_page, sort_order)
select album.id, item.admin_label, item.source_key, item.content_type, item.module_type, item.display_position, true, item.sort_order
from album
cross join (values
  ('书皮／封面', 'cover_image', 'image', null, 'left-1', 10),
  ('用户评价', 'reviews', 'module', 'reviews', 'left-2', 20),
  ('Collection／Série 标题', 'collection', 'string', null, 'right-top-1', 30),
  ('书的大标题', 'title', 'string', null, 'right-top-2', 40),
  ('定价、优惠码与付款', 'commerce', 'module', 'commerce', 'right-top-3', 50),
  ('商品简介', 'synopsis', 'text', null, 'right-middle-1', 60),
  ('商品亮点', 'teaching_point', 'text', null, 'right-bottom-1', 70)
) as item(admin_label, source_key, content_type, module_type, display_position, sort_order)
on conflict (section_id, source_key) do nothing;

with section_row as (select id from public.content_sections where section_key = 'coin-ludique')
insert into public.content_section_items
  (section_id, admin_label, source_key, content_type, module_type, display_position, show_on_user_page, sort_order)
select section_row.id, item.admin_label, item.source_key, item.content_type, null, item.display_position, true, item.sort_order
from section_row
cross join (values
  ('商品封面／二维码', 'cover_image', 'image', 'left-1', 10),
  ('商品标题', 'title', 'string', 'right-top-1', 20),
  ('商品简介', 'summary', 'text', 'right-top-2', 30),
  ('可下载文件', 'downloads', 'file', 'right-middle-1', 40),
  ('站外链接', 'external_url', 'file', 'right-bottom-1', 50)
) as item(admin_label, source_key, content_type, display_position, sort_order)
on conflict (section_id, source_key) do nothing;

with section_row as (select id from public.content_sections where section_key = 'liens-partenaires')
insert into public.content_section_items
  (section_id, admin_label, source_key, content_type, module_type, display_position, show_on_user_page, sort_order)
select section_row.id, item.admin_label, item.source_key, item.content_type, null, item.display_position, true, item.sort_order
from section_row
cross join (values
  ('链接图标', 'icon', 'image', 'left-1', 10),
  ('链接名称', 'title', 'string', 'right-top-1', 20),
  ('站外地址', 'external_url', 'file', 'right-top-2', 30)
) as item(admin_label, source_key, content_type, display_position, sort_order)
on conflict (section_id, source_key) do nothing;

notify pgrst, 'reload schema';
