alter table public.partner_links
  add column if not exists tooltip_text text;

update public.partner_links
set tooltip_text = coalesce(nullif(trim(tooltip_text), ''), title_fr)
where tooltip_text is null or trim(tooltip_text) = '';

notify pgrst, 'reload schema';
