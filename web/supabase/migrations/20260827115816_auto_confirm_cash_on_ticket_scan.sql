-- A ticket scan is the physical proof that cash was received at the door.
-- Keep payment confirmation and check-in in one locked database transaction.
create or replace function public.check_in_ticket(
  p_ticket_id uuid,
  p_actor_id uuid,
  p_token_fingerprint text,
  p_device_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets%rowtype;
  v_order public.orders%rowtype;
  v_event public.events%rowtype;
  v_scan_id uuid;
  v_original_time timestamptz;
  v_original_scanner text;
  v_checked_in_at timestamptz := now();
  v_previous_status text;
  v_payment_confirmed boolean := false;
begin
  if not private.profile_has_permission(p_actor_id, 'scan_event_tickets') then
    return jsonb_build_object('result', 'unauthorized');
  end if;

  select * into v_ticket
  from public.tickets t
  where t.id = p_ticket_id
  for update;
  if not found then return jsonb_build_object('result', 'invalid'); end if;

  select * into v_event from public.events e where e.id = v_ticket.event_id;
  v_previous_status := v_ticket.status::text;

  if v_event.status <> 'active' then return jsonb_build_object('result', 'inactive_event'); end if;
  if v_ticket.status = 'cancelled' then return jsonb_build_object('result', 'cancelled'); end if;
  if v_ticket.status = 'expired' then return jsonb_build_object('result', 'expired'); end if;

  if v_ticket.status = 'checked_in' then
    select s.created_at, p.full_name into v_original_time, v_original_scanner
    from public.scans s
    left join public.profiles p on p.id = s.scanned_by
    where s.ticket_id = v_ticket.id
      and s.action in ('check_in', 'legacy_check_in')
      and s.result in ('accepted', 'ok')
    order by s.created_at asc
    limit 1;

    return jsonb_build_object(
      'result', 'already_checked_in',
      'checked_in_at', coalesce(v_original_time, v_ticket.checked_in_at),
      'confirmed_by', v_original_scanner
    );
  end if;

  if v_ticket.status = 'reserved' then
    if v_ticket.expires_at is not null and v_ticket.expires_at <= now() then
      update public.tickets set status = 'expired' where id = v_ticket.id;
      return jsonb_build_object('result', 'expired');
    end if;

    if not private.profile_has_permission(p_actor_id, 'confirm_cash_payments') then
      return jsonb_build_object('result', 'payment_required');
    end if;

    select * into v_order
    from public.orders o
    where o.id = v_ticket.order_id
    for update;
    if not found then return jsonb_build_object('result', 'invalid'); end if;

    update public.orders
    set status = 'paid', paid_at = coalesce(paid_at, v_checked_in_at)
    where id = v_order.id;

    update public.tickets
    set
      status = 'paid',
      payment_confirmed_at = v_checked_in_at,
      payment_confirmed_by = p_actor_id
    where id = v_ticket.id;

    insert into public.cash_payment_confirmations(
      order_id,
      ticket_id,
      confirmed_by,
      amount_bani,
      previous_order_status,
      reason
    ) values (
      v_order.id,
      v_ticket.id,
      p_actor_id,
      v_order.amount_bani,
      v_order.status,
      'Plată cash confirmată automat la scanarea biletului'
    ) on conflict (order_id) do nothing;

    insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (
      p_actor_id,
      'ticket.cash_payment_confirmed',
      'ticket',
      v_ticket.id::text,
      jsonb_build_object(
        'order_id', v_order.id,
        'amount_bani', v_order.amount_bani,
        'source', 'ticket_scan'
      )
    );

    v_payment_confirmed := true;
  end if;

  update public.tickets
  set status = 'checked_in', checked_in_at = v_checked_in_at
  where id = v_ticket.id and status = 'paid';

  insert into public.scans(
    event_id,
    ticket_id,
    scanned_by,
    result,
    action,
    token_fingerprint,
    previous_status,
    new_status,
    device_metadata
  ) values (
    v_ticket.event_id,
    v_ticket.id,
    p_actor_id,
    'accepted',
    'check_in',
    p_token_fingerprint,
    v_previous_status,
    'checked_in',
    coalesce(p_device_metadata, '{}'::jsonb)
  )
  on conflict do nothing
  returning id into v_scan_id;

  if v_scan_id is null then
    return jsonb_build_object('result', 'already_checked_in');
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    p_actor_id,
    'ticket.checked_in',
    'ticket',
    v_ticket.id::text,
    jsonb_build_object(
      'event_id', v_ticket.event_id,
      'scan_id', v_scan_id,
      'payment_confirmed', v_payment_confirmed
    )
  );

  return jsonb_build_object(
    'result', 'accepted',
    'checked_in_at', v_checked_in_at,
    'payment_confirmed', v_payment_confirmed
  );
end;
$$;

revoke all on function public.check_in_ticket(uuid, uuid, text, jsonb)
from public, anon, authenticated;
grant execute on function public.check_in_ticket(uuid, uuid, text, jsonb)
to service_role;
