alter table public.downloads add column if not exists paypal_order_id text;

create unique index if not exists downloads_paypal_order_id_unique
  on public.downloads (paypal_order_id)
  where paypal_order_id is not null;

create table if not exists public.book_reviews (
  id uuid primary key default gen_random_uuid(),
  book_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  review_text text not null,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists book_reviews_book_created_idx
  on public.book_reviews (book_id, created_at desc);

create unique index if not exists book_reviews_book_user_unique
  on public.book_reviews (book_id, user_id)
  where user_id is not null;

alter table public.book_reviews enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'book_reviews'
      and policyname = 'Anyone can read visible book reviews'
  ) then
    create policy "Anyone can read visible book reviews" on public.book_reviews
      for select using (visible = true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'book_reviews'
      and policyname = 'Anyone can insert book reviews'
  ) then
    create policy "Anyone can insert book reviews" on public.book_reviews
      for insert with check (
        visible = true
        and (
          (auth.uid() is null and user_id is null)
          or auth.uid() = user_id
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'book_reviews'
      and policyname = 'Users can update their own book reviews'
  ) then
    create policy "Users can update their own book reviews" on public.book_reviews
      for update using (auth.uid() = user_id)
      with check (auth.uid() = user_id and visible = true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'book_reviews'
      and policyname = 'Admins can manage book reviews'
  ) then
    create policy "Admins can manage book reviews" on public.book_reviews
      for all using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

notify pgrst, 'reload schema';
