-- Security audit remediation: Storage authorization, public abuse limits,
-- atomic ticket inventory, reservation expiry, and database hardening.

create schema if not exists private;
revoke all on schema private from public;

-- The application uploads media only through an admin-only Server Action using
-- the service role. Direct authenticated Storage writes are unnecessary.
drop policy if exists "media staff insert" on storage.objects;
drop policy if exists "media staff update" on storage.objects;
drop policy if exists "media staff delete" on storage.objects;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'media',
  'media',
  true,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Large uploads bypass Next.js request parsing through a short-lived signed URL.
-- Staging stays private; only validated/normalized files move to public media.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'media-staging',
  'media-staging',
  false,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Idempotency allows a browser retry to retrieve the same reservation instead
-- of creating a duplicate order.
alter table public.orders
  add column if not exists request_key uuid;

create unique index if not exists orders_request_key_key
  on public.orders(request_key)
  where request_key is not null;

create index if not exists tickets_ticket_type_status_idx
  on public.tickets(ticket_type_id, status);

-- A retried reservation may ask to create its messages again. One ticket gets
-- at most one copy of each template per channel.
create unique index if not exists notifications_ticket_template_channel_key
  on public.notifications(ticket_id, template_key, channel)
  where ticket_id is not null and template_key is not null;

alter table public.orders
  drop constraint if exists orders_buyer_name_length_check,
  drop constraint if exists orders_buyer_email_length_check;
alter table public.orders
  add constraint orders_buyer_name_length_check
    check (char_length(buyer_name) between 2 and 120) not valid,
  add constraint orders_buyer_email_length_check
    check (char_length(buyer_email) between 3 and 254) not valid;
alter table public.orders
  validate constraint orders_buyer_name_length_check,
  validate constraint orders_buyer_email_length_check;

alter table public.contact_messages
  drop constraint if exists contact_messages_name_length_check,
  drop constraint if exists contact_messages_email_length_check,
  drop constraint if exists contact_messages_message_length_check;
alter table public.contact_messages
  add constraint contact_messages_name_length_check
    check (char_length(name) between 2 and 120) not valid,
  add constraint contact_messages_email_length_check
    check (char_length(email) between 3 and 254) not valid,
  add constraint contact_messages_message_length_check
    check (char_length(message) between 10 and 5000) not valid;
alter table public.contact_messages
  validate constraint contact_messages_name_length_check,
  validate constraint contact_messages_email_length_check,
  validate constraint contact_messages_message_length_check;

-- Durable, fixed-window counters for anonymous actions. Raw IP/email values are
-- never stored: the application sends an HMAC fingerprint as key_hash.
create table if not exists public.public_rate_limits (
  key_hash text not null,
  scope text not null,
  window_started_at timestamptz not null,
  attempts integer not null default 1 check (attempts > 0),
  updated_at timestamptz not null default now(),
  constraint public_rate_limits_pkey
    primary key (key_hash, scope, window_started_at),
  constraint public_rate_limits_key_hash_check
    check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint public_rate_limits_scope_check
    check (char_length(scope) between 1 and 80)
);

alter table public.public_rate_limits enable row level security;
revoke all on public.public_rate_limits from public, anon, authenticated;
grant all on public.public_rate_limits to service_role;

drop policy if exists public_rate_limits_client_deny
  on public.public_rate_limits;
