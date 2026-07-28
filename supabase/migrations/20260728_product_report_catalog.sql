create extension if not exists pgcrypto;

alter table public.books add column if not exists deleted_at timestamptz;
alter table public.resource_items add column if not exists deleted_at timestamptz;
alter table public.partner_links add column if not exists deleted_at timestamptz;

create table if not exists public.product_report_catalog (
  id uuid primary key default gen_random_uuid(),
  product_kind text not null check (product_kind in ('book', 'resource', 'link')),
  product_ref text not null,
  category_key text not null,
  product_name text not null,
  product_sort_order integer not null default 10,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_kind, product_ref)
);

alter table public.product_report_catalog enable row level security;
drop policy if exists "Admins can manage product report catalog" on public.product_report_catalog;
create policy "Admins can manage product report catalog" on public.product_report_catalog
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.books (
  slug, sort_order, title_fr, title_zh, visible, price_eur, cover_image, pdf_file,
  synopsis_fr, asin, amazon_ebook_url, amazon_paperback_url, related_book_ids
)
values
  ('lumi', 1, 'Lumi trop gentil', 'Lumi 太善良', true, 5.99, '/images/lumi_cover.jpg', 'lumi_book.pdf', 'Lumi veut plaire a tout le monde, jusqu''au jour ou il comprend qu''il n''a plus d''energie pour lui-meme. Pas a pas, il apprend a dire non avec douceur et a suivre son propre chemin.', 'B0GVVWTB2N', 'https://www.amazon.fr/%E6%B1%89%E6%B3%95%E5%8F%8C%E8%AF%AD-Lumi-gentil-chinois-fran%C3%A7ais-ebook/dp/B0GVVWTB2N', 'https://www.amazon.fr/Lumi-trop-gentil-Lhistoire-apprend/dp/B0GW2FFSQ5', array['jiti','fulbert']),
  ('jiti', 2, 'Jiti le faon credule', 'Jiti 轻信的小鹿', true, 5.99, '/images/jiti_cover.jpg', 'jiti_book.pdf', 'Jiti accepte trop facilement ce qu''on lui demande. En observant le monde autour de lui, il commence enfin a poser une question essentielle : pour le bien de qui fais-je cela ?', 'B0GWYHJWPZ', 'https://www.amazon.fr/%E6%B1%89%E6%B3%95%E5%8F%8C%E8%AF%AD-Jiti-cr%C3%A9dule-chinois-fran%C3%A7ais-ebook/dp/B0GWYHJWPZ', 'https://www.amazon.fr/Jiti-faon-cr%C3%A9dule-Lhistoire-commence/dp/B0GWZTQLG3', array['lumi','taogao']),
  ('taogao', 3, 'Taogao au coeur lourd', 'Taogao 心事沉重', true, 5.99, '/images/taogao_cover.jpg', 'taogao_book.pdf', 'Taogao porte la tristesse des autres comme si elle lui appartenait. Ce recit tendre l''aide a rendre a chacun ce qui lui revient et a retrouver une respiration plus legere.', 'B0H1KBZ14K', 'https://www.amazon.fr/%E6%B1%89%E6%B3%95%E5%8F%8C%E8%AF%AD-Taogao-lourd-chinois-fran%C3%A7ais-ebook/dp/B0H1KBZ14K', 'https://www.amazon.fr/Taogao-c%C5%93ur-lourd-Lhistoire-hippopotame/dp/B0H1MTP4KV', array['jiti','fulbert']),
  ('fulbert', 4, 'Fulbert le chaton qui musarde', 'Fulbert 爱拖延的小猫', true, 5.99, '/images/fulbert_cover.png', 'fulbert_book.pdf', 'Fulbert adore dessiner, mais son temps disparait a force d''aider tout le monde. Avec l''aide d''un grand chat, il apprend a proteger son temps et a terminer ce qui compte pour lui.', 'B0GXCWMM45', 'https://www.amazon.fr/Fulbert-chaton-musarde-chinois-fran%C3%A7ais-ebook/dp/B0GXCWMM45', 'https://www.amazon.fr/Fulbert-chaton-qui-musarde-Lhistoire/dp/B0GYL55RVW', array['lumi','taogao'])
