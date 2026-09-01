-- Event lifecycle and /despre placement are deliberately independent.
-- `status = past` is retained as the existing storage value for a permanently
-- ended event. Runtime code exposes that value as the domain status `ended`.

alter table public.events
  add column ends_at timestamptz,
  add column manually_ended_at timestamptz,
  add column featured_slot smallint;

-- Preserve every existing event. Four hours is only a compatibility default;
-- editors can correct a future event before it reaches that time.
update public.events
set ends_at = starts_at + interval '4 hours'
where ends_at is null;

alter table public.events
  alter column ends_at set not null,
  add constraint events_end_after_start check (ends_at > starts_at),
  add constraint events_featured_slot_range check (
    featured_slot is null or featured_slot between 1 and 3
  ),
  add constraint events_featured_must_be_public check (
    featured_slot is null or status <> 'draft'::public.event_status
  );

create unique index events_featured_slot_unique
  on public.events(featured_slot)
  where featured_slot is not null;

-- The old three-active-events rule mixed lifecycle with placement. Any number
-- of events may be active; only the three featured slots are limited.
drop trigger if exists events_active_limit on public.events;
drop function if exists public.enforce_active_event_limit();

create or replace function private.enforce_event_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_auto_ended boolean := false;
begin
  if new.ends_at <= new.starts_at then
    raise exception using errcode = '23514', message = 'event_end_must_follow_start';
  end if;

  if tg_op = 'UPDATE' then
    if old.manually_ended_at is not null
       and new.manually_ended_at is distinct from old.manually_ended_at then
      raise exception using errcode = '23514', message = 'event_manual_end_is_permanent';
    end if;

    if old.status = 'past'::public.event_status
       or old.manually_ended_at is not null then
      if new.status <> 'past'::public.event_status then
        raise exception using errcode = '23514', message = 'event_cannot_be_reactivated';
      end if;
      new.status := 'past'::public.event_status;
      new.manually_ended_at := old.manually_ended_at;
    elsif old.status = 'active'::public.event_status
       and old.ends_at <= pg_catalog.now() then
      -- An automatically ended event stays ended even if a later edit tries to
      -- move its end time into the future.
      new.status := 'past'::public.event_status;
      v_auto_ended := true;
    end if;

    if old.status <> 'past'::public.event_status
       and new.status = 'past'::public.event_status
       and new.manually_ended_at is null
       and not v_auto_ended then
      new.manually_ended_at := pg_catalog.now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists events_enforce_lifecycle on public.events;
create trigger events_enforce_lifecycle
before insert or update of status, starts_at, ends_at, manually_ended_at
on public.events
for each row execute function private.enforce_event_lifecycle();

revoke all on function private.enforce_event_lifecycle()
  from public, anon, authenticated;

