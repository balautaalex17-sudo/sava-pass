create schema if not exists private;
revoke all on schema private from public;

-- Profiles remain the single identity extension for Supabase Auth users.
alter table public.profiles
  alter column role drop default,
  alter column role drop not null,
  add column if not exists membership_status text not null default 'inactive',
  add column if not exists member_ref uuid not null default gen_random_uuid(),
  add column if not exists phone text,
  add column if not exists grade text,
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_membership_status_check;
alter table public.profiles add constraint profiles_membership_status_check check (
  membership_status in ('active', 'inactive', 'suspended', 'alumni')
);
create unique index if not exists profiles_member_ref_key on public.profiles(member_ref);
create index if not exists profiles_membership_status_idx on public.profiles(membership_status);

-- Existing staff are board members and therefore active members too.
update public.profiles
set membership_status = 'active'
where role is not null and membership_status = 'inactive';

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.permissions (
  key text primary key,
  label text not null,
  category text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_key text not null check (role_key in ('member', 'admin', 'scanner', 'statistici', 'interviewer')),
  permission_key text not null references public.permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_key, permission_key)
);

create table if not exists public.profile_permission_overrides (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  allowed boolean not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (profile_id, permission_key)
);

insert into public.permissions (key, label, category, description) values
  ('view_member_dashboard', 'Deschide panoul de membru', 'Membru', 'Acces la experiența de membru.'),
  ('view_own_attendance', 'Vezi prezența proprie', 'Membru', 'Vezi doar istoricul propriu de prezență.'),
  ('display_member_qr', 'Afișează codul QR de membru', 'Membru', 'Generează QR-ul temporar de prezență.'),
  ('update_own_profile', 'Actualizează profilul propriu', 'Membru', 'Modifică numai câmpurile de profil permise.'),
  ('view_board_dashboard', 'Deschide spațiul board', 'Board', 'Acces la rezumatul operațional.'),
  ('scan_meeting_attendance', 'Scanează prezența', 'Prezență', 'Confirmă prezența membrilor la întâlniri.'),
  ('view_attendance_roster', 'Vezi catalogul de prezență', 'Prezență', 'Vezi membrii și starea lor la întâlniri.'),
  ('manage_meetings', 'Administrează întâlniri', 'Prezență', 'Creează și actualizează întâlniri.'),
  ('correct_attendance', 'Corectează prezența', 'Prezență', 'Aplică o corecție motivată, fără ștergere.'),
  ('scan_event_tickets', 'Scanează bilete', 'Bilete', 'Inspectează și validează bilete de eveniment.'),
  ('confirm_cash_payments', 'Confirmă plăți cash', 'Bilete', 'Confirmă încasarea cash înainte de check-in.'),
  ('view_recruitment_signups', 'Vezi înscrierile', 'Recrutare', 'Vezi tabelul și răspunsurile candidaților.'),
  ('manage_recruitment_signups', 'Administrează înscrierile', 'Recrutare', 'Actualizează starea și evaluarea candidaturilor.'),
  ('import_recruitment_signups', 'Importă înscrieri', 'Recrutare', 'Previzualizează și execută importuri CSV/XLSX.'),
  ('view_scan_audit_log', 'Vezi istoricul scanărilor', 'Audit', 'Vezi încercările de scanare și actorii.'),
  ('manage_members', 'Administrează membri', 'Administrare', 'Invită membri și schimbă starea de membru.'),
  ('manage_permissions', 'Administrează permisiuni', 'Administrare', 'Schimbă permisiunile rolurilor și excepțiile individuale.')
on conflict (key) do update set
  label = excluded.label,
  category = excluded.category,
  description = excluded.description;

insert into public.role_permissions (role_key, permission_key)
select 'member', key from public.permissions
where key in ('view_member_dashboard', 'view_own_attendance', 'display_member_qr', 'update_own_profile')
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'scanner', key from public.permissions
where key in (
  'view_member_dashboard', 'view_own_attendance', 'display_member_qr', 'update_own_profile',
  'view_board_dashboard', 'scan_meeting_attendance', 'view_attendance_roster',
  'scan_event_tickets', 'view_scan_audit_log'
)
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'statistici', key from public.permissions
where key in (
  'view_member_dashboard', 'view_own_attendance', 'display_member_qr', 'update_own_profile',
  'view_board_dashboard', 'view_attendance_roster', 'view_scan_audit_log'
)
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'interviewer', key from public.permissions
where key in (
  'view_member_dashboard', 'view_own_attendance', 'display_member_qr', 'update_own_profile',
  'view_board_dashboard', 'view_recruitment_signups', 'manage_recruitment_signups'
)
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'admin', key from public.permissions
on conflict do nothing;

