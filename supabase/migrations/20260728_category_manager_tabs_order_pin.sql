-- Category manager: per-field file formats, homepage ordering and a single pinned section.

alter table public.categories
  add column if not exists homepage_pinned boolean not null default false,
  add column if not exists allowed_file_types text[] not null default '{}';

alter table public.category_field_rules
  add column if not exists accepted_file_types text[] not null default '{}',
  add column if not exists display_position text not null default 'left-top-1';

create index if not exists categories_homepage_position_idx
  on public.categories (homepage_pinned desc, homepage_sort_order asc, created_at asc);

-- Keep at most one homepage category pinned.
create unique index if not exists categories_single_homepage_pin_idx
  on public.categories (homepage_pinned)
  where homepage_pinned = true;

alter table public.categories enable row level security;
drop policy if exists "Anyone can read homepage categories" on public.categories;
create policy "Anyone can read homepage categories" on public.categories
  for select using (homepage_visible = true or public.is_admin());

with seed_categories (slug, title_fr, kind, sort_order, icon_name, intro_fr) as (
  values
    ('livres', 'Albums illustrés bilingues 🇨🇳 chinois-français 🇫🇷', 'book', 0, 'library', 'Albums illustrés bilingues chinois-français.'),
    ('outils', 'Coin ludique', 'resource', 10, 'gamepad', 'Jeux, outils numériques et ressources à télécharger.'),
    ('liens', 'Liens partenaires', 'custom', 1000, 'links', 'Liens partenaires du site.')
)
update public.categories as category
set
  title_fr = seed.title_fr,
  homepage_visible = true,
  icon_name = seed.icon_name
from seed_categories as seed
where category.slug = seed.slug;

with seed_categories (slug, title_fr, kind, sort_order, icon_name, intro_fr) as (
  values
    ('livres', 'Albums illustrés bilingues 🇨🇳 chinois-français 🇫🇷', 'book', 0, 'library', 'Albums illustrés bilingues chinois-français.'),
    ('outils', 'Coin ludique', 'resource', 10, 'gamepad', 'Jeux, outils numériques et ressources à télécharger.'),
    ('liens', 'Liens partenaires', 'custom', 1000, 'links', 'Liens partenaires du site.')
)
insert into public.categories (
  name,
  slug,
  title_fr,
  title_zh,
  kind,
  homepage_visible,
  homepage_sort_order,
  icon_name,
  intro_fr
)
select
  seed.title_fr,
  seed.slug,
  seed.title_fr,
  '',
  seed.kind,
  true,
  seed.sort_order,
  seed.icon_name,
  seed.intro_fr
from seed_categories as seed
where not exists (
  select 1
  from public.categories as category
  where category.slug = seed.slug
);

update public.categories
set homepage_pinned = false
where slug = 'liens';

insert into storage.buckets (id, name, public, file_size_limit)
values ('category-assets', 'category-assets', true, 209715200)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "Public can read category assets" on storage.objects;
drop policy if exists "Admins can upload category assets" on storage.objects;
drop policy if exists "Admins can update category assets" on storage.objects;
drop policy if exists "Admins can delete category assets" on storage.objects;

create policy "Public can read category assets" on storage.objects
  for select using (bucket_id = 'category-assets');
create policy "Admins can upload category assets" on storage.objects
  for insert with check (bucket_id = 'category-assets' and public.is_admin());
create policy "Admins can update category assets" on storage.objects
  for update using (bucket_id = 'category-assets' and public.is_admin())
  with check (bucket_id = 'category-assets' and public.is_admin());
create policy "Admins can delete category assets" on storage.objects
  for delete using (bucket_id = 'category-assets' and public.is_admin());

notify pgrst, 'reload schema';
