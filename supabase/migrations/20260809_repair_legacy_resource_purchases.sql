-- Restore old outil orders that were recorded before resource_id existed.
-- Safe to run repeatedly in the Supabase SQL editor.

begin;

update public.downloads purchase
set download_kind = 'resource',
    resource_id = resource.id,
    resource_title = coalesce(purchase.resource_title, resource.title_fr, resource.slug),
    updated_at = now()
from public.resource_items resource
where purchase.resource_id is null
  and (
    purchase.book_id = resource.slug
    or (
      trim(coalesce(purchase.resource_title, '')) <> ''
      and trim(coalesce(resource.title_fr, '')) <> ''
      and lower(trim(purchase.resource_title)) = lower(trim(resource.title_fr))
    )
    or (
      trim(coalesce(purchase.book_title, '')) <> ''
      and trim(coalesce(resource.title_fr, '')) <> ''
      and lower(trim(purchase.book_title)) = lower(trim(resource.title_fr))
    )
  )
  and not exists (
    select 1
    from public.books book
    where book.slug = purchase.book_id
       or (
         trim(coalesce(purchase.book_title, '')) <> ''
         and trim(coalesce(book.title_fr, '')) <> ''
         and lower(trim(book.title_fr)) = lower(trim(purchase.book_title))
       )
  );

-- Link email-only legacy orders to the matching site account. This does not
-- transfer purchases between accounts; it only fills a previously empty UUID.
update public.downloads purchase
set user_id = account.id,
    updated_at = now()
from auth.users account
where purchase.user_id is null
  and purchase.user_email is not null
  and lower(trim(purchase.user_email)) = lower(trim(account.email));

notify pgrst, 'reload schema';

commit;
