-- =============================================================================
-- SavaPass — full public-schema SNAPSHOT (disaster recovery / onboarding)
-- Captured 2026-06-28 from the live project (ref shzyvrojbtbczqqoilip) via the
-- Supabase MCP catalog (pg_catalog / information_schema / pg_get_*).
--
-- WHY THIS FILE EXISTS
--   The foundational tables (events/orders/tickets/scans/profiles/the enums/the
--   event_stats view) were applied directly via dashboard/MCP and were never in
--   `supabase/migrations/`, so the DB could not be rebuilt from the repo. This
--   file captures the complete current schema so it CAN be.
--
-- HOW TO USE
--   Disaster recovery / fresh empty DB: run this whole file once on an empty
--   Postgres (it builds extensions → enums → tables → indexes → functions →
--   view → RLS). It is a SNAPSHOT, not a migration.
--
-- IMPORTANT — this is intentionally NOT in `supabase/migrations/`.
--   The 5 files in supabase/migrations/ (roles, event-status swap, membership)
--   already create PART of this schema. Putting a full snapshot in migrations/
--   would make `supabase db reset` double-apply and error. To promote this to
--   the canonical reset baseline: (1) get the DB connection string and run a
--   real `supabase db dump` to cross-check this snapshot, (2) make it
--   00000000000000_init.sql, (3) reconcile/neutralize the 5 incrementals, and
--   (4) verify with `supabase db reset` against a throwaway/branch DB. Until
--   that reset-test is done, treat this as reference, not the source of truth.
--
-- NOTE: Supabase preinstalls pgcrypto/uuid-ossp and the auth schema; the FKs
--   below reference auth.users, which exists on any Supabase project.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- ── Enums ────────────────────────────────────────────────────────────────────
create type public.event_status     as enum ('draft', 'active', 'past');
create type public.order_status     as enum ('pending', 'paid', 'failed', 'refunded');
create type public.ticket_status    as enum ('valid', 'in', 'used', 'void');
create type public.scan_result      as enum ('ok', 'already_in', 'already_used', 'invalid', 'void_ticket');
create type public.staff_role       as enum ('admin', 'scanner', 'statistici');
create type public.applicant_status as enum ('submitted', 'reviewing', 'interview_invited', 'interview_scheduled', 'accepted', 'rejected');

-- ── profiles (staff; 1:1 with auth.users) ────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       public.staff_role not null default 'scanner',
  created_at timestamptz not null default now(),
  email      text
);

-- ── events ───────────────────────────────────────────────────────────────────
create table public.events (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      text not null,
  subtitle   text,
  starts_at  timestamptz not null,
  doors      text not null default '19:00',
  date_label text not null,
  date_long  text not null,
  venue      text not null,
  venue_line text,
  price_bani integer not null check (price_bani >= 0),
  capacity   integer not null check (capacity > 0),
  status     public.event_status not null default 'draft',
  accent     text,
  photo_url  text,
  about      text,
  program    jsonb not null default '[]'::jsonb,
  perks      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
-- At most one active event at a time.
create unique index one_active_event on public.events (status) where (status = 'active'::public.event_status);

-- ── orders ───────────────────────────────────────────────────────────────────
create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  event_id              uuid not null references public.events(id),
  buyer_name            text not null,
  buyer_email           text not null,
  quantity              integer not null default 1 check (quantity >= 1 and quantity <= 4),
  amount_bani           integer not null,
  currency              text not null default 'ron',
  stripe_session_id     text unique,
  stripe_payment_intent text,
  status                public.order_status not null default 'pending',
  created_at            timestamptz not null default now(),
  paid_at               timestamptz,
  user_id               uuid references auth.users(id) on delete set null
);

-- ── tickets ──────────────────────────────────────────────────────────────────
create table public.tickets (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id),
  event_id      uuid not null references public.events(id),
  code          text not null unique,
  qr_token      text not null unique,
  holder_name   text not null,
  holder_email  text not null,
  status        public.ticket_status not null default 'valid',
  issued_at     timestamptz not null default now(),
  checked_in_at timestamptz,
  user_id       uuid references auth.users(id) on delete set null
);
create index tickets_event_idx on public.tickets (event_id, status);

