-- Operational roles stay part of the existing profile/auth model. A board
-- member manages the operation, while scanner and interviewer remain narrow.
alter table public.role_permissions
  drop constraint if exists role_permissions_role_key_check;

alter table public.role_permissions
  add constraint role_permissions_role_key_check check (
    role_key in ('member', 'admin', 'board', 'scanner', 'statistici', 'interviewer')
  );

insert into public.permissions (key, label, category, description) values
  (
    'manage_staff_assignments',
    'Atribuie roluri operaționale',
    'Board',
    'Alege membrii activi care pot scana bilete sau evalua interviuri.'
  ),
  (
    'manage_recruitment_campaigns',
    'Controlează formularul public',
    'Recrutare',
    'Deschide sau închide formularul public și configurează mesajul afișat.'
  ),
  (
    'manage_public_events',
    'Publică evenimente',
    'Evenimente',
    'Creează, editează, activează și arhivează evenimentele de pe site.'
  )
on conflict (key) do update set
  label = excluded.label,
  category = excluded.category,
  description = excluded.description;

-- Board is operational, but cannot manage super admins or the permission matrix.
insert into public.role_permissions (role_key, permission_key)
select 'board', key
from public.permissions
where key in (
  'view_member_dashboard',
  'view_own_attendance',
  'display_member_qr',
  'update_own_profile',
  'view_board_dashboard',
  'scan_meeting_attendance',
  'view_attendance_roster',
  'manage_meetings',
  'view_recruitment_signups',
  'manage_recruitment_signups',
  'view_scan_audit_log',
  'manage_staff_assignments',
  'manage_recruitment_campaigns',
  'manage_public_events'
)
on conflict do nothing;

-- Ticket scanners only operate the ticket entrance. They no longer inherit
-- meeting-attendance or board-wide data access.
delete from public.role_permissions
where role_key = 'scanner'
  and permission_key not in (
    'view_member_dashboard',
    'view_own_attendance',
    'display_member_qr',
    'update_own_profile',
    'scan_event_tickets',
    'confirm_cash_payments'
  );

insert into public.role_permissions (role_key, permission_key)
select 'scanner', key
from public.permissions
where key in (
  'view_member_dashboard',
  'view_own_attendance',
  'display_member_qr',
  'update_own_profile',
  'scan_event_tickets',
  'confirm_cash_payments'
)
on conflict do nothing;

-- Interviewers only see candidates explicitly assigned to them. The dedicated
-- evaluation table and its RLS policies enforce the per-interviewer privacy.
delete from public.role_permissions
where role_key = 'interviewer'
  and permission_key not in (
    'view_member_dashboard',
    'view_own_attendance',
    'display_member_qr',
    'update_own_profile',
    'evaluate_interview_candidates'
  );

insert into public.role_permissions (role_key, permission_key)
select 'interviewer', key
from public.permissions
where key in (
  'view_member_dashboard',
  'view_own_attendance',
  'display_member_qr',
  'update_own_profile',
  'evaluate_interview_candidates'
)
on conflict do nothing;

-- Super admins remain complete through application and database permission
-- helpers, but explicit rows keep the matrix understandable.
insert into public.role_permissions (role_key, permission_key)
select 'admin', key from public.permissions
on conflict do nothing;

alter table public.recruitment_campaigns
  add column if not exists closed_message text not null
    default 'Înscrierile sunt închise momentan. Urmărește site-ul pentru următoarea perioadă de recrutare.',
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.recruitment_campaigns
  drop constraint if exists recruitment_campaigns_closed_message_check;

alter table public.recruitment_campaigns
  add constraint recruitment_campaigns_closed_message_check check (
    char_length(btrim(closed_message)) between 8 and 500
  );

-- One public campaign can accept applications at a time.
create unique index if not exists recruitment_campaigns_single_open_idx
  on public.recruitment_campaigns ((status))
  where status = 'open';

-- The function makes closing the previous campaign and opening the selected one
-- one atomic database operation. It is callable only by the server service role.
create or replace function public.configure_recruitment_campaign(
  p_campaign_id uuid,
  p_title text,
  p_intro text,
  p_closed_message text,
  p_status text,
  p_opens_at timestamptz,
  p_closes_at timestamptz,
  p_actor_id uuid
)
returns public.recruitment_campaigns
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.recruitment_campaigns%rowtype;
begin
  if p_status not in ('draft', 'open', 'closed', 'archived') then
    raise exception 'invalid_campaign_status';
  end if;

  if p_closes_at is not null and p_opens_at is not null and p_closes_at <= p_opens_at then
    raise exception 'invalid_campaign_window';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_actor_id and p.membership_status = 'active'
  ) then
    raise exception 'invalid_campaign_actor';
  end if;

  if p_status = 'open' then
    update public.recruitment_campaigns
    set status = 'closed', updated_at = now(), updated_by = p_actor_id
    where status = 'open' and id <> p_campaign_id;
  end if;

  update public.recruitment_campaigns
  set
    title = btrim(p_title),
    intro = btrim(p_intro),
    closed_message = btrim(p_closed_message),
    status = p_status,
    opens_at = p_opens_at,
    closes_at = p_closes_at,
    updated_at = now(),
    updated_by = p_actor_id
  where id = p_campaign_id
  returning * into v_campaign;

  if not found then
    raise exception 'campaign_not_found';
  end if;

  return v_campaign;
end;
$$;

revoke all on function public.configure_recruitment_campaign(
  uuid, text, text, text, text, timestamptz, timestamptz, uuid
) from public, anon, authenticated;

grant execute on function public.configure_recruitment_campaign(
  uuid, text, text, text, text, timestamptz, timestamptz, uuid
) to service_role;

comment on function public.configure_recruitment_campaign(
  uuid, text, text, text, text, timestamptz, timestamptz, uuid
) is 'Server-only atomic control for the public recruitment campaign state.';