create or replace function public.admin_end_event(target_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
begin
  select e.* into v_event
  from public.events e
  where e.id = target_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'event_not_found';
  end if;

  if v_event.status = 'draft'::public.event_status then
    raise exception using errcode = '23514', message = 'draft_event_cannot_be_ended';
  end if;

  if v_event.status = 'past'::public.event_status
     or v_event.manually_ended_at is not null
     or v_event.ends_at <= pg_catalog.now() then
    if v_event.status <> 'past'::public.event_status then
      update public.events
      set status = 'past'::public.event_status
      where id = target_id;
    end if;
    return false;
  end if;

  update public.events
  set status = 'past'::public.event_status,
      manually_ended_at = pg_catalog.now()
  where id = target_id;

  return true;
end;
$$;

revoke all on function public.admin_end_event(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_end_event(uuid)
  to service_role;

-- Serialize every slot move with one short transaction-level advisory lock.
-- The expected occupant makes a stale dashboard fail instead of replacing a
-- different event after another admin changed the same slot.
create or replace function public.admin_assign_featured_slot(
  target_id uuid,
  target_slot smallint,
  expected_occupant_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.events%rowtype;
  v_occupant public.events%rowtype;
begin
  if target_slot is null or target_slot not between 1 and 3 then
    raise exception using errcode = '22023', message = 'invalid_featured_slot';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(82173404);

  select e.* into v_target
  from public.events e
  where e.id = target_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'event_not_found';
  end if;
  if v_target.status = 'draft'::public.event_status then
    raise exception using errcode = '23514', message = 'draft_event_cannot_be_featured';
  end if;
  if v_target.featured_slot = target_slot then
    return;
  end if;

  select e.* into v_occupant
  from public.events e
  where e.featured_slot = target_slot
    and e.id <> target_id
  for update;

  if found then
    if expected_occupant_id is null
       or expected_occupant_id <> v_occupant.id then
      raise exception using errcode = '40001', message = 'featured_slot_changed';
    end if;
    if v_occupant.status = 'active'::public.event_status
       and v_occupant.manually_ended_at is null
       and v_occupant.ends_at > pg_catalog.now() then
      raise exception using errcode = '23514', message = 'featured_slot_contains_active_event';
    end if;

    update public.events
    set featured_slot = null
    where id = v_occupant.id;
  elsif expected_occupant_id is not null then
    raise exception using errcode = '40001', message = 'featured_slot_changed';
  end if;

  update public.events
  set featured_slot = target_slot
  where id = target_id;
end;
$$;

revoke all on function public.admin_assign_featured_slot(uuid, smallint, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_assign_featured_slot(uuid, smallint, uuid)
  to service_role;

create or replace function public.admin_remove_featured_slot(
  target_id uuid,
  expected_slot smallint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_slot smallint;
begin
  if expected_slot is null or expected_slot not between 1 and 3 then
    raise exception using errcode = '22023', message = 'invalid_featured_slot';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(82173404);

  select e.featured_slot into v_current_slot
  from public.events e
  where e.id = target_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'event_not_found';
  end if;
  if v_current_slot is distinct from expected_slot then
    raise exception using errcode = '40001', message = 'featured_slot_changed';
  end if;

  update public.events
  set featured_slot = null
  where id = target_id;
  return true;
end;
$$;

revoke all on function public.admin_remove_featured_slot(uuid, smallint)
  from public, anon, authenticated;
grant execute on function public.admin_remove_featured_slot(uuid, smallint)
  to service_role;

-- Keep the old RPC safe during a rolling deployment. It may publish a draft or
-- end an event, but it can never reopen or hide an already-public event.
create or replace function public.admin_set_event_status(
  target_id uuid,
  target_status public.event_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
begin
  if target_status = 'past'::public.event_status then
    perform public.admin_end_event(target_id);
    return;
  end if;

  select e.* into v_event
  from public.events e
  where e.id = target_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'event_not_found';
  end if;

  if target_status = 'active'::public.event_status
     and v_event.status = 'draft'::public.event_status
     and v_event.manually_ended_at is null
     and v_event.ends_at > pg_catalog.now() then
    update public.events
    set status = 'active'::public.event_status
    where id = target_id;
    return;
  end if;

  if target_status = 'draft'::public.event_status
     and v_event.status = 'draft'::public.event_status then
    return;
  end if;

  raise exception using errcode = '23514', message = 'event_cannot_be_reactivated';
end;
$$;

revoke all on function public.admin_set_event_status(uuid, public.event_status)
  from public, anon, authenticated;
grant execute on function public.admin_set_event_status(uuid, public.event_status)
  to service_role;

-- Database-side backstop for every order-creation path, including future code
-- that does not call reserve_public_ticket.
create or replace function private.enforce_order_event_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
begin
  select e.* into v_event
  from public.events e
  where e.id = new.event_id
  for key share;

  if not found
     or v_event.status <> 'active'::public.event_status
     or v_event.manually_ended_at is not null
     or v_event.ends_at <= pg_catalog.now() then
    raise exception using errcode = '23514', message = 'event_unavailable';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_require_open_event on public.orders;
create trigger orders_require_open_event
before insert on public.orders
for each row execute function private.enforce_order_event_open();

revoke all on function private.enforce_order_event_open()
  from public, anon, authenticated;

-- Update the existing atomic public reservation function so availability ends
-- at ends_at, not at starts_at. The rest of its capacity and idempotency logic
-- stays unchanged.
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
     or v_event.manually_ended_at is not null
     or v_event.ends_at <= v_now then
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
