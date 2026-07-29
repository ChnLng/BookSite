alter table public.content_section_items
  add column if not exists settings jsonb not null default '{}'::jsonb;

update public.content_section_items item
set settings = coalesce(item.settings, '{}'::jsonb) || jsonb_build_object(
  'onsite_purchase_label', coalesce(nullif(item.settings ->> 'onsite_purchase_label', ''), 'Acheter le livre numérique'),
  'external_purchase_label', coalesce(nullif(item.settings ->> 'external_purchase_label', ''), 'Amazon broché')
)
from public.content_sections section
where section.id = item.section_id
  and section.section_key = 'albums'
  and item.module_type = 'commerce';

notify pgrst, 'reload schema';
