alter table public.resource_items
  add column if not exists deleted_at timestamptz;

alter table public.partner_links
  add column if not exists deleted_at timestamptz;

create index if not exists resource_items_active_sort_idx
  on public.resource_items (sort_order, created_at)
  where deleted_at is null;

create index if not exists partner_links_active_sort_idx
  on public.partner_links (sort_order, created_at)
  where deleted_at is null;

insert into public.resource_items (
  slug, title_fr, summary_fr, cover_image_url, qr_image_url,
  external_url, price_eur, visible, sort_order
)
values
  (
    'mini-loto-sons',
    'Mini loto des sons doux',
    'Un mini-jeu numerique tres simple pour revoir les sons, les images et les petits mots du quotidien en douceur.',
    '/images/logo.png', '/images/logo.png', null, 0, true, 10
  ),
  (
    'cartes-vie-calme',
    'Cartes visuelles du quotidien',
    'Un petit outil a garder sous la main pour revoir calmement des mots et des gestes utiles, sur ordinateur ou mobile.',
    '/images/logo.png', '/images/logo.png', null, 2.99, true, 20
  )
on conflict (slug) where slug is not null do update set
  title_fr = excluded.title_fr,
  summary_fr = excluded.summary_fr,
  cover_image_url = coalesce(public.resource_items.cover_image_url, excluded.cover_image_url),
  qr_image_url = coalesce(public.resource_items.qr_image_url, excluded.qr_image_url),
  deleted_at = null;

insert into public.partner_links (title_fr, icon_url, target_url, sort_order, visible)
select 'Visd AR', '/images/logo.png', 'https://visdar.fr', 10, true
where not exists (
  select 1 from public.partner_links where target_url in ('https://visdar.fr', 'https://www.visdar.fr')
);

notify pgrst, 'reload schema';
