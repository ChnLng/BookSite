alter table public.donations
  add column if not exists user_name text,
  add column if not exists currency text not null default 'EUR',
  add column if not exists payment_status text not null default 'paid',
  add column if not exists paid_at timestamptz,
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_amount numeric(10,2),
  add column if not exists refund_reason text,
  add column if not exists refund_provider_id text;

update public.donations set paid_at = coalesce(paid_at, created_at);
create unique index if not exists donations_paypal_order_idx on public.donations(paypal_order_id) where paypal_order_id is not null;
create index if not exists donations_paid_at_idx on public.donations(paid_at desc);
notify pgrst, 'reload schema';
