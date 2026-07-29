-- Public storefront synchronization.
-- Anonymous visitors may read only content intended for public display.
-- All writes remain protected by the existing administrator policies.
-- Safe to run repeatedly in the Supabase SQL editor.

begin;

grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.books enable row level security;
alter table public.categories enable row level security;
alter table public.resource_items enable row level security;
alter table public.resource_item_files enable row level security;
alter table public.partner_links enable row level security;
alter table public.category_field_rules enable row level security;
alter table public.category_entries enable row level security;
alter table public.content_sections enable row level security;
alter table public.content_section_items enable row level security;

grant select on table public.books to anon, authenticated;
grant select on table public.categories to anon, authenticated;
grant select on table public.resource_items to anon, authenticated;
grant select on table public.resource_item_files to anon, authenticated;
grant select on table public.partner_links to anon, authenticated;
grant select on table public.category_field_rules to anon, authenticated;
grant select on table public.category_entries to anon, authenticated;
grant select on table public.content_sections to anon, authenticated;
grant select on table public.content_section_items to anon, authenticated;

drop policy if exists "Storefront can read visible books" on public.books;
create policy "Storefront can read visible books"
on public.books for select to anon, authenticated
using (visible = true and deleted_at is null);

drop policy if exists "Storefront can read homepage categories" on public.categories;
create policy "Storefront can read homepage categories"
on public.categories for select to anon, authenticated
using (homepage_visible = true);

drop policy if exists "Storefront can read visible resources" on public.resource_items;
create policy "Storefront can read visible resources"
on public.resource_items for select to anon, authenticated
using (visible = true and deleted_at is null);

drop policy if exists "Storefront can read resource file metadata" on public.resource_item_files;
create policy "Storefront can read resource file metadata"
on public.resource_item_files for select to anon, authenticated
using (
  exists (
    select 1
    from public.resource_items item
    where item.id = resource_item_files.resource_id
      and item.visible = true
      and item.deleted_at is null
  )
);

drop policy if exists "Storefront can read visible partner links" on public.partner_links;
create policy "Storefront can read visible partner links"
on public.partner_links for select to anon, authenticated
using (visible = true and deleted_at is null);

drop policy if exists "Storefront can read category field rules" on public.category_field_rules;
create policy "Storefront can read category field rules"
on public.category_field_rules for select to anon, authenticated
using (
  exists (
    select 1
    from public.categories category
    where category.id = category_field_rules.category_id
      and category.homepage_visible = true
  )
);

drop policy if exists "Storefront can read visible category entries" on public.category_entries;
create policy "Storefront can read visible category entries"
on public.category_entries for select to anon, authenticated
using (
  visible = true
  and exists (
    select 1
    from public.categories category
    where category.id = category_entries.category_id
      and category.homepage_visible = true
  )
);

drop policy if exists "Storefront can read visible content sections" on public.content_sections;
create policy "Storefront can read visible content sections"
on public.content_sections for select to anon, authenticated
using (visible = true);

drop policy if exists "Storefront can read visible section items" on public.content_section_items;
create policy "Storefront can read visible section items"
on public.content_section_items for select to anon, authenticated
using (
  exists (
    select 1
    from public.content_sections section
    where section.id = content_section_items.section_id
      and section.visible = true
  )
);

notify pgrst, 'reload schema';

commit;

-- Verification after running this migration:
-- set local role anon;
-- select slug, title_fr from public.books where visible = true;
-- reset role;
