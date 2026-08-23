-- Outils: cover + up to seven supplemental public gallery images.
alter table public.resource_items
  add column if not exists gallery_images jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