-- ── scans ────────────────────────────────────────────────────────────────────
create table public.scans (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id),
  ticket_id  uuid references public.tickets(id),
  scanned_by uuid not null references public.profiles(id),
  result     public.scan_result not null,
  created_at timestamptz not null default now()
);
create index scans_event_time_idx on public.scans (event_id, created_at desc);

-- ── membership_applications (Devino membru) ──────────────────────────────────
create table public.membership_applications (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  full_name    text not null,
  email        text not null,
  phone        text not null,
  grade        text,
  motivation   text not null,
  strength     text,
  availability text,
  status       text not null default 'new' check (status = any (array['new','reviewing','interview','accepted','declined'])),
  source       text not null default 'web'
);
create index membership_applications_created_at_idx on public.membership_applications (created_at desc);

-- ── applicants (orphan from v2/v3 exploration — empty, unreferenced; kept for fidelity) ──
create table public.applicants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  school     text,
  email      text not null,
  track      text,
  status     public.applicant_status not null default 'submitted',
  slot       timestamptz,
  applied_at timestamptz not null default now()
);

-- ── Functions (SECURITY DEFINER; gate every RLS policy) ──────────────────────
create or replace function public.is_staff()
  returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists (select 1 from profiles where id = auth.uid()); $$;

create or replace function public.is_admin()
  returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin'); $$;

create or replace function public.admin_set_event_status(target_id uuid, target_status public.event_status)
  returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if target_status = 'active' then
    update public.events set status = 'past' where status = 'active' and id <> target_id;
  end if;
  update public.events set status = target_status where id = target_id;
  if not found then
    raise exception 'event_not_found';
  end if;
end;
$$;

-- ── View: event_stats (sold / checked_in per event) ──────────────────────────
create view public.event_stats as
  select e.id as event_id,
         count(t.id) filter (where t.status <> 'void'::public.ticket_status) as sold,
         count(t.id) filter (where t.status = any (array['in'::public.ticket_status, 'used'::public.ticket_status])) as checked_in
  from public.events e
  left join public.tickets t on t.event_id = e.id
  group by e.id;

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles                enable row level security;
alter table public.events                  enable row level security;
alter table public.orders                  enable row level security;
alter table public.tickets                 enable row level security;
alter table public.scans                   enable row level security;
alter table public.membership_applications enable row level security;
alter table public.applicants              enable row level security;

-- profiles: own row or admin
create policy profiles_read on public.profiles for select to public using ((id = auth.uid()) or is_admin());

-- events: public reads active/past; admin writes
create policy events_read  on public.events for select to public using ((status = any (array['active'::public.event_status,'past'::public.event_status])) or is_staff());
create policy events_write on public.events for all    to public using (is_admin()) with check (is_admin());

-- orders / tickets / scans: staff read; ticket buyer can read own by email; staff scan-insert
create policy orders_staff_read   on public.orders  for select to public using (is_staff());
create policy tickets_staff_read  on public.tickets for select to public using (is_staff());
create policy tickets_buyer_read  on public.tickets for select to authenticated using ((auth.jwt() ->> 'email') = holder_email);
create policy scans_staff_read    on public.scans   for select to public using (is_staff());
create policy scans_staff_insert  on public.scans   for insert to public with check ((scanned_by = auth.uid()) and (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['admin'::public.staff_role,'scanner'::public.staff_role]))));

-- membership_applications: staff read, admin update (inserts go through the service role)
create policy "staff can read membership applications"   on public.membership_applications for select to authenticated using (is_staff());
create policy "admins can update membership applications" on public.membership_applications for update to authenticated using (is_admin()) with check (is_admin());

-- applicants (orphan): anon insert, staff read/update
create policy applicants_insert on public.applicants for insert to public with check (true);
create policy applicants_read   on public.applicants for select to public using (is_staff());
create policy applicants_update on public.applicants for update to public using (is_staff());

-- NOTE: orders/tickets/events writes are intentionally NOT exposed via RLS to
-- anon/authenticated — every write goes through the service-role admin client
-- (checkout action, stripe webhook, admin tools), which bypasses RLS by design.
