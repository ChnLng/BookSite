-- No real promo code is stored in this migration or in Git.
-- Run as the database owner. All batches start disabled; import only unused codes.
begin;
create schema if not exists play_private;
revoke all on schema play_private from public, anon, authenticated;
grant usage on schema play_private to authenticated;

create table if not exists play_private.batches (
  id uuid primary key default gen_random_uuid(),
  package_name text not null check (package_name in ('com.visdar.calendrier','com.visdar.heures','com.visdar.manuscrits','com.visdar.couleurs','com.visdar.famille')),
  label text not null check (length(label) between 1 and 100),
  valid_from timestamptz not null,
  valid_until timestamptz not null check (valid_until > valid_from),
  enabled boolean not null default false,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (id, package_name)
);
create table if not exists play_private.codes (
  code text primary key check (code ~ '^[A-Z0-9]{8,128}$'),
  batch_id uuid not null,
  package_name text not null,
  blocked boolean not null default false,
  assigned_user uuid,
  email_key text,
  assigned_at timestamptz,
  foreign key (batch_id, package_name) references play_private.batches(id, package_name),
  unique (package_name, assigned_user),
  unique (package_name, email_key),
  check ((assigned_user is null and email_key is null and assigned_at is null)
    or (assigned_user is not null and email_key is not null and assigned_at is not null))
);
-- Intentionally no auth.users FK: deleting an account must not recycle its code.
alter table play_private.batches enable row level security;
alter table play_private.codes enable row level security;
revoke all on all tables in schema play_private from public, anon, authenticated;

create or replace function play_private.email_key(value text)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(case when lower(split_part(trim(value),'@',2)) in ('gmail.com','googlemail.com')
    then replace(split_part(split_part(lower(trim(value)),'@',1),'+',1),'.','') || '@gmail.com'
    else lower(trim(value)) end,'UTF8')),'hex');
$$;

create or replace function play_private.require_admin()
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not exists (select 1 from public.profiles where id=uid and role='admin') then
    raise exception using errcode='42501', message='ADMIN_REQUIRED';
  end if;
  return uid;
end;
$$;