on conflict (slug) where slug is not null do update set
  sort_order = excluded.sort_order, title_fr = excluded.title_fr, title_zh = excluded.title_zh,
  price_eur = excluded.price_eur, cover_image = excluded.cover_image, synopsis_fr = excluded.synopsis_fr,
  asin = excluded.asin, amazon_ebook_url = excluded.amazon_ebook_url,
  amazon_paperback_url = excluded.amazon_paperback_url, related_book_ids = excluded.related_book_ids,
  deleted_at = null;

create or replace function public.sync_book_report_catalog() returns trigger language plpgsql security definer as $$
declare ref text := coalesce(new.slug, new.id::text);
begin
  insert into public.product_report_catalog(product_kind, product_ref, category_key, product_name, product_sort_order, active, updated_at)
  values ('book', ref, 'albums', trim(coalesce(new.title_zh,'') || ' ' || coalesce(new.title_fr,'')), coalesce(new.sort_order,10), new.deleted_at is null, now())
  on conflict(product_kind, product_ref) do update set product_name=excluded.product_name, product_sort_order=excluded.product_sort_order, active=excluded.active, updated_at=now();
  return new;
end $$;

create or replace function public.sync_resource_report_catalog() returns trigger language plpgsql security definer as $$
begin
  insert into public.product_report_catalog(product_kind, product_ref, category_key, product_name, product_sort_order, active, updated_at)
  values ('resource', new.id::text, 'coin-ludique', coalesce(new.title_fr,new.slug,new.id::text), coalesce(new.sort_order,10), new.deleted_at is null, now())
  on conflict(product_kind, product_ref) do update set product_name=excluded.product_name, product_sort_order=excluded.product_sort_order, active=excluded.active, updated_at=now();
  return new;
end $$;

create or replace function public.sync_link_report_catalog() returns trigger language plpgsql security definer as $$
begin
  insert into public.product_report_catalog(product_kind, product_ref, category_key, product_name, product_sort_order, active, updated_at)
  values ('link', new.id::text, 'liens-partenaires', coalesce(new.title_fr,new.id::text), coalesce(new.sort_order,10), new.deleted_at is null, now())
  on conflict(product_kind, product_ref) do update set product_name=excluded.product_name, product_sort_order=excluded.product_sort_order, active=excluded.active, updated_at=now();
  return new;
end $$;

drop trigger if exists books_report_catalog_sync on public.books;
create trigger books_report_catalog_sync after insert or update on public.books for each row execute function public.sync_book_report_catalog();
drop trigger if exists resources_report_catalog_sync on public.resource_items;
create trigger resources_report_catalog_sync after insert or update on public.resource_items for each row execute function public.sync_resource_report_catalog();
drop trigger if exists links_report_catalog_sync on public.partner_links;
create trigger links_report_catalog_sync after insert or update on public.partner_links for each row execute function public.sync_link_report_catalog();

insert into public.product_report_catalog(product_kind, product_ref, category_key, product_name, product_sort_order, active)
select 'book', coalesce(slug,id::text), 'albums', trim(coalesce(title_zh,'') || ' ' || coalesce(title_fr,'')), coalesce(sort_order,10), deleted_at is null from public.books
on conflict(product_kind,product_ref) do update set product_name=excluded.product_name, product_sort_order=excluded.product_sort_order, active=excluded.active;
insert into public.product_report_catalog(product_kind, product_ref, category_key, product_name, product_sort_order, active)
select 'resource', id::text, 'coin-ludique', coalesce(title_fr,slug,id::text), coalesce(sort_order,10), deleted_at is null from public.resource_items
on conflict(product_kind,product_ref) do update set product_name=excluded.product_name, product_sort_order=excluded.product_sort_order, active=excluded.active;
insert into public.product_report_catalog(product_kind, product_ref, category_key, product_name, product_sort_order, active)
select 'link', id::text, 'liens-partenaires', coalesce(title_fr,id::text), coalesce(sort_order,10), deleted_at is null from public.partner_links
on conflict(product_kind,product_ref) do update set product_name=excluded.product_name, product_sort_order=excluded.product_sort_order, active=excluded.active;

notify pgrst, 'reload schema';