create or replace function private.profile_has_permission(
  p_profile_id uuid,
  p_permission_key text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_override boolean;
  v_role public.staff_role;
  v_status text;
begin
  select o.allowed into v_override
  from public.profile_permission_overrides o
  where o.profile_id = p_profile_id and o.permission_key = p_permission_key;

  if found then
    return v_override;
  end if;

  select p.role, p.membership_status into v_role, v_status
  from public.profiles p
  where p.id = p_profile_id;

  if not found or v_status <> 'active' then
    return false;
  end if;

  if v_role = 'admin'::public.staff_role then
    return true;
  end if;

  return exists (
    select 1 from public.role_permissions rp
    where rp.permission_key = p_permission_key
      and (rp.role_key = 'member' or rp.role_key = v_role::text)
  );
end;
$$;

create or replace function private.has_permission(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.profile_has_permission((select auth.uid()), p_permission_key);
$$;

revoke all on function private.profile_has_permission(uuid, text) from public;
revoke all on function private.has_permission(text) from public;
grant usage on schema private to authenticated, service_role;
grant execute on function private.has_permission(text) to authenticated, service_role;
grant execute on function private.profile_has_permission(uuid, text) to service_role;

-- Existing helper semantics must not turn every normal member profile into staff.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role is not null
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'::public.staff_role
  );
$$;

revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_staff() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;

alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profile_permission_overrides enable row level security;

revoke all on public.permissions, public.role_permissions, public.profile_permission_overrides from anon, authenticated;
grant all on public.permissions, public.role_permissions, public.profile_permission_overrides to service_role;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or private.has_permission('manage_members')
  or private.has_permission('view_attendance_roster')
);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()) and private.has_permission('update_own_profile'))
with check (id = (select auth.uid()) and private.has_permission('update_own_profile'));

revoke update on public.profiles from authenticated;
grant update (full_name, phone, grade, avatar_url) on public.profiles to authenticated;

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 160),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text not null check (char_length(btrim(location)) between 2 and 240),
  attendance_opens_at timestamptz not null,
  attendance_closes_at timestamptz not null,
  status text not null default 'draft' check (
    status in ('draft', 'upcoming', 'attendance_open', 'finished', 'cancelled')
  ),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (attendance_closes_at > attendance_opens_at)
);

create index if not exists meetings_starts_at_idx on public.meetings(starts_at desc);
create index if not exists meetings_status_starts_idx on public.meetings(status, starts_at);
drop trigger if exists meetings_updated_at on public.meetings;
create trigger meetings_updated_at
before update on public.meetings
for each row execute function public.set_updated_at();

create table if not exists public.attendance_scans (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id),
  member_id uuid references public.profiles(id),
  scanner_user_id uuid not null references public.profiles(id),
  token_fingerprint text not null check (char_length(token_fingerprint) = 64),
  result text not null check (
    result in (
      'accepted', 'already_present', 'expired_token', 'invalid_token',
      'wrong_qr_type', 'inactive_member', 'attendance_closed',
      'self_scan_blocked', 'unauthorized', 'error'
    )
  ),
  error_code text,
  scanned_at timestamptz not null default now(),
  device_metadata jsonb not null default '{}'::jsonb
);

create index if not exists attendance_scans_meeting_time_idx
  on public.attendance_scans(meeting_id, scanned_at desc);
create index if not exists attendance_scans_scanner_time_idx
  on public.attendance_scans(scanner_user_id, scanned_at desc);

create table if not exists public.meeting_attendance (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id),
  member_id uuid not null references public.profiles(id),
  status text not null default 'present' check (status in ('present', 'reversed')),
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid not null references public.profiles(id),
  scan_id uuid references public.attendance_scans(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, member_id)
);

create index if not exists meeting_attendance_member_time_idx
  on public.meeting_attendance(member_id, checked_in_at desc);
