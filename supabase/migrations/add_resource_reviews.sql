create table if not exists public.resource_reviews (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resource_items(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  review_text text not null,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resource_reviews_resource_created_idx
  on public.resource_reviews (resource_id, created_at desc);

create unique index if not exists resource_reviews_resource_user_unique
  on public.resource_reviews (resource_id, user_id)
  where user_id is not null;

alter table public.resource_reviews enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'resource_reviews'
      and policyname = 'Anyone can read visible resource reviews'
  ) then
    create policy "Anyone can read visible resource reviews" on public.resource_reviews
      for select using (visible = true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'resource_reviews'
      and policyname = 'Anyone can insert resource reviews'
  ) then
    create policy "Anyone can insert resource reviews" on public.resource_reviews
      for insert with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'resource_reviews'
      and policyname = 'Users can update their own resource reviews'
  ) then
    create policy "Users can update their own resource reviews" on public.resource_reviews
      for update using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'resource_reviews'
      and policyname = 'Admins can manage resource reviews'
  ) then
    create policy "Admins can manage resource reviews" on public.resource_reviews
      for all using (public.is_admin())
      with check (public.is_admin());
  end if;
end
$$;

notify pgrst, 'reload schema';