create or replace function play_private.own_status(p_package text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare item record;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select c.code,c.blocked,b.enabled,b.valid_from,b.valid_until into item
    from play_private.codes c join play_private.batches b on b.id=c.batch_id
    where c.package_name=p_package and c.assigned_user=auth.uid();
  if found then
    return jsonb_build_object('status',case when item.blocked then 'blocked'
      when item.valid_until<=now() then 'expired' when not item.enabled or item.valid_from>now() then 'paused' else 'assigned' end,
      'code',case when not item.blocked and item.enabled and item.valid_from<=now() and item.valid_until>now() then item.code else null end,
      'validUntil',item.valid_until,'hasClaim',true);
  end if;
  return jsonb_build_object('status',case when exists (
    select 1 from play_private.codes c join play_private.batches b on b.id=c.batch_id
    where c.package_name=p_package and c.assigned_user is null and not c.blocked
      and b.enabled and b.valid_from<=now() and b.valid_until>now()
  ) then 'available' else 'unavailable' end,'hasClaim',false);
end;
$$;

create or replace function play_private.claim_code(p_package text,p_play_email text,p_consent boolean,p_group_confirmed boolean,p_test_confirmed boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); verified_email text; chosen text; status jsonb;
begin
  if uid is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if not (p_consent is true and p_group_confirmed is true and p_test_confirmed is true) then
    raise exception using errcode='22023',message='CONFIRMATIONS_REQUIRED';
  end if;
  -- Serializes requests by the same user, including lost-response retries.
  -- Google membership/opt-in are user declarations, not API-verified assertions.
  select email into verified_email from auth.users where id=uid and email_confirmed_at is not null
    and coalesce(is_anonymous,false)=false and (banned_until is null or banned_until<now()) for update;
  if not found then raise exception using errcode='42501',message='VERIFIED_EMAIL_REQUIRED'; end if;
  if p_play_email is null or length(p_play_email)>254 or
    play_private.email_key(p_play_email)<>play_private.email_key(verified_email) then
    raise exception using errcode='42501',message='PLAY_EMAIL_MUST_MATCH';
  end if;
  status:=play_private.own_status(p_package);
  if (status->>'hasClaim')::boolean then return status || jsonb_build_object('repeated',true); end if;
  if exists(select 1 from play_private.codes where package_name=p_package and email_key=play_private.email_key(verified_email)) then
    raise exception using errcode='42501',message='EMAIL_ALREADY_ASSIGNED';
  end if;
  select c.code into chosen from play_private.codes c join play_private.batches b on b.id=c.batch_id
    where c.package_name=p_package and c.assigned_user is null and not c.blocked
      and b.enabled and b.valid_from<=now() and b.valid_until>now()
    order by b.valid_until,b.created_at,c.code limit 1 for update of c skip locked;
  if chosen is null then return jsonb_build_object('status','unavailable','hasClaim',false); end if;
  update play_private.codes set assigned_user=uid,email_key=play_private.email_key(verified_email),assigned_at=now() where code=chosen;
  return play_private.own_status(p_package) || jsonb_build_object('repeated',false);
exception when unique_violation then
  -- A competing verified alias/account cannot read the other account's code.
  raise exception using errcode='42501',message='EMAIL_ALREADY_ASSIGNED';
end;
$$;

create or replace function play_private.admin_inventory()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; claims jsonb;
begin
  perform play_private.require_admin();
  select coalesce(jsonb_agg(row_to_json(x) order by x.created_at desc),'[]'::jsonb) into result from (
    select b.*,count(c.code)::int as total,
      count(c.code) filter (where c.assigned_user is not null)::int as assigned,
      count(c.code) filter (where c.blocked)::int as blocked,
      count(c.code) filter (where c.assigned_user is null and not c.blocked)::int as remaining
    from play_private.batches b left join play_private.codes c on c.batch_id=b.id group by b.id
  ) x;
  select coalesce(jsonb_agg(row_to_json(x)),'[]'::jsonb) into claims from (
    select c.package_name,coalesce(u.email,'Compte supprimé') as email,c.assigned_at,c.blocked from play_private.codes c
    left join auth.users u on u.id=c.assigned_user
    where c.assigned_user is not null order by c.assigned_at desc limit 100
  ) x;
  return jsonb_build_object('batches',result,'claims',claims);
end;
$$;

create or replace function play_private.import_codes(p_package text,p_label text,p_from timestamptz,p_until timestamptz,p_codes text[],p_unused_confirmed boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid; batch uuid; inserted integer;
begin
  uid:=play_private.require_admin();
  if p_unused_confirmed is not true or coalesce(cardinality(p_codes),0) not between 1 and 5000
    or p_from is null or p_until is null or p_until<=p_from or p_until<=now()
    or coalesce(length(trim(p_label)),0) not between 1 and 100
    or exists(select 1 from unnest(p_codes) c where c is null or c !~ '^[A-Z0-9]{8,128}$') then
    raise exception using errcode='22023',message='INVALID_IMPORT';
  end if;
  if exists(select 1 from play_private.codes where code=any(p_codes) and package_name<>p_package) then
    raise exception using errcode='22023',message='CODE_APP_CONFLICT';
  end if;
  insert into play_private.batches(package_name,label,valid_from,valid_until,created_by)
    values(p_package,trim(p_label),p_from,p_until,uid) returning id into batch;
  insert into play_private.codes(code,batch_id,package_name)
    select distinct c,batch,p_package from unnest(p_codes) c on conflict(code) do nothing;
  get diagnostics inserted=row_count;
  -- Reimporting must never move/reactivate/clear an already assigned or blocked code.
  if inserted=0 then delete from play_private.batches where id=batch; end if;
  return jsonb_build_object('inserted',inserted,'ignored',cardinality(p_codes)-inserted,'enabled',false);
end;
$$;

create or replace function play_private.set_batch_enabled(p_batch uuid,p_enabled boolean,p_google_active_confirmed boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform play_private.require_admin();
  if p_enabled is null or (p_enabled and p_google_active_confirmed is not true) then
    raise exception using errcode='22023',message='GOOGLE_ACTIVE_CONFIRMATION_REQUIRED';
  end if;
  update play_private.batches set enabled=p_enabled where id=p_batch and (not p_enabled or valid_until>now());
  if not found then raise exception using errcode='22023',message='BATCH_MISSING_OR_EXPIRED'; end if;
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function play_private.block_codes(p_codes text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare updated integer;
begin
  perform play_private.require_admin();
  if coalesce(cardinality(p_codes),0) not between 1 and 5000 then raise exception using errcode='22023',message='INVALID_IMPORT'; end if;
  update play_private.codes set blocked=true where code=any(p_codes);
  get diagnostics updated=row_count;
  return jsonb_build_object('blocked',updated);
end;
$$;

-- This returns only the current account's assignments.  It deliberately hides
-- the redeemable text for expired, paused, or blocked campaigns.
create or replace function play_private.account_codes()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'packageName',c.package_name,
        'status',case when c.blocked then 'blocked'
          when b.valid_until<=now() then 'expired'
          when not b.enabled or b.valid_from>now() then 'paused' else 'assigned' end,
        'code',case when not c.blocked and b.enabled and b.valid_from<=now() and b.valid_until>now() then c.code else null end,
        'validUntil',b.valid_until,
        'assignedAt',c.assigned_at
      ) order by c.assigned_at desc
    )
    from play_private.codes c
    join play_private.batches b on b.id=c.batch_id
    where c.assigned_user=auth.uid()
  ),'[]'::jsonb);
