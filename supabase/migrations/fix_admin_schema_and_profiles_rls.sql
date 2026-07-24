create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text default 'reader' check (role in ('reader','admin')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  sort_order integer,
  title_fr text not null default '',
  title_zh text not null default '',
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

alter table public.books add column if not exists slug text;
alter table public.books add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.books add column if not exists sort_order integer;
alter table public.books add column if not exists title_fr text;
alter table public.books add column if not exists title_zh text;
alter table public.books add column if not exists visible boolean default true;
alter table public.books add column if not exists price_eur numeric(10,2) default 0;
alter table public.books add column if not exists cover_image text;
alter table public.books add column if not exists pdf_file text;
alter table public.books add column if not exists synopsis_fr text;
alter table public.books add column if not exists synopsis_zh text;
alter table public.books add column if not exists asin text;
alter table public.books add column if not exists amazon_ebook_url text;
alter table public.books add column if not exists amazon_paperback_url text;
alter table public.books add column if not exists related_book_ids text[];
alter table public.books add column if not exists created_at timestamptz default now();

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

alter table public.books add column if not exists category_id uuid references public.categories(id) on delete set null;

update public.books
set slug = coalesce(slug, lower(regexp_replace(coalesce(title_fr, title_zh, id::text), '[^a-zA-Z0-9]+', '-', 'g')))
where slug is null or slug = '';

update public.books
set sort_order = ordered.next_sort_order
from (
  select
    id,
    row_number() over (
      order by
        coalesce(created_at, now()) asc,
        id asc
    ) as next_sort_order
  from public.books
) as ordered
where public.books.id = ordered.id
  and public.books.sort_order is null;

create unique index if not exists books_slug_unique_idx
  on public.books (slug)
  where slug is not null;

create index if not exists books_category_idx
  on public.books (category_id);

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  book_title text,
  created_at timestamptz default now()
);

alter table public.downloads add column if not exists book_id text;
alter table public.downloads add column if not exists download_url text;
alter table public.downloads add column if not exists stripe_session_id text;

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

notify pgrst, 'reload schema';
