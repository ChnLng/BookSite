-- Security hardening for administrator access and private account data.
-- Safe to run repeatedly in the Supabase SQL editor.

begin;

-- Normalise the allowlist so comparisons cannot be bypassed with case or spaces.
update public.admin_allowlist
set email = lower(trim(email));

-- Keep the known administrator account in the server-side database allowlist.
insert into public.admin_allowlist (email, note)
values ('visdar@outlook.fr', 'Primary administrator')
on conflict (email) do update set note = excluded.note;

-- Only signed-in users may call this helper. SECURITY DEFINER avoids recursive
-- profiles RLS checks, while the fixed search_path prevents object shadowing.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
  or exists (
    select 1
    from public.admin_allowlist
    where email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Ensure the allowlisted account has the database role used by every API check.
update public.profiles
set role = 'admin'
where lower(trim(coalesce(email, ''))) in (
  select lower(trim(email)) from public.admin_allowlist
);

alter table public.profiles enable row level security;
alter table public.downloads enable row level security;
alter table public.donations enable row level security;

-- An ordinary user may edit only display_name. In particular, role and email
-- cannot be promoted or reassigned through the public Supabase client.
revoke insert, update, delete on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;

create policy "Users can view their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own display name"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Admins can manage profiles"
on public.profiles for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Purchase/download history is private. The email condition preserves legacy
-- orders made before user_id was recorded, but only for the matching login email.
drop policy if exists "Users can view their own downloads" on public.downloads;
drop policy if exists "Users can view downloads by email" on public.downloads;
drop policy if exists "Admins can view all downloads" on public.downloads;
drop policy if exists "Admins can manage downloads" on public.downloads;

create policy "Users can view their own downloads"
on public.downloads for select to authenticated
using (
  (select auth.uid()) = user_id
  or (
    user_email is not null
    and lower(trim(user_email)) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

create policy "Admins can manage downloads"
on public.downloads for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Donation history is likewise visible only to its owner (including legacy
-- email-only rows) and administrators.
drop policy if exists "Users can view their own donations" on public.donations;
drop policy if exists "Users can view donations by email" on public.donations;
drop policy if exists "Admins can view all donations" on public.donations;
drop policy if exists "Admins can manage donations" on public.donations;

create policy "Users can view their own donations"
on public.donations for select to authenticated
using (
  (select auth.uid()) = user_id
  or (
    user_email is not null
    and lower(trim(user_email)) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

create policy "Admins can manage donations"
on public.donations for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- The allowlist must never be readable or writable from a browser session.
alter table public.admin_allowlist enable row level security;
revoke all on table public.admin_allowlist from anon, authenticated;

notify pgrst, 'reload schema';

commit;

-- Verification: this should return true only while logged in as the admin.
-- select public.is_admin();
