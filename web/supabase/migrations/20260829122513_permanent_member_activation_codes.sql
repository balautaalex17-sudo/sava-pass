-- Member activation codes are app-owned, single-use credentials. Unlike
-- Supabase email OTPs, they have no time-based expiry. A short claim lease
-- prevents two requests from using the same code at the same time.
create table private.member_activation_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  claim_id uuid,
  claimed_at timestamptz,
  constraint member_activation_codes_email_normalized
    check (email = lower(btrim(email))),
  constraint member_activation_codes_hash_format
    check (code_hash ~ '^[0-9a-f]{64}$'),
  constraint member_activation_codes_claim_pair
    check ((claim_id is null) = (claimed_at is null))
);

alter table private.member_activation_codes enable row level security;
revoke all on table private.member_activation_codes from public, anon, authenticated;

create index member_activation_codes_lookup_idx
  on private.member_activation_codes (email, code_hash)
  where consumed_at is null;

create or replace function public.issue_member_activation_code(
  p_user_id uuid,
  p_email text,
  p_code_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(p_email));
begin
  if p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_activation_code_hash';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and lower(u.email) = normalized_email
  ) then
    raise exception 'activation_user_email_mismatch';
  end if;

  insert into private.member_activation_codes (
    user_id,
    email,
    code_hash,
    created_at,
    consumed_at,
    claim_id,
    claimed_at
  ) values (
    p_user_id,
    normalized_email,
    p_code_hash,
    now(),
    null,
    null,
    null
  )
  on conflict (user_id) do update
  set email = excluded.email,
      code_hash = excluded.code_hash,
      created_at = excluded.created_at,
      consumed_at = null,
      claim_id = null,
      claimed_at = null;

  return true;
end;
$$;

create or replace function public.claim_member_activation_code(
  p_email text,
  p_code_hash text,
  p_claim_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_user_id uuid;
begin
  update private.member_activation_codes
  set claim_id = p_claim_id,
      claimed_at = now()
  where email = lower(btrim(p_email))
    and code_hash = p_code_hash
    and consumed_at is null
    and (
      claimed_at is null
      or claimed_at < now() - interval '5 minutes'
    )
  returning user_id into claimed_user_id;

  return claimed_user_id;
end;
$$;

create or replace function public.finish_member_activation_code(
  p_user_id uuid,
  p_claim_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.member_activation_codes
  set consumed_at = now(),
      claim_id = null,
      claimed_at = null
  where user_id = p_user_id
    and claim_id = p_claim_id
    and consumed_at is null;

  return found;
end;
$$;

create or replace function public.release_member_activation_code(
  p_user_id uuid,
  p_claim_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.member_activation_codes
  set claim_id = null,
      claimed_at = null
  where user_id = p_user_id
    and claim_id = p_claim_id
    and consumed_at is null;

  return found;
end;
$$;

revoke all on function public.issue_member_activation_code(uuid, text, text) from public, anon, authenticated;
revoke all on function public.claim_member_activation_code(text, text, uuid) from public, anon, authenticated;
revoke all on function public.finish_member_activation_code(uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_member_activation_code(uuid, uuid) from public, anon, authenticated;

grant execute on function public.issue_member_activation_code(uuid, text, text) to service_role;
grant execute on function public.claim_member_activation_code(text, text, uuid) to service_role;
grant execute on function public.finish_member_activation_code(uuid, uuid) to service_role;
grant execute on function public.release_member_activation_code(uuid, uuid) to service_role;
