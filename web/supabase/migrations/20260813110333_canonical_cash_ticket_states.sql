-- Canonical cash-ticket lifecycle. This intentionally upgrades the existing
-- tickets/orders/scans model instead of introducing a parallel reservation model.

drop view if exists public.event_stats;

-- Scan attempts need richer, forward-compatible result codes. Keeping this as
-- checked text avoids another enum migration whenever an operational reason is added.
alter table public.scans
  alter column result type text using result::text;

drop type if exists public.scan_result;

alter table public.scans
  add column if not exists action text not null default 'legacy_check_in',
  add column if not exists token_fingerprint text,
  add column if not exists error_code text,
  add column if not exists previous_status text,
  add column if not exists new_status text,
  add column if not exists device_metadata jsonb not null default '{}'::jsonb;

alter table public.scans drop constraint if exists scans_action_check;
alter table public.scans add constraint scans_action_check check (
  action in ('inspect', 'confirm_cash', 'check_in', 'legacy_check_in')
);

alter table public.scans drop constraint if exists scans_result_check;
alter table public.scans add constraint scans_result_check check (
  result in (
    'ok', 'already_in', 'already_used', 'invalid', 'void_ticket',
    'reservation_found', 'valid_ticket', 'accepted', 'already_checked_in',
    'payment_required', 'payment_confirmed', 'already_paid', 'cancelled',
    'expired', 'wrong_qr_type', 'inactive_event', 'unauthorized', 'error'
  )
);

create index if not exists scans_ticket_created_idx
  on public.scans (ticket_id, created_at desc);
create index if not exists scans_scanner_created_idx
  on public.scans (scanned_by, created_at desc);
create unique index if not exists scans_one_accepted_check_in_per_ticket
  on public.scans (ticket_id)
  where action in ('check_in', 'legacy_check_in') and result in ('accepted', 'ok');

-- Rebuild the enum in one transaction so legacy values can be mapped cleanly.
create type public.ticket_status_v2 as enum (
  'reserved',
  'paid',
  'checked_in',
  'cancelled',
  'expired'
);

alter table public.tickets alter column status drop default;
alter table public.tickets
  alter column status type public.ticket_status_v2
  using (
    case status::text
      when 'valid' then 'paid'
      when 'in' then 'checked_in'
      when 'used' then 'checked_in'
      when 'void' then 'cancelled'
      else 'cancelled'
    end
  )::public.ticket_status_v2;

drop type public.ticket_status;
alter type public.ticket_status_v2 rename to ticket_status;

alter table public.tickets
  alter column status set default 'reserved'::public.ticket_status,
  add column if not exists expires_at timestamptz,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists payment_confirmed_by uuid references public.profiles(id);

-- A legacy "valid" ticket attached to an unpaid order is actually a reservation.
update public.tickets t
set status = 'reserved'::public.ticket_status,
    expires_at = coalesce(t.expires_at, t.issued_at + interval '48 hours')
from public.orders o
where o.id = t.order_id
  and t.status = 'paid'::public.ticket_status
  and o.amount_bani > 0
  and o.status <> 'paid'::public.order_status;

update public.tickets t
set payment_confirmed_at = coalesce(t.payment_confirmed_at, o.paid_at, t.issued_at)
from public.orders o
where o.id = t.order_id
  and t.status in ('paid'::public.ticket_status, 'checked_in'::public.ticket_status)
  and o.status = 'paid'::public.order_status;

create index if not exists tickets_status_expires_idx
  on public.tickets (status, expires_at)
  where status = 'reserved'::public.ticket_status;

create table if not exists public.cash_payment_confirmations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  ticket_id uuid not null references public.tickets(id),
  confirmed_by uuid not null references public.profiles(id),
  amount_bani integer not null check (amount_bani >= 0),
  previous_order_status public.order_status not null,
  reason text not null default 'Plată cash confirmată la punctul de acces',
  created_at timestamptz not null default now(),
  unique (order_id),
  unique (ticket_id)
);

alter table public.cash_payment_confirmations enable row level security;
revoke all on table public.cash_payment_confirmations from anon, authenticated;
grant all on table public.cash_payment_confirmations to service_role;

-- Aggregate availability remains public, but now follows the canonical states.
create view public.event_stats
with (security_invoker = true)
as
select
  e.id as event_id,
  count(t.id) filter (
    where t.status not in ('cancelled'::public.ticket_status, 'expired'::public.ticket_status)
  ) as sold,
  count(t.id) filter (
    where t.status = 'checked_in'::public.ticket_status
  ) as checked_in
from public.events e
left join public.tickets t on t.event_id = e.id
group by e.id;

revoke all on table public.event_stats from anon, authenticated;
grant select on table public.event_stats to anon, authenticated, service_role;

comment on column public.tickets.status is
  'Cash lifecycle: reserved, paid, checked_in, cancelled, or expired.';
comment on column public.scans.token_fingerprint is
  'SHA-256 fingerprint only. Complete QR tokens must never be stored.';
