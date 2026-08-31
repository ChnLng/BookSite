begin;
create schema if not exists catalogue_private;
revoke all on schema catalogue_private from public, anon, authenticated;
create table if not exists catalogue_private.editions (
  kind text primary key check (kind in ('android','android-professionnels')),
  config jsonb,
  revision integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table catalogue_private.editions enable row level security;
revoke all on catalogue_private.editions from public, anon, authenticated;
insert into catalogue_private.editions(kind) values ('android'), ('android-professionnels') on conflict do nothing;

create or replace function catalogue_private.require_admin() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then
    raise exception 'ADMIN_REQUIRED' using errcode='42501';
  end if;
end; $$;
create or replace function catalogue_private.read_edition(p_kind text, p_admin boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare item catalogue_private.editions;
begin
  if p_admin is true then perform catalogue_private.require_admin(); end if;
  select * into item from catalogue_private.editions where kind=p_kind;
  if not found then raise exception 'UNKNOWN_CATALOGUE'; end if;
  if p_admin is not true and item.config is not null and not coalesce((item.config->>'enabled')::boolean, false) then
    return jsonb_build_object('configured',true,'disabled',true);
  end if;
  return jsonb_build_object('configured',item.config is not null,'config',item.config,'revision',item.revision);
end; $$;
create or replace function catalogue_private.save_edition(p_kind text, p_config jsonb, p_revision integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare next_revision integer;
begin
  perform catalogue_private.require_admin();
  if jsonb_typeof(p_config) <> 'object' or octet_length(p_config::text)>60000 or jsonb_typeof(p_config->'enabled') is distinct from 'boolean' then raise exception 'INVALID_CONFIG'; end if;
  update catalogue_private.editions set config=p_config,revision=revision+1,updated_at=now(),updated_by=auth.uid()
  where kind=p_kind and revision=p_revision returning revision into next_revision;
  if not found then raise exception 'REVISION_CONFLICT'; end if;
  return next_revision;
end; $$;
create or replace function public.android_catalogue_read(p_kind text, p_admin boolean default false) returns jsonb
language sql security invoker set search_path = '' as $$ select catalogue_private.read_edition(p_kind,p_admin); $$;
create or replace function public.android_catalogue_save(p_kind text, p_config jsonb, p_revision integer) returns integer
language sql security invoker set search_path = '' as $$ select catalogue_private.save_edition(p_kind,p_config,p_revision); $$;
revoke all on all functions in schema catalogue_private from public,anon,authenticated;
revoke all on function public.android_catalogue_read(text,boolean) from public,anon,authenticated;
revoke all on function public.android_catalogue_save(text,jsonb,integer) from public,anon,authenticated;
grant usage on schema catalogue_private to anon,authenticated;
grant execute on function catalogue_private.read_edition(text,boolean) to anon,authenticated;
grant execute on function catalogue_private.save_edition(text,jsonb,integer) to authenticated;
grant execute on function public.android_catalogue_read(text,boolean) to anon,authenticated;
grant execute on function public.android_catalogue_save(text,jsonb,integer) to authenticated;
notify pgrst,'reload schema';
commit;
