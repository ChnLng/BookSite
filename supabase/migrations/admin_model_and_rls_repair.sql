create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.admin_allowlist (
  email text primary key,
  note text,
  created_at timestamptz default now()
);

insert into public.admin_allowlist (email, note)
values ('visdar@outlook.fr', 'Primary admin inbox')
on conflict (email) do nothing;

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

update public.books
set slug = coalesce(slug, lower(regexp_replace(coalesce(title_fr, title_zh, id::text), '[^a-zA-Z0-9]+', '-', 'g')))
where slug is null or slug = '';

update public.books
set sort_order = ordered.next_sort_order
from (
  select
    id,
    row_number() over (
      order by coalesce(created_at, now()) asc, id asc
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

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  amount numeric(10,2) default 0,
  note text,
  created_at timestamptz default now()
);

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

create or replace function public.current_auth_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
  or exists (
    select 1 from public.admin_allowlist
    where email = public.current_auth_email()
  );
$$;

update public.profiles
set role = 'admin'
where lower(coalesce(email, '')) in (select email from public.admin_allowlist);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case
      when lower(coalesce(new.email, '')) in (select email from public.admin_allowlist) then 'admin'
      else 'reader'
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    role = case
      when lower(coalesce(excluded.email, '')) in (select email from public.admin_allowlist) then 'admin'
      else public.profiles.role
    end;
  return new;
end;
$$ language plpgsql security definer;

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.categories enable row level security;
alter table public.promo_codes enable row level security;
alter table public.downloads enable row level security;
alter table public.donations enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;

create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());

create policy "Admins can manage profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone can read visible books" on public.books;
drop policy if exists "Admins can manage books" on public.books;
drop policy if exists "Admins can read all books" on public.books;

create policy "Anyone can read visible books" on public.books
  for select using (visible = true);

create policy "Admins can read all books" on public.books
  for select using (public.is_admin());

create policy "Admins can manage books" on public.books
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone can read categories" on public.categories;
drop policy if exists "Admins can manage categories" on public.categories;
drop policy if exists "Admins can read all categories" on public.categories;

create policy "Anyone can read categories" on public.categories
  for select using (true);

create policy "Admins can read all categories" on public.categories
  for select using (public.is_admin());

create policy "Admins can manage categories" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone can read active promo codes" on public.promo_codes;
drop policy if exists "Admins can manage promo codes" on public.promo_codes;
drop policy if exists "Admins can read all promo codes" on public.promo_codes;

create policy "Anyone can read active promo codes" on public.promo_codes
  for select using (active = true);

create policy "Admins can read all promo codes" on public.promo_codes
  for select using (public.is_admin());

create policy "Admins can manage promo codes" on public.promo_codes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users can view their own downloads" on public.downloads;
drop policy if exists "Users can view downloads by email" on public.downloads;
drop policy if exists "Admins can view all downloads" on public.downloads;
drop policy if exists "Admins can manage downloads" on public.downloads;

create policy "Users can view their own downloads" on public.downloads
  for select using (auth.uid() = user_id);

create policy "Users can view downloads by email" on public.downloads
  for select using (
    user_email is not null
    and lower(user_email) = public.current_auth_email()
  );

create policy "Admins can manage downloads" on public.downloads
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users can view their own donations" on public.donations;
drop policy if exists "Admins can view all donations" on public.donations;
drop policy if exists "Admins can manage donations" on public.donations;

create policy "Users can view their own donations" on public.donations
  for select using (auth.uid() = user_id);

create policy "Admins can manage donations" on public.donations
  for all using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';
