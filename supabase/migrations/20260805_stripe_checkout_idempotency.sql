alter table public.downloads
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent_id text;

create unique index if not exists downloads_stripe_session_id_unique
  on public.downloads (stripe_session_id);

notify pgrst, 'reload schema';
