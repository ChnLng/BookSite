alter table public.downloads
  add column if not exists amount_paid numeric(10,2),
  add column if not exists currency text not null default 'EUR',
  add column if not exists download_count integer not null default 0,
  add column if not exists last_downloaded_at timestamptz,
  add column if not exists payment_status text not null default 'paid',
  add column if not exists paid_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_amount numeric(10,2),
  add column if not exists refund_reason text,
  add column if not exists refund_provider_id text,
  add column if not exists paypal_capture_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists invoice_number text,
  add column if not exists updated_at timestamptz not null default now();

update public.downloads
set paid_at = coalesce(paid_at, created_at),
    payment_status = case when coalesce(amount_paid, 0) > 0 then 'paid' else 'free' end,
    invoice_number = coalesce(invoice_number, 'VISD-' || to_char(created_at, 'YYYYMMDD') || '-' || upper(substr(replace(id::text, '-', ''), 1, 8)));

alter table public.downloads drop constraint if exists downloads_payment_status_check;
alter table public.downloads add constraint downloads_payment_status_check
  check (payment_status in ('paid', 'free', 'refund_pending', 'refunded', 'refund_failed'));

create index if not exists downloads_user_purchase_idx on public.downloads(user_id, created_at desc);
create index if not exists downloads_email_purchase_idx on public.downloads(lower(user_email), created_at desc);
create index if not exists downloads_payment_status_idx on public.downloads(payment_status, created_at desc);

create or replace function public.prepare_purchase_history()
returns trigger language plpgsql as $$
begin
  new.paid_at := coalesce(new.paid_at, new.created_at, now());
  if new.payment_status is null then
    new.payment_status := case when coalesce(new.amount_paid, 0) > 0 then 'paid' else 'free' end;
  end if;
  new.invoice_number := coalesce(new.invoice_number, 'VISD-' || to_char(coalesce(new.created_at, now()), 'YYYYMMDD') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 8)));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists prepare_purchase_history_trigger on public.downloads;
create trigger prepare_purchase_history_trigger
before insert or update on public.downloads
for each row execute function public.prepare_purchase_history();

notify pgrst, 'reload schema';