create policy public_rate_limits_client_deny
on public.public_rate_limits
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.consume_public_rate_limit(
  p_key_hash text,
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_attempts integer;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
     or char_length(p_scope) not between 1 and 80
     or p_limit not between 1 and 10000
     or p_window_seconds not between 1 and 604800 then
    return false;
  end if;

  v_window := pg_catalog.to_timestamp(
    pg_catalog.floor(
      extract(epoch from pg_catalog.clock_timestamp()) / p_window_seconds
    ) * p_window_seconds
  );

  insert into public.public_rate_limits(
    key_hash,
    scope,
    window_started_at,
    attempts
  ) values (
    p_key_hash,
    p_scope,
    v_window,
    1
  )
  on conflict (key_hash, scope, window_started_at)
  do update
    set attempts = public.public_rate_limits.attempts + 1,
        updated_at = pg_catalog.now()
  returning attempts into v_attempts;

  return v_attempts <= p_limit;
end;
$$;

revoke all on function public.consume_public_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_public_rate_limit(text, text, integer, integer)
  to service_role;

-- One transaction owns the capacity decision and both inserts. The advisory
-- lock serializes all ticket types for the same event, preventing total-event
-- and per-type oversell under concurrent requests.
create or replace function public.reserve_public_ticket(
  p_request_key uuid,
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_order_id uuid,
  p_ticket_id uuid,
  p_ticket_code text,
  p_qr_token text,
  p_holder_name text,
  p_holder_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_event public.events%rowtype;
  v_ticket_type public.event_ticket_types%rowtype;
  v_existing record;
  v_event_sold integer;
  v_type_sold integer;
  v_is_free boolean;
  v_inserted_order_id uuid;
begin
  if p_request_key is null
     or p_event_id is null
     or p_ticket_type_id is null
     or p_order_id is null
     or p_ticket_id is null
     or p_holder_name is null
     or p_holder_email is null
     or p_ticket_code is null
     or p_qr_token is null
     or p_holder_name <> pg_catalog.btrim(p_holder_name)
     or char_length(p_holder_name) not between 2 and 120
     or p_holder_email <> pg_catalog.lower(pg_catalog.btrim(p_holder_email))
     or char_length(p_holder_email) not between 3 and 254
     or p_holder_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or p_ticket_code !~ '^[A-HJ-NP-Z2-9]{6}$'
     or char_length(p_qr_token) not between 80 and 2048 then
    return jsonb_build_object('result', 'invalid_input');
  end if;

  select
    o.id as order_id,
    o.event_id,
    o.ticket_type_id,
    o.buyer_email,
    o.status as order_status,
    t.id as ticket_id,
    t.qr_token
  into v_existing
  from public.orders o
  join public.tickets t on t.order_id = o.id
  where o.request_key = p_request_key;

  if found then
    if v_existing.event_id <> p_event_id
       or v_existing.ticket_type_id <> p_ticket_type_id
       or v_existing.buyer_email <> p_holder_email then
      return jsonb_build_object('result', 'request_key_conflict');
    end if;
    return jsonb_build_object(
      'result', 'reserved',
      'created', false,
      'order_id', v_existing.order_id,
      'ticket_id', v_existing.ticket_id,
      'qr_token', v_existing.qr_token,
      'order_status', v_existing.order_status
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_event_id::text, 0)
  );

  select e.* into v_event
  from public.events e
  where e.id = p_event_id
  for update;

  select tt.* into v_ticket_type
  from public.event_ticket_types tt
  where tt.id = p_ticket_type_id
    and tt.event_id = p_event_id
  for update;

  if v_event.id is null
     or v_event.status <> 'active'::public.event_status
     or v_event.starts_at <= v_now then
    return jsonb_build_object('result', 'event_unavailable');
  end if;

  if v_ticket_type.id is null
     or v_ticket_type.status <> 'active'
     or (v_ticket_type.sales_start_at is not null and v_ticket_type.sales_start_at > v_now)
     or (v_ticket_type.sales_end_at is not null and v_ticket_type.sales_end_at < v_now) then
    return jsonb_build_object('result', 'ticket_type_unavailable');
  end if;

  update public.tickets
  set status = 'expired'::public.ticket_status
  where event_id = p_event_id
    and status = 'reserved'::public.ticket_status
    and expires_at <= v_now;

  update public.orders o
  set status = 'failed'::public.order_status
  where o.event_id = p_event_id
    and o.status = 'pending'::public.order_status
    and exists (
      select 1 from public.tickets t
      where t.order_id = o.id
        and t.status = 'expired'::public.ticket_status
    );

  select count(*)::integer into v_event_sold
  from public.tickets t
  where t.event_id = p_event_id
    and t.status in (
      'reserved'::public.ticket_status,
      'paid'::public.ticket_status,
      'checked_in'::public.ticket_status
    );

  select count(*)::integer into v_type_sold
  from public.tickets t
  where t.ticket_type_id = p_ticket_type_id
    and t.status in (
      'reserved'::public.ticket_status,
      'paid'::public.ticket_status,
      'checked_in'::public.ticket_status
    );

  if v_event_sold >= v_event.capacity then
    return jsonb_build_object('result', 'event_sold_out');
  end if;
  if v_type_sold >= v_ticket_type.capacity then
    return jsonb_build_object('result', 'ticket_type_sold_out');
  end if;

  v_is_free := v_ticket_type.price_bani = 0;

  insert into public.orders(
    id,
    event_id,
    ticket_type_id,
    buyer_name,
    buyer_email,
    quantity,
    amount_bani,
    currency,
    status,
    paid_at,
    request_key
  ) values (
    p_order_id,
    p_event_id,
    p_ticket_type_id,
    p_holder_name,
    p_holder_email,
    1,
    v_ticket_type.price_bani,
    'ron',
    case when v_is_free then 'paid'::public.order_status else 'pending'::public.order_status end,
    case when v_is_free then v_now else null end,
    p_request_key
  )
  on conflict (request_key) where request_key is not null do nothing
  returning id into v_inserted_order_id;

  if v_inserted_order_id is null then
    select
      o.id as order_id,
      o.event_id,
      o.ticket_type_id,
      o.buyer_email,
      o.status as order_status,
      t.id as ticket_id,
      t.qr_token
    into v_existing
    from public.orders o
    join public.tickets t on t.order_id = o.id
    where o.request_key = p_request_key;

    if not found
       or v_existing.event_id <> p_event_id
       or v_existing.ticket_type_id <> p_ticket_type_id
       or v_existing.buyer_email <> p_holder_email then
      return jsonb_build_object('result', 'request_key_conflict');
    end if;
    return jsonb_build_object(
      'result', 'reserved',
      'created', false,
      'order_id', v_existing.order_id,
      'ticket_id', v_existing.ticket_id,
      'qr_token', v_existing.qr_token,
      'order_status', v_existing.order_status
    );
  end if;

  insert into public.tickets(
    id,
    order_id,
    event_id,
    ticket_type_id,
    code,
    qr_token,
    holder_name,
    holder_email,
    status,
    expires_at,
    payment_confirmed_at
  ) values (
    p_ticket_id,
    p_order_id,
    p_event_id,
    p_ticket_type_id,
    p_ticket_code,
    p_qr_token,
    p_holder_name,
    p_holder_email,
    case when v_is_free then 'paid'::public.ticket_status else 'reserved'::public.ticket_status end,
    case when v_is_free then null else v_now + interval '48 hours' end,
    case when v_is_free then v_now else null end
  );

  return jsonb_build_object(
    'result', 'reserved',
    'created', true,
    'order_id', p_order_id,
    'ticket_id', p_ticket_id,
    'qr_token', p_qr_token,
    'order_status', case when v_is_free then 'paid' else 'pending' end
  );
end;
$$;

revoke all on function public.reserve_public_ticket(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.reserve_public_ticket(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text
) to service_role;

-- Final inventory invariant for every issuance path, including admin comp
-- tickets and future jobs that do not call reserve_public_ticket directly.
create or replace function private.enforce_ticket_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_capacity integer;
  v_type_capacity integer;
  v_event_sold integer;
  v_type_sold integer;
begin
  if new.status not in (
    'reserved'::public.ticket_status,
    'paid'::public.ticket_status,
    'checked_in'::public.ticket_status
  ) then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.event_id::text, 0)
  );

  select e.capacity into v_event_capacity
  from public.events e
  where e.id = new.event_id
  for update;

  select count(*)::integer into v_event_sold
  from public.tickets t
  where t.event_id = new.event_id
    and t.id <> new.id
    and t.status in (
      'reserved'::public.ticket_status,
      'paid'::public.ticket_status,
      'checked_in'::public.ticket_status
    );

  if v_event_sold >= v_event_capacity then
    raise exception using errcode = 'P0001', message = 'event_sold_out';
  end if;

  if new.ticket_type_id is not null then
    select tt.capacity into v_type_capacity
    from public.event_ticket_types tt
    where tt.id = new.ticket_type_id
      and tt.event_id = new.event_id
    for update;

    if v_type_capacity is null then
      raise exception using errcode = 'P0001', message = 'ticket_type_unavailable';
    end if;

    select count(*)::integer into v_type_sold
    from public.tickets t
    where t.ticket_type_id = new.ticket_type_id
      and t.id <> new.id
      and t.status in (
        'reserved'::public.ticket_status,
        'paid'::public.ticket_status,
        'checked_in'::public.ticket_status
      );

    if v_type_sold >= v_type_capacity then
      raise exception using errcode = 'P0001', message = 'ticket_type_sold_out';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_ticket_capacity() from public;

