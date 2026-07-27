create extension if not exists pgcrypto;

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null default (now() + interval '30 days'),
  active boolean not null default true,
  discount_type text not null default 'percentage' check (discount_type in ('percentage', 'free_share')),
  discount_value numeric(10,2) not null default 0 check (discount_value >= 0),
  expires_at timestamptz,
  is_active boolean not null default true,
  show_banner boolean not null default false,
  banner_text_fr text,
  banner_text_zh text,
  created_at timestamptz not null default now()
);

alter table public.promo_codes
  add column if not exists discount_type text not null default 'percentage';

alter table public.promo_codes
  add column if not exists discount_value numeric(10,2) not null default 0;

alter table public.promo_codes
  add column if not exists expires_at timestamptz;

alter table public.promo_codes
  add column if not exists is_active boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'promo_codes_discount_type_check'
  ) then
    alter table public.promo_codes
      add constraint promo_codes_discount_type_check
      check (discount_type in ('percentage', 'free_share'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'promo_codes_discount_value_check'
  ) then
    alter table public.promo_codes
      add constraint promo_codes_discount_value_check
      check (discount_value >= 0);
  end if;
end $$;

update public.promo_codes
set
  discount_type = coalesce(nullif(discount_type, ''), 'percentage'),
  discount_value = coalesce(discount_value, discount_percent, 0),
  expires_at = coalesce(expires_at, valid_until),
  is_active = coalesce(is_active, active, true);

create unique index if not exists promo_codes_code_upper_key
  on public.promo_codes (upper(code));

alter table public.promo_codes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'promo_codes'
      and policyname = 'Anyone can read active promo codes'
  ) then
    create policy "Anyone can read active promo codes" on public.promo_codes
      for select
      using (coalesce(is_active, active, true) = true);
  end if;
end $$;