create index if not exists meeting_attendance_meeting_status_idx
  on public.meeting_attendance(meeting_id, status);
drop trigger if exists meeting_attendance_updated_at on public.meeting_attendance;
create trigger meeting_attendance_updated_at
before update on public.meeting_attendance
for each row execute function public.set_updated_at();

create table if not exists public.attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.meeting_attendance(id),
  meeting_id uuid not null references public.meetings(id),
  member_id uuid not null references public.profiles(id),
  previous_status text not null,
  new_status text not null check (new_status in ('present', 'reversed')),
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  actor_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists attendance_corrections_meeting_time_idx
  on public.attendance_corrections(meeting_id, created_at desc);

create table if not exists public.scan_rate_limits (
  actor_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null,
  window_started_at timestamptz not null,
  attempts integer not null default 1 check (attempts > 0),
  updated_at timestamptz not null default now(),
  primary key (actor_id, scope, window_started_at)
);

alter table public.meetings enable row level security;
alter table public.meeting_attendance enable row level security;
alter table public.attendance_scans enable row level security;
alter table public.attendance_corrections enable row level security;
alter table public.scan_rate_limits enable row level security;

revoke all on public.meetings, public.meeting_attendance, public.attendance_scans,
  public.attendance_corrections, public.scan_rate_limits from anon, authenticated;
grant select on public.meetings, public.meeting_attendance to authenticated;
grant all on public.meetings, public.meeting_attendance, public.attendance_scans,
  public.attendance_corrections, public.scan_rate_limits to service_role;

create policy meetings_member_read on public.meetings
for select to authenticated
using (
  (status <> 'draft' and private.has_permission('view_member_dashboard'))
  or private.has_permission('manage_meetings')
);

create policy attendance_own_read on public.meeting_attendance
for select to authenticated
using (
  (member_id = (select auth.uid()) and private.has_permission('view_own_attendance'))
  or private.has_permission('view_attendance_roster')
);

create policy attendance_scans_authorized_read on public.attendance_scans
for select to authenticated
using (private.has_permission('view_scan_audit_log'));

create policy attendance_corrections_authorized_read on public.attendance_corrections
for select to authenticated
using (
  private.has_permission('view_scan_audit_log')
  or private.has_permission('correct_attendance')
);

grant select on public.attendance_scans, public.attendance_corrections to authenticated;

create or replace function public.consume_dashboard_rate_limit(
  p_actor_id uuid,
  p_scope text,
  p_limit integer default 45,
  p_window_seconds integer default 60
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
  if p_limit < 1 or p_window_seconds < 1 or p_window_seconds > 3600 then
    return false;
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_actor_id) then
    return false;
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.scan_rate_limits(actor_id, scope, window_started_at, attempts)
  values (p_actor_id, left(p_scope, 80), v_window, 1)
  on conflict (actor_id, scope, window_started_at)
  do update set attempts = public.scan_rate_limits.attempts + 1, updated_at = now()
  returning attempts into v_attempts;

  return v_attempts <= p_limit;
end;
$$;