drop trigger if exists tickets_capacity_guard on public.tickets;
create trigger tickets_capacity_guard
before insert or update of event_id, ticket_type_id, status on public.tickets
for each row execute function private.enforce_ticket_capacity();

-- Web recruitment submissions also get a database-side capacity invariant.
create or replace function private.enforce_public_recruitment_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.recruitment_campaigns%rowtype;
  v_count integer;
begin
  if new.source <> 'web' or new.campaign_id is null then return new; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.campaign_id::text, 1)
  );

  select c.* into v_campaign
  from public.recruitment_campaigns c
  where c.id = new.campaign_id
  for update;

  if v_campaign.id is null
     or v_campaign.status <> 'open'
     or v_campaign.opens_at is null
     or v_campaign.closes_at is null
     or v_campaign.opens_at > pg_catalog.now()
     or v_campaign.closes_at < pg_catalog.now() then
    raise exception using errcode = 'P0001', message = 'recruitment_closed';
  end if;

  if v_campaign.application_limit is not null then
    select count(*)::integer into v_count
    from public.membership_applications a
    where a.campaign_id = new.campaign_id;
    if v_count >= v_campaign.application_limit then
      raise exception using errcode = 'P0001', message = 'application_limit_reached';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_public_recruitment_capacity() from public;

