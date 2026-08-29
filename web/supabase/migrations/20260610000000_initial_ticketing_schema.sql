-- Foundational schema that existed before this repository's original migrations.
-- Every object is created only when absent. This supports a fresh local reset and
-- remains a no-op for helpers/policies that later hardening migrations retired.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

do $bootstrap$
begin
  if to_regtype('public.event_status') is null then
    create type public.event_status as enum ('draft', 'active', 'past');
  end if;
  if to_regtype('public.order_status') is null then
    create type public.order_status as enum ('pending', 'paid', 'failed', 'refunded');
  end if;
  if to_regtype('public.ticket_status') is null then
    create type public.ticket_status as enum ('valid', 'in', 'used', 'void');
  end if;
  if to_regtype('public.scan_result') is null then
    create type public.scan_result as enum ('ok', 'already_in', 'already_used', 'invalid', 'void_ticket');
  end if;
  if to_regtype('public.staff_role') is null then
    create type public.staff_role as enum ('admin', 'scanner', 'statistici');
  end if;
  if to_regtype('public.applicant_status') is null then
    create type public.applicant_status as enum (
      'submitted', 'reviewing', 'interview_invited',
      'interview_scheduled', 'accepted', 'rejected'
    );
  end if;
end
$bootstrap$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.staff_role not null default 'scanner',
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  starts_at timestamptz not null,
  doors text not null default '19:00',
  date_label text not null,
  date_long text not null,
  venue text not null,
  venue_line text,
  price_bani integer not null check (price_bani >= 0),
  capacity integer not null check (capacity > 0),
  status public.event_status not null default 'draft',
  accent text,
  photo_url text,
  about text,
  program jsonb not null default '[]'::jsonb,
  perks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists one_active_event
  on public.events(status) where status = 'active'::public.event_status;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  buyer_name text not null,
  buyer_email text not null,
  quantity integer not null default 1 check (quantity between 1 and 4),
  amount_bani integer not null,
  currency text not null default 'ron',
  stripe_session_id text unique,
  stripe_payment_intent text,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  user_id uuid references auth.users(id) on delete set null
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  event_id uuid not null references public.events(id),
  code text not null unique,
  qr_token text not null unique,
  holder_name text not null,
  holder_email text not null,
  status public.ticket_status not null default 'valid',
  issued_at timestamptz not null default now(),
  checked_in_at timestamptz,
  user_id uuid references auth.users(id) on delete set null
);

create index if not exists tickets_event_idx on public.tickets(event_id, status);

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  ticket_id uuid references public.tickets(id),
  scanned_by uuid not null references public.profiles(id),
  result public.scan_result not null,
  created_at timestamptz not null default now()
);

create index if not exists scans_event_time_idx
  on public.scans(event_id, created_at desc);

create table if not exists public.applicants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school text,
  email text not null,
  track text,
  status public.applicant_status not null default 'submitted',
  slot timestamptz,
  applied_at timestamptz not null default now()
);

do $bootstrap$
begin
  if to_regprocedure('public.is_staff()') is null
     and to_regprocedure('private.is_staff()') is null then
    execute $function$
      create function public.is_staff()
      returns boolean
      language sql
      stable
      security definer
      set search_path = ''
      as $body$
        select exists (
          select 1 from public.profiles p
          where p.id = (select auth.uid()) and p.role is not null
        );
      $body$
    $function$;
  end if;

  if to_regprocedure('public.is_admin()') is null
     and to_regprocedure('private.is_admin()') is null then
    execute $function$
      create function public.is_admin()
      returns boolean
      language sql
      stable
      security definer
      set search_path = ''
      as $body$
        select exists (
          select 1 from public.profiles p
          where p.id = (select auth.uid())
            and p.role = 'admin'::public.staff_role
        );
      $body$
    $function$;
  end if;
end
$bootstrap$;

do $bootstrap$
begin
  if to_regclass('public.event_stats') is null then
    execute $view$
      create view public.event_stats as
      select e.id as event_id,
             count(t.id) filter (where t.status <> 'void'::public.ticket_status) as sold,
             count(t.id) filter (
               where t.status = any (
                 array['in'::public.ticket_status, 'used'::public.ticket_status]
               )
             ) as checked_in
      from public.events e
      left join public.tickets t on t.event_id = e.id
      group by e.id
    $view$;
  end if;
end
$bootstrap$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;
alter table public.scans enable row level security;
alter table public.applicants enable row level security;

do $policies$
begin
  -- On an existing hardened project these helpers already live in `private`.
  -- Skip the legacy bootstrap policies instead of recreating old definitions.
  if to_regprocedure('public.is_staff()') is null
     or to_regprocedure('public.is_admin()') is null then
    return;
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_read') then
    create policy profiles_read on public.profiles for select to public
      using (id = (select auth.uid()) or public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'events' and policyname = 'events_read') then
    create policy events_read on public.events for select to public
      using (status in ('active'::public.event_status, 'past'::public.event_status) or public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'events' and policyname = 'events_write') then
    create policy events_write on public.events for all to public
      using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'orders_staff_read') then
    create policy orders_staff_read on public.orders for select to public
      using (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tickets' and policyname = 'tickets_staff_read') then
    create policy tickets_staff_read on public.tickets for select to public
      using (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tickets' and policyname = 'tickets_buyer_read') then
    create policy tickets_buyer_read on public.tickets for select to authenticated
      using ((select auth.jwt() ->> 'email') = holder_email);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scans' and policyname = 'scans_staff_read') then
    create policy scans_staff_read on public.scans for select to public
      using (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scans' and policyname = 'scans_staff_insert') then
    create policy scans_staff_insert on public.scans for insert to public
      with check (
        scanned_by = (select auth.uid())
        and exists (
          select 1 from public.profiles p
          where p.id = (select auth.uid())
            and p.role in ('admin'::public.staff_role, 'scanner'::public.staff_role)
        )
      );
  end if;
  -- Do not recreate the retired anonymous applicants_insert policy. Current
  -- public recruitment uses membership_applications through a Server Action.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'applicants' and policyname = 'applicants_read') then
    create policy applicants_read on public.applicants for select to public using (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'applicants' and policyname = 'applicants_update') then
    create policy applicants_update on public.applicants for update to public
      using (public.is_staff()) with check (public.is_staff());
  end if;
end
$policies$;
