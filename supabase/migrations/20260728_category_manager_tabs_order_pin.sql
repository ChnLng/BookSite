-- Category manager: per-field file formats, homepage ordering and a single pinned section.

alter table public.categories
  add column if not exists homepage_pinned boolean not null default false;

alter table public.category_field_rules
  add column if not exists accepted_file_types text[] not null default '{}';

create index if not exists categories_homepage_position_idx
  on public.categories (homepage_pinned desc, homepage_sort_order asc, created_at asc);

-- Keep at most one homepage category pinned.
create unique index if not exists categories_single_homepage_pin_idx
  on public.categories (homepage_pinned)
  where homepage_pinned = true;

with seed_categories (slug, title_fr, kind, sort_order, icon_name, intro_fr) as (
  values
    ('livres', 'Livres', 'book', 0, 'library', 'Albums illustrés bilingues chinois-français.'),
    ('outils', 'Outils', 'resource', 10, 'gamepad', 'Jeux, outils numériques et ressources à télécharger.'),
    ('liens', 'Liens', 'custom', 1000, 'links', 'Liens partenaires du site.')
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
    ('livres', 'Livres', 'book', 0, 'library', 'Albums illustrés bilingues chinois-français.'),
    ('outils', 'Outils', 'resource', 10, 'gamepad', 'Jeux, outils numériques et ressources à télécharger.'),
    ('liens', 'Liens', 'custom', 1000, 'links', 'Liens partenaires du site.')
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
set homepage_sort_order = 1000,
    homepage_pinned = false
where slug = 'liens';

notify pgrst, 'reload schema';