drop trigger if exists membership_applications_capacity_guard
  on public.membership_applications;
create trigger membership_applications_capacity_guard
before insert on public.membership_applications
for each row execute function private.enforce_public_recruitment_capacity();

-- Queue workers atomically claim rows before delivery, so overlapping cron runs
-- cannot send the same email twice.
create or replace function public.claim_due_notifications(p_limit integer default 50)
returns table(id uuid)
language sql
security definer
set search_path = ''
as $$
  with candidates as (
    select n.id
    from public.notifications n
    where n.status = 'queued'
      and n.scheduled_for <= pg_catalog.now()
    order by n.scheduled_for
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  )
  update public.notifications n
  set status = 'sending', updated_at = pg_catalog.now()
  from candidates c
  where n.id = c.id
  returning n.id;
$$;

revoke all on function public.claim_due_notifications(integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_notifications(integer)
  to service_role;

create or replace function public.run_security_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired integer;
  v_limits_deleted integer;
begin
  update public.notifications
  set status = 'queued',
      updated_at = pg_catalog.now(),
      last_error = 'Recovered after an interrupted delivery attempt.'
  where status = 'sending'
    and updated_at < pg_catalog.now() - interval '15 minutes';

  update public.tickets
  set status = 'expired'::public.ticket_status
  where status = 'reserved'::public.ticket_status
    and expires_at <= pg_catalog.now();
  get diagnostics v_expired = row_count;

  update public.orders o
  set status = 'failed'::public.order_status
  where o.status = 'pending'::public.order_status
    and exists (
      select 1 from public.tickets t
      where t.order_id = o.id
        and t.status = 'expired'::public.ticket_status
    );

  delete from public.public_rate_limits
  where window_started_at < pg_catalog.now() - interval '7 days';
  get diagnostics v_limits_deleted = row_count;

  return jsonb_build_object(
    'expired_tickets', v_expired,
    'deleted_rate_limits', v_limits_deleted
  );
end;
$$;

revoke all on function public.run_security_maintenance()
  from public, anon, authenticated;
grant execute on function public.run_security_maintenance()
  to service_role;

-- Make policy intent explicit and harden the remaining public definer function.
drop policy if exists applicants_update on public.applicants;
create policy applicants_update
on public.applicants
for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create or replace function public.admin_set_event_status(
  target_id uuid,
  target_status public.event_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_status = 'active'::public.event_status then
    update public.events
    set status = 'past'::public.event_status
    where status = 'active'::public.event_status
      and id <> target_id;
  end if;

  update public.events
  set status = target_status
  where id = target_id;

  if not found then raise exception 'event_not_found'; end if;
end;
$$;

revoke all on function public.admin_set_event_status(uuid, public.event_status)
  from public, anon, authenticated;
grant execute on function public.admin_set_event_status(uuid, public.event_status)
  to service_role;

alter view public.event_stats set (security_invoker = true);
