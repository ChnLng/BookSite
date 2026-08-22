-- Mobile application packages stay in the existing private paid-document flow.
-- Only authorised purchasers receive a signed download/view link.

begin;

alter table public.resource_items
  add column if not exists homepage_summary_fr text;

comment on column public.resource_items.homepage_summary_fr is
  'Short excerpt used only on the homepage carousel; summary_fr remains the full product-page description.';

update public.categories
set allowed_file_types = (
  select array_agg(distinct extension order by extension)
  from unnest(
    coalesce(public.categories.allowed_file_types, '{}'::text[])
    || array['.apk', '.aab', '.apks', '.xapk', '.ipa']::text[]
  ) as extension
)
where kind = 'resource';

-- Reload the PostgREST schema cache so the new column is immediately available.
notify pgrst, 'reload schema';

commit;
