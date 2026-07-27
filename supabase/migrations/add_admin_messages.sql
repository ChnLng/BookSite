create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_email text not null,
  pseudo text not null default 'Lecteur',
  content text not null,
  visitor_token text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_messages_created_at_idx
  on public.admin_messages (created_at desc);

create index if not exists admin_messages_user_id_idx
  on public.admin_messages (user_id, created_at desc);

alter table public.admin_messages enable row level security;

drop policy if exists "Users can insert their own admin messages" on public.admin_messages;
create policy "Users can insert their own admin messages" on public.admin_messages
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Admins can read admin messages" on public.admin_messages;
create policy "Admins can read admin messages" on public.admin_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