end;
$$;

-- Only invoker wrappers live in the PostgREST-exposed schema. Each private entry
-- point derives identity from auth.uid(), never from a caller-supplied user id.
create or replace function public.play_testing_status(p_package text) returns jsonb
language sql security invoker set search_path='' as $$ select play_private.own_status(p_package); $$;
create or replace function public.play_testing_claim(p_package text,p_play_email text,p_consent boolean,p_group_confirmed boolean,p_test_confirmed boolean) returns jsonb
language sql security invoker set search_path='' as $$ select play_private.claim_code(p_package,p_play_email,p_consent,p_group_confirmed,p_test_confirmed); $$;
create or replace function public.play_testing_inventory() returns jsonb
language sql security invoker set search_path='' as $$ select play_private.admin_inventory(); $$;
create or replace function public.play_testing_import(p_package text,p_label text,p_from timestamptz,p_until timestamptz,p_codes text[],p_unused_confirmed boolean) returns jsonb
language sql security invoker set search_path='' as $$ select play_private.import_codes(p_package,p_label,p_from,p_until,p_codes,p_unused_confirmed); $$;
create or replace function public.play_testing_batch(p_batch uuid,p_enabled boolean,p_google_active_confirmed boolean) returns jsonb
language sql security invoker set search_path='' as $$ select play_private.set_batch_enabled(p_batch,p_enabled,p_google_active_confirmed); $$;
create or replace function public.play_testing_block(p_codes text[]) returns jsonb
language sql security invoker set search_path='' as $$ select play_private.block_codes(p_codes); $$;
create or replace function public.play_testing_account_codes() returns jsonb
language sql security invoker set search_path='' as $$ select play_private.account_codes(); $$;

revoke all on all functions in schema play_private from public,anon,authenticated;
grant execute on function play_private.own_status(text),play_private.claim_code(text,text,boolean,boolean,boolean),play_private.admin_inventory(),play_private.import_codes(text,text,timestamptz,timestamptz,text[],boolean),play_private.set_batch_enabled(uuid,boolean,boolean),play_private.block_codes(text[]),play_private.account_codes() to authenticated;
revoke all on function public.play_testing_status(text),public.play_testing_claim(text,text,boolean,boolean,boolean),public.play_testing_inventory(),public.play_testing_import(text,text,timestamptz,timestamptz,text[],boolean),public.play_testing_batch(uuid,boolean,boolean),public.play_testing_block(text[]),public.play_testing_account_codes() from public,anon;
grant execute on function public.play_testing_status(text),public.play_testing_claim(text,text,boolean,boolean,boolean),public.play_testing_inventory(),public.play_testing_import(text,text,timestamptz,timestamptz,text[],boolean),public.play_testing_batch(uuid,boolean,boolean),public.play_testing_block(text[]),public.play_testing_account_codes() to authenticated;
notify pgrst,'reload schema';
commit;