create or replace function public.record_meeting_attendance(
  p_meeting_id uuid,
  p_member_ref uuid,
  p_scanner_user_id uuid,
  p_token_fingerprint text,
  p_device_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting public.meetings%rowtype;
  v_member public.profiles%rowtype;
  v_attendance public.meeting_attendance%rowtype;
  v_scan_id uuid;
  v_confirmer_name text;
begin
  if not private.profile_has_permission(p_scanner_user_id, 'scan_meeting_attendance') then
    return jsonb_build_object('result', 'unauthorized');
  end if;

  select * into v_meeting from public.meetings m where m.id = p_meeting_id;
  if not found then
    return jsonb_build_object('result', 'attendance_closed');
  end if;

  select * into v_member from public.profiles p where p.member_ref = p_member_ref;
  if not found or v_member.membership_status <> 'active' then
    insert into public.attendance_scans(
      meeting_id, member_id, scanner_user_id, token_fingerprint, result, error_code, device_metadata
    ) values (
      v_meeting.id, v_member.id, p_scanner_user_id,
      p_token_fingerprint, 'inactive_member', 'INACTIVE_MEMBER', coalesce(p_device_metadata, '{}'::jsonb)
    );
    return jsonb_build_object('result', 'inactive_member');
  end if;

  if v_member.id = p_scanner_user_id then
    insert into public.attendance_scans(
      meeting_id, member_id, scanner_user_id, token_fingerprint, result, error_code, device_metadata
    ) values (
      v_meeting.id, v_member.id, p_scanner_user_id, p_token_fingerprint,
      'self_scan_blocked', 'SELF_SCAN_BLOCKED', coalesce(p_device_metadata, '{}'::jsonb)
    );
    return jsonb_build_object('result', 'self_scan_blocked', 'member_name', v_member.full_name);
  end if;

  if v_meeting.status <> 'attendance_open'
    or now() < v_meeting.attendance_opens_at
    or now() > v_meeting.attendance_closes_at then
    insert into public.attendance_scans(
      meeting_id, member_id, scanner_user_id, token_fingerprint, result, error_code, device_metadata
    ) values (
      v_meeting.id, v_member.id, p_scanner_user_id, p_token_fingerprint,
      'attendance_closed', 'ATTENDANCE_CLOSED', coalesce(p_device_metadata, '{}'::jsonb)
    );
    return jsonb_build_object('result', 'attendance_closed', 'member_name', v_member.full_name);
  end if;

  insert into public.meeting_attendance(
    meeting_id, member_id, status, checked_in_at, checked_in_by
  ) values (
    v_meeting.id, v_member.id, 'present', now(), p_scanner_user_id
  )
  on conflict (meeting_id, member_id) do nothing
  returning * into v_attendance;

  if v_attendance.id is null then
    select * into v_attendance
    from public.meeting_attendance a
    where a.meeting_id = v_meeting.id and a.member_id = v_member.id;

    select p.full_name into v_confirmer_name
    from public.profiles p where p.id = v_attendance.checked_in_by;

    insert into public.attendance_scans(
      meeting_id, member_id, scanner_user_id, token_fingerprint, result, error_code, device_metadata
    ) values (
      v_meeting.id, v_member.id, p_scanner_user_id, p_token_fingerprint,
      'already_present', 'ALREADY_PRESENT', coalesce(p_device_metadata, '{}'::jsonb)
    );

    return jsonb_build_object(
      'result', 'already_present',
      'member_name', v_member.full_name,
      'member_avatar_url', v_member.avatar_url,
      'meeting_name', v_meeting.title,
      'checked_in_at', v_attendance.checked_in_at,
      'confirmed_by', v_confirmer_name
    );
  end if;

  insert into public.attendance_scans(
    meeting_id, member_id, scanner_user_id, token_fingerprint, result, device_metadata
  ) values (
    v_meeting.id, v_member.id, p_scanner_user_id, p_token_fingerprint,
    'accepted', coalesce(p_device_metadata, '{}'::jsonb)
  ) returning id into v_scan_id;

  update public.meeting_attendance set scan_id = v_scan_id where id = v_attendance.id;
  select p.full_name into v_confirmer_name from public.profiles p where p.id = p_scanner_user_id;

  return jsonb_build_object(
    'result', 'accepted',
    'member_name', v_member.full_name,
    'member_avatar_url', v_member.avatar_url,
    'membership_status', v_member.membership_status,
    'meeting_name', v_meeting.title,
    'checked_in_at', v_attendance.checked_in_at,
    'confirmed_by', v_confirmer_name
  );
end;
$$;

create or replace function public.correct_meeting_attendance(
  p_meeting_id uuid,
  p_member_id uuid,
  p_new_status text,
  p_reason text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attendance public.meeting_attendance%rowtype;
  v_previous text;
begin
  if not private.profile_has_permission(p_actor_id, 'correct_attendance') then
    return jsonb_build_object('result', 'unauthorized');
  end if;
  if p_new_status not in ('present', 'reversed') or char_length(btrim(p_reason)) < 3 then
    return jsonb_build_object('result', 'invalid');
  end if;

  select * into v_attendance from public.meeting_attendance a
  where a.meeting_id = p_meeting_id and a.member_id = p_member_id
  for update;

  if not found then
    if p_new_status = 'reversed' then
      return jsonb_build_object('result', 'not_found');
    end if;
    v_previous := 'absent';
    insert into public.meeting_attendance(
      meeting_id, member_id, status, checked_in_at, checked_in_by
    ) values (p_meeting_id, p_member_id, 'present', now(), p_actor_id)
    returning * into v_attendance;
  else
    v_previous := v_attendance.status;
    update public.meeting_attendance
    set status = p_new_status,
        checked_in_at = case when p_new_status = 'present' then now() else checked_in_at end,
        checked_in_by = case when p_new_status = 'present' then p_actor_id else checked_in_by end
    where id = v_attendance.id
    returning * into v_attendance;
  end if;

  insert into public.attendance_corrections(
    attendance_id, meeting_id, member_id, previous_status, new_status, reason, actor_id
  ) values (
    v_attendance.id, p_meeting_id, p_member_id, v_previous, p_new_status, btrim(p_reason), p_actor_id
  );

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    p_actor_id, 'attendance.corrected', 'meeting_attendance', v_attendance.id::text,
    jsonb_build_object(
      'meeting_id', p_meeting_id,
      'member_id', p_member_id,
      'previous', v_previous,
      'next', p_new_status,
      'reason', btrim(p_reason)
    )
  );

  return jsonb_build_object('result', 'corrected', 'previous', v_previous, 'next', p_new_status);
end;
$$;

create or replace function public.confirm_cash_payment(
  p_ticket_id uuid,
  p_actor_id uuid,
  p_token_fingerprint text,
  p_reason text default 'Plată cash confirmată la punctul de acces',
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
begin
  if not private.profile_has_permission(p_actor_id, 'confirm_cash_payments') then
    return jsonb_build_object('result', 'unauthorized');
  end if;

  select * into v_ticket from public.tickets t where t.id = p_ticket_id for update;
  if not found then return jsonb_build_object('result', 'invalid'); end if;
  select * into v_order from public.orders o where o.id = v_ticket.order_id for update;
  select * into v_event from public.events e where e.id = v_ticket.event_id;

  if v_event.status <> 'active' then
    return jsonb_build_object('result', 'inactive_event');
  end if;
  if v_ticket.status = 'cancelled' then return jsonb_build_object('result', 'cancelled'); end if;
  if v_ticket.status = 'expired' then return jsonb_build_object('result', 'expired'); end if;
  if v_ticket.status in ('paid', 'checked_in') then
    return jsonb_build_object('result', 'already_paid');
  end if;
  if v_ticket.expires_at is not null and v_ticket.expires_at <= now() then
    update public.tickets set status = 'expired' where id = v_ticket.id;
    return jsonb_build_object('result', 'expired');
  end if;

  update public.orders
  set status = 'paid', paid_at = coalesce(paid_at, now())
  where id = v_order.id;
  update public.tickets
  set status = 'paid', payment_confirmed_at = now(), payment_confirmed_by = p_actor_id
  where id = v_ticket.id;

  insert into public.cash_payment_confirmations(
    order_id, ticket_id, confirmed_by, amount_bani, previous_order_status, reason
  ) values (
    v_order.id, v_ticket.id, p_actor_id, v_order.amount_bani, v_order.status, btrim(p_reason)
  ) on conflict (order_id) do nothing;

  insert into public.scans(
    event_id, ticket_id, scanned_by, result, action, token_fingerprint,
    previous_status, new_status, device_metadata
  ) values (
    v_ticket.event_id, v_ticket.id, p_actor_id, 'payment_confirmed', 'confirm_cash',
    p_token_fingerprint, v_ticket.status::text, 'paid', coalesce(p_device_metadata, '{}'::jsonb)
  );

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    p_actor_id, 'ticket.cash_payment_confirmed', 'ticket', v_ticket.id::text,
    jsonb_build_object('order_id', v_order.id, 'amount_bani', v_order.amount_bani)
  );

  return jsonb_build_object('result', 'payment_confirmed', 'status', 'paid');
end;
$$;

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
  v_event public.events%rowtype;
  v_scan_id uuid;
  v_original_time timestamptz;
  v_original_scanner text;
begin
  if not private.profile_has_permission(p_actor_id, 'scan_event_tickets') then
    return jsonb_build_object('result', 'unauthorized');
  end if;

  select * into v_ticket from public.tickets t where t.id = p_ticket_id for update;
  if not found then return jsonb_build_object('result', 'invalid'); end if;
  select * into v_event from public.events e where e.id = v_ticket.event_id;

  if v_event.status <> 'active' then return jsonb_build_object('result', 'inactive_event'); end if;
  if v_ticket.status = 'cancelled' then return jsonb_build_object('result', 'cancelled'); end if;
  if v_ticket.status = 'expired' then return jsonb_build_object('result', 'expired'); end if;
  if v_ticket.status = 'reserved' then
    if v_ticket.expires_at is not null and v_ticket.expires_at <= now() then
      update public.tickets set status = 'expired' where id = v_ticket.id;
      return jsonb_build_object('result', 'expired');
    end if;
    return jsonb_build_object('result', 'payment_required');
  end if;

  if v_ticket.status = 'checked_in' then
    select s.created_at, p.full_name into v_original_time, v_original_scanner
    from public.scans s
    left join public.profiles p on p.id = s.scanned_by
    where s.ticket_id = v_ticket.id and s.action in ('check_in', 'legacy_check_in')
      and s.result in ('accepted', 'ok')
    order by s.created_at asc limit 1;
    return jsonb_build_object(
      'result', 'already_checked_in',
      'checked_in_at', coalesce(v_original_time, v_ticket.checked_in_at),
      'confirmed_by', v_original_scanner
    );
  end if;

  update public.tickets
  set status = 'checked_in', checked_in_at = now()
  where id = v_ticket.id and status = 'paid';

  insert into public.scans(
    event_id, ticket_id, scanned_by, result, action, token_fingerprint,
    previous_status, new_status, device_metadata
  ) values (
    v_ticket.event_id, v_ticket.id, p_actor_id, 'accepted', 'check_in',
    p_token_fingerprint, 'paid', 'checked_in', coalesce(p_device_metadata, '{}'::jsonb)
  )
  on conflict do nothing
  returning id into v_scan_id;

  if v_scan_id is null then
    return jsonb_build_object('result', 'already_checked_in');
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    p_actor_id, 'ticket.checked_in', 'ticket', v_ticket.id::text,
    jsonb_build_object('event_id', v_ticket.event_id, 'scan_id', v_scan_id)
  );

  return jsonb_build_object('result', 'accepted', 'checked_in_at', now());
