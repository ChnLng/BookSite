alter table public.books
add column if not exists sort_order integer;

with ordered_books as (
  select
    id,
    row_number() over (
      order by
        coalesce(created_at, now()) asc,
        id asc
    ) as next_sort_order
  from public.books
)
update public.books as books
set sort_order = ordered_books.next_sort_order
from ordered_books
where books.id = ordered_books.id
  and books.sort_order is null;
