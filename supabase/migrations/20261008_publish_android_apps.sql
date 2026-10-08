-- Public Google Play launches: use the store price for the Visd AR checkout too.
-- This is intentionally idempotent so it is safe to apply to an existing catalogue.
update public.resource_items
set price_eur = case slug
  when 'carte-des-dialectes-en-chine-android' then 0.99
  when 'cles-des-sinogrammes-android' then 2.09
  when 'heures-du-monde-android' then 2.09
  when 'reconnaissance-de-sinogrammes-manuscrits-android' then 4.99
  when 'roue-chromatique-se-pan-android-en-chinois' then 2.09
  else price_eur
end
where slug in (
  'carte-des-dialectes-en-chine-android',
  'cles-des-sinogrammes-android',
  'heures-du-monde-android',
  'reconnaissance-de-sinogrammes-manuscrits-android',
  'roue-chromatique-se-pan-android-en-chinois'
);