end;
$$;

revoke all on function public.consume_dashboard_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.record_meeting_attendance(uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.correct_meeting_attendance(uuid, uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.confirm_cash_payment(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.check_in_ticket(uuid, uuid, text, jsonb) from public, anon, authenticated;

grant execute on function public.consume_dashboard_rate_limit(uuid, text, integer, integer) to service_role;
grant execute on function public.record_meeting_attendance(uuid, uuid, uuid, text, jsonb) to service_role;
grant execute on function public.correct_meeting_attendance(uuid, uuid, text, text, uuid) to service_role;
grant execute on function public.confirm_cash_payment(uuid, uuid, text, text, jsonb) to service_role;
grant execute on function public.check_in_ticket(uuid, uuid, text, jsonb) to service_role;

-- Tighten existing ticket data policies now that normal members also have profiles.
drop policy if exists orders_staff_read on public.orders;
create policy orders_board_read on public.orders
for select to authenticated
using (private.has_permission('scan_event_tickets'));

drop policy if exists tickets_staff_read on public.tickets;
create policy tickets_board_read on public.tickets
for select to authenticated
using (private.has_permission('scan_event_tickets'));

drop policy if exists scans_staff_insert on public.scans;
drop policy if exists scans_staff_read on public.scans;
create policy scans_authorized_read on public.scans
for select to authenticated
using (private.has_permission('view_scan_audit_log'));
revoke insert, update, delete on public.scans from authenticated;

create policy cash_confirmations_authorized_read on public.cash_payment_confirmations
for select to authenticated
using (
  private.has_permission('view_scan_audit_log')
  or private.has_permission('confirm_cash_payments')
);
grant select on public.cash_payment_confirmations to authenticated;

comment on table public.meeting_attendance is
  'One mutable current state per meeting/member; every correction is append-only in attendance_corrections.';
comment on table public.attendance_scans is
  'Attempt log. Stores a token fingerprint, never the complete QR token.';
