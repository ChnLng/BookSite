create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  visitor_token text,
  created_at timestamptz default now(),
  constraint comment_likes_identity_check check (
    (user_id is not null and visitor_token is null)
    or (user_id is null and visitor_token is not null)
  )
);

create unique index if not exists comment_likes_user_unique
  on public.comment_likes (comment_id, user_id)
  where user_id is not null;

create unique index if not exists comment_likes_visitor_unique
  on public.comment_likes (comment_id, visitor_token)
  where visitor_token is not null;

alter table public.comment_likes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'comment_likes' and policyname = 'Anyone can read comment likes'
  ) then
    create policy "Anyone can read comment likes" on public.comment_likes
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'comment_likes' and policyname = 'Users and visitors can insert their own comment likes'
  ) then
    create policy "Users and visitors can insert their own comment likes" on public.comment_likes
      for insert with check (
        (auth.uid() = user_id and visitor_token is null)
        or (auth.uid() is null and user_id is null and visitor_token is not null)
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'comment_likes' and policyname = 'Users and visitors can delete their own comment likes'
  ) then
    create policy "Users and visitors can delete their own comment likes" on public.comment_likes
      for delete using (
        (auth.uid() = user_id and visitor_token is null)
        or (auth.uid() is null and user_id is null and visitor_token is not null)
      );
  end if;
end $$;
