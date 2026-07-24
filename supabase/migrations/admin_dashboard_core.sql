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

alter table public.books
  add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists books_category_idx
  on public.books (category_id);

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

alter table public.categories enable row level security;
alter table public.promo_codes enable row level security;

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
