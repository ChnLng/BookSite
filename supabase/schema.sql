create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text default 'reader' check (role in ('reader','admin')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can view their own profile'
  ) then
    create policy "Users can view their own profile" on public.profiles
      for select using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update their own profile'
  ) then
    create policy "Users can update their own profile" on public.profiles
      for update using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Admins can view all profiles'
  ) then
    create policy "Admins can view all profiles" on public.profiles
      for select using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end $$;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  author_name text,
  content text not null,
  created_at timestamptz default now()
);

alter table public.comments add column if not exists author_name text;

alter table public.comments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'comments' and policyname = 'Anyone can read comments'
  ) then
    create policy "Anyone can read comments" on public.comments
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'comments' and policyname = 'Users can insert their own comments'
  ) then
    create policy "Users can insert their own comments" on public.comments
      for insert with check (auth.uid() = user_id or user_id is null);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'comments' and policyname = 'Users can update their own comments'
  ) then
    create policy "Users can update their own comments" on public.comments
      for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'comments' and policyname = 'Users can delete their own comments'
  ) then
    create policy "Users can delete their own comments" on public.comments
      for delete using (auth.uid() = user_id);
  end if;
end $$;

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

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  book_title text,
  created_at timestamptz default now()
);

alter table public.downloads enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'downloads' and policyname = 'Users can view their own downloads'
  ) then
    create policy "Users can view their own downloads" on public.downloads
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'downloads' and policyname = 'Admins can view all downloads'
  ) then
    create policy "Admins can view all downloads" on public.downloads
      for select using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end $$;

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  amount numeric(10,2) default 0,
  note text,
  created_at timestamptz default now()
);

alter table public.donations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'donations' and policyname = 'Users can view their own donations'
  ) then
    create policy "Users can view their own donations" on public.donations
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'donations' and policyname = 'Admins can view all donations'
  ) then
    create policy "Admins can view all donations" on public.donations
      for select using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end $$;

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  sort_order integer,
  title_fr text not null,
  title_zh text not null,
  visible boolean default true,
  price_eur numeric(10,2) default 0,
  cover_image text,
  pdf_file text,
  synopsis_fr text,
  synopsis_zh text,
  asin text,
  amazon_ebook_url text,
  amazon_paperback_url text,
  related_book_ids text[],
  created_at timestamptz default now()
);

alter table public.books add column if not exists cover_image text;
alter table public.books add column if not exists pdf_file text;
alter table public.books add column if not exists synopsis_fr text;
alter table public.books add column if not exists synopsis_zh text;
alter table public.books add column if not exists asin text;
alter table public.books add column if not exists sort_order integer;
alter table public.books add column if not exists related_book_ids text[];
alter table public.books add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists books_catalogue_visible_sort_idx
  on public.books (visible, sort_order, created_at);

create index if not exists books_category_idx
  on public.books (category_id);

create index if not exists books_title_fr_trgm_idx
  on public.books using gin (lower(title_fr) gin_trgm_ops);

create index if not exists books_title_zh_trgm_idx
  on public.books using gin (lower(title_zh) gin_trgm_ops);

alter table public.books enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'books' and policyname = 'Anyone can read visible books'
  ) then
    create policy "Anyone can read visible books" on public.books
      for select using (visible = true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'books' and policyname = 'Admins can manage books'
  ) then
    create policy "Admins can manage books" on public.books
      for all using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end $$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

alter table public.categories add column if not exists slug text;
alter table public.categories add column if not exists title_fr text;
alter table public.categories add column if not exists title_zh text;
alter table public.categories add column if not exists base_price_eur numeric(10,2);
alter table public.categories add column if not exists attribute_label_fr text;
alter table public.categories add column if not exists attribute_label_zh text;
alter table public.categories add column if not exists description_fr text;
alter table public.categories add column if not exists description_zh text;

update public.categories
set
  slug = coalesce(slug, lower(regexp_replace(coalesce(name, ''), '[^a-zA-Z0-9]+', '-', 'g'))),
  title_fr = coalesce(title_fr, name),
  title_zh = coalesce(title_zh, name),
  description_fr = coalesce(description_fr, description),
  description_zh = coalesce(description_zh, description)
where
  slug is null
  or title_fr is null
  or title_zh is null
  or description_fr is null
  or description_zh is null;

create unique index if not exists categories_slug_unique_idx
  on public.categories (slug)
  where slug is not null;

alter table public.categories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'categories' and policyname = 'Anyone can read categories'
  ) then
    create policy "Anyone can read categories" on public.categories
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'categories' and policyname = 'Admins can manage categories'
  ) then
    create policy "Admins can manage categories" on public.categories
      for all using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end $$;

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  active boolean default true,
  show_banner boolean default false,
  banner_text_fr text,
  banner_text_zh text,
  created_at timestamptz default now()
);

alter table public.promo_codes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'promo_codes' and policyname = 'Anyone can read active promo codes'
  ) then
    create policy "Anyone can read active promo codes" on public.promo_codes
      for select using (active = true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'promo_codes' and policyname = 'Admins can manage promo codes'
  ) then
    create policy "Admins can manage promo codes" on public.promo_codes
      for all using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end $$;

alter table public.downloads add column if not exists book_id text;
alter table public.downloads add column if not exists download_url text;
alter table public.downloads add column if not exists stripe_session_id text;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'downloads' and policyname = 'Users can view downloads by email'
  ) then
    create policy "Users can view downloads by email" on public.downloads
      for select using (
        user_email is not null
        and user_email = (select email from public.profiles where id = auth.uid())
      );
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
