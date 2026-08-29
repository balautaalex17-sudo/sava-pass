-- SavaPass production workflows: recruitment, interview scheduling,
-- notifications, media curation, ticket types, and audit history.

create extension if not exists pgcrypto with schema extensions;

-- Keep updated_at consistent without relying on every caller to remember it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_interviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text = 'interviewer'
  );
$$;

-- Recruitment configuration -------------------------------------------------
create table public.recruitment_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  eyebrow text,
  intro text not null,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'closed', 'archived')),
  opens_at timestamptz,
  closes_at timestamptz,
  application_limit integer check (application_limit is null or application_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at is null or opens_at is null or closes_at > opens_at)
);

create table public.recruitment_departments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.recruitment_campaigns(id) on delete cascade,
  slug text not null,
  name text not null,
  summary text not null,
  description text,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (campaign_id, slug)
);

insert into public.recruitment_campaigns (
  slug, title, eyebrow, intro, status, opens_at, closes_at
)
values (
  'generatia-2026-2027',
  'Generația 2026–2027',
  'Devino membru',
  'Căutăm elevi care vor să transforme ideile în proiecte, evenimente și ajutor concret pentru comunitate.',
  'open',
  '2026-08-01 00:00:00+03',
  '2026-11-30 23:59:59+02'
)
on conflict (slug) do nothing;

insert into public.recruitment_departments (campaign_id, slug, name, summary, description, sort)
select c.id, d.slug, d.name, d.summary, d.description, d.sort
from public.recruitment_campaigns c
cross join (values
  ('comunicare', 'Comunicare', 'Social media, fotografie și identitate vizuală.', 'Spui povestea proiectelor clar și autentic, din teren până la publicare.', 10),
  ('proiecte-sociale', 'Proiecte sociale', 'Voluntariat, parteneriate și impact local.', 'Construiești inițiative utile împreună cu școli, ONG-uri și beneficiari.', 20),
  ('evenimente', 'Evenimente', 'Concept, producție și experiența participanților.', 'Transformi o idee într-o seară care funcționează, de la acces până la ultimul detaliu.', 30),
  ('operational', 'Finanțe & operațional', 'Bugete, sponsori și logistică.', 'Ții proiectele realiste, bine organizate și responsabile.', 40)
) as d(slug, name, summary, description, sort)
where c.slug = 'generatia-2026-2027'
on conflict (campaign_id, slug) do nothing;

-- Upgrade the existing application table instead of creating a competing one.
alter table public.membership_applications
  add column if not exists campaign_id uuid references public.recruitment_campaigns(id) on delete set null,
  add column if not exists public_token uuid not null default gen_random_uuid(),
  add column if not exists submitted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists reviewer_id uuid references public.profiles(id) on delete set null,
  add column if not exists private_notes text,
  add column if not exists score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  add column if not exists result_message text;

update public.membership_applications
set status = case status
  when 'new' then 'submitted'
  when 'reviewing' then 'under_review'
  when 'interview' then 'selected_for_interview'
  when 'declined' then 'rejected'
  else status
end,
submitted_at = coalesce(submitted_at, created_at),
campaign_id = coalesce(
  campaign_id,
  (select id from public.recruitment_campaigns where slug = 'generatia-2026-2027')
);

alter table public.membership_applications
  drop constraint if exists membership_applications_status_check;
alter table public.membership_applications
  alter column status set default 'submitted';
alter table public.membership_applications
  add constraint membership_applications_status_check check (
    status in (
      'draft', 'submitted', 'under_review', 'selected_for_interview',
      'interview_scheduled', 'interview_completed', 'accepted',
      'waiting_list', 'rejected'
    )
  );

create unique index if not exists membership_applications_public_token_idx
  on public.membership_applications(public_token);
create index if not exists membership_applications_campaign_status_idx
  on public.membership_applications(campaign_id, status, created_at desc);

create table public.application_status_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.membership_applications(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  visible_to_candidate boolean not null default true,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index application_status_events_application_idx
  on public.application_status_events(application_id, created_at);

insert into public.application_status_events (application_id, from_status, to_status, note)
select id, null, status, 'Aplicație importată în noul flux SavaPass.'
from public.membership_applications
where not exists (
  select 1 from public.application_status_events e where e.application_id = membership_applications.id
);

-- Interview scheduling -------------------------------------------------------
create table public.interview_periods (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.recruitment_campaigns(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  slot_duration_minutes integer not null default 20
    check (slot_duration_minutes between 10 and 180),
  default_location text,
  default_meeting_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.interview_slots (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.interview_periods(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  room text,
  meeting_url text,
  capacity integer not null default 1 check (capacity between 1 and 20),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create unique index interview_slots_unique_room_time
  on public.interview_slots(period_id, starts_at, coalesce(room, ''));
create index interview_slots_period_time_idx
  on public.interview_slots(period_id, starts_at);

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.membership_applications(id) on delete cascade,
  slot_id uuid references public.interview_slots(id) on delete set null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'no_show', 'cancelled')),
  location text,
  meeting_url text,
  private_notes text,
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  decision text check (decision is null or decision in ('accepted', 'waiting_list', 'rejected')),
  scheduled_at timestamptz,
  rescheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index interviews_one_active_per_application
  on public.interviews(application_id) where status <> 'cancelled';
create index interviews_slot_idx on public.interviews(slot_id, status);

create table public.interview_interviewers (
  interview_id uuid not null references public.interviews(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  slot_id uuid not null references public.interview_slots(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (interview_id, profile_id),
  unique (profile_id, slot_id)
);
create index interview_interviewers_profile_idx
  on public.interview_interviewers(profile_id, assigned_at desc);

create table public.interview_changes (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  old_slot_id uuid references public.interview_slots(id) on delete set null,
  new_slot_id uuid references public.interview_slots(id) on delete set null,
  reason text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.can_access_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.interviews i
    join public.interview_interviewers ii on ii.interview_id = i.id
    where i.application_id = target_application_id
      and ii.profile_id = auth.uid()
  );
$$;

-- Notification templates and delivery log -----------------------------------
create table public.notification_templates (
  key text primary key,
  category text not null,
  channel text not null default 'email' check (channel in ('email', 'in_app', 'sms')),
  label text not null,
  subject_template text,
  body_template text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.membership_applications(id) on delete cascade,
  interview_id uuid references public.interviews(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  recipient_email text not null,
  recipient_name text,
  channel text not null default 'email' check (channel in ('email', 'in_app', 'sms')),
  template_key text references public.notification_templates(key) on delete set null,
  subject text,
  body text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  provider_id text,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_due_idx on public.notifications(status, scheduled_for);
create index notifications_application_idx on public.notifications(application_id, created_at desc);
create index notifications_ticket_idx on public.notifications(ticket_id, created_at desc);

insert into public.notification_templates (key, category, label, subject_template, body_template)
values
  ('application_submitted', 'recruitment', 'Aplicație trimisă', 'Am primit aplicația ta — SavaPass', 'Salut, {{first_name}}. Aplicația ta a ajuns la echipa Interact Sf. Sava. Poți urmări statusul aici: {{status_url}}'),
  ('interview_invitation', 'interview', 'Invitație la interviu', 'Invitație la interviu — SavaPass', 'Salut, {{first_name}}. Ai fost selectat(ă) pentru etapa de interviu. Revenim cu ora confirmată.'),
  ('interview_scheduled', 'interview', 'Interviu programat', 'Interviul tău este programat — SavaPass', 'Salut, {{first_name}}. Interviul tău este programat pentru {{interview_time}}, la {{interview_place}}.'),
  ('interview_changed', 'interview', 'Interviu modificat', 'Programarea interviului s-a schimbat — SavaPass', 'Salut, {{first_name}}. Noua programare este {{interview_time}}, la {{interview_place}}.'),
  ('interview_reminder', 'interview', 'Reminder interviu', 'Reminder: interviul tău — SavaPass', 'Interviul tău începe la {{interview_time}}. Te așteptăm la {{interview_place}}.'),
  ('application_accepted', 'recruitment', 'Acceptat', 'Bun venit în Interact Sf. Sava', 'Salut, {{first_name}}. Ne bucurăm să îți spunem că ai fost acceptat(ă). {{result_message}}'),
  ('application_waiting_list', 'recruitment', 'Listă de așteptare', 'Rezultatul aplicației tale — SavaPass', 'Salut, {{first_name}}. Aplicația ta este pe lista de așteptare. {{result_message}}'),
  ('application_rejected', 'recruitment', 'Respins', 'Rezultatul aplicației tale — SavaPass', 'Salut, {{first_name}}. Îți mulțumim pentru timpul și sinceritatea ta. {{result_message}}'),
  ('ticket_confirmation', 'tickets', 'Confirmare bilet', 'Biletul tău SavaPass', 'Biletul pentru {{event_title}} este gata: {{ticket_url}}'),
  ('event_reminder', 'tickets', 'Reminder eveniment', 'Ne vedem la {{event_title}}', '{{event_title}} începe la {{event_time}}. Biletul tău: {{ticket_url}}'),
  ('ticket_update', 'tickets', 'Actualizare bilet', 'Actualizare pentru biletul tău — SavaPass', '{{ticket_message}}')
on conflict (key) do nothing;

-- Curated media library ------------------------------------------------------
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text,
  public_url text not null,
  mime_type text not null,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  orientation text not null default 'landscape'
    check (orientation in ('landscape', 'portrait', 'square')),
  source_kind text not null default 'real_photo'
    check (source_kind in ('real_photo', 'edited_photo', 'higgsfield', 'video', 'fallback')),
  category text not null default 'General'
    check (category in ('Hero', 'Events', 'Recruitment', 'Interviews', 'Members', 'Venues', 'Backgrounds', 'Motion', 'Generated', 'Archived', 'General')),
  subjects text,
  mood text,
  tags text[] not null default '{}',
  quality_score numeric(4,3) not null default 0.5 check (quality_score between 0 and 1),
  sharpness_score numeric(4,3) check (sharpness_score is null or sharpness_score between 0 and 1),
  crop_safe boolean not null default true,
  faces_visible boolean not null default false,
  focal_x numeric(4,3) not null default 0.5 check (focal_x between 0 and 1),
  focal_y numeric(4,3) not null default 0.5 check (focal_y between 0 and 1),
  alt_text text not null,
  excluded boolean not null default false,
  archived boolean not null default false,
  sha256 text,
  generation_tool text,
  generation_prompt text,
  generation_job_id text,
  poster_asset_id uuid references public.media_assets(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index media_assets_sha256_idx on public.media_assets(sha256) where sha256 is not null;
create index media_assets_recommendation_idx
  on public.media_assets(category, orientation, excluded, archived, quality_score desc);

create table public.media_placements (
  id uuid primary key default gen_random_uuid(),
  page_type text not null,
  target_id uuid,
  slot text not null,
  auto_select boolean not null default true,
  selected_asset_id uuid references public.media_assets(id) on delete set null,
  pinned_asset_id uuid references public.media_assets(id) on delete set null,
  excluded_asset_ids uuid[] not null default '{}',
  selection_reason text,
  desktop_crop jsonb not null default '{}'::jsonb,
  mobile_crop jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create unique index media_placements_target_slot_idx
  on public.media_placements(page_type, coalesce(target_id, '00000000-0000-0000-0000-000000000000'::uuid), slot);

-- Multiple ticket choices per event while keeping the original event price as fallback.
create table public.event_ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  price_bani integer not null check (price_bani >= 0),
  capacity integer not null check (capacity > 0),
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  status text not null default 'active' check (status in ('active', 'hidden', 'sold_out')),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, slug),
  check (sales_end_at is null or sales_start_at is null or sales_end_at > sales_start_at)
);

insert into public.event_ticket_types (event_id, slug, name, description, price_bani, capacity)
select id, 'acces-general', 'Acces general', 'Bilet individual pentru acces la eveniment.', price_bani, capacity
from public.events
on conflict (event_id, slug) do nothing;

alter table public.orders
  add column if not exists ticket_type_id uuid references public.event_ticket_types(id) on delete set null;
alter table public.tickets
  add column if not exists ticket_type_id uuid references public.event_ticket_types(id) on delete set null;

update public.orders o
set ticket_type_id = (
  select tt.id from public.event_ticket_types tt
  where tt.event_id = o.event_id order by tt.sort, tt.created_at limit 1
)
where ticket_type_id is null;

update public.tickets t
set ticket_type_id = coalesce(
  (select o.ticket_type_id from public.orders o where o.id = t.order_id),
  (select tt.id from public.event_ticket_types tt where tt.event_id = t.event_id order by tt.sort, tt.created_at limit 1)
)
where ticket_type_id is null;

create index orders_ticket_type_idx on public.orders(ticket_type_id, status);
create index tickets_ticket_type_idx on public.tickets(ticket_type_id, status);

-- Audit history for important admin actions ---------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);

-- updated_at triggers --------------------------------------------------------
create trigger recruitment_campaigns_updated_at
before update on public.recruitment_campaigns
for each row execute function public.set_updated_at();
create trigger interview_periods_updated_at
before update on public.interview_periods
for each row execute function public.set_updated_at();
create trigger interviews_updated_at
before update on public.interviews
for each row execute function public.set_updated_at();
create trigger membership_applications_updated_at
before update on public.membership_applications
for each row execute function public.set_updated_at();
create trigger notification_templates_updated_at
before update on public.notification_templates
for each row execute function public.set_updated_at();
create trigger notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();
create trigger media_assets_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();
create trigger media_placements_updated_at
before update on public.media_placements
for each row execute function public.set_updated_at();
create trigger event_ticket_types_updated_at
before update on public.event_ticket_types
for each row execute function public.set_updated_at();

-- RLS and explicit Data API privileges --------------------------------------
alter table public.recruitment_campaigns enable row level security;
alter table public.recruitment_departments enable row level security;
alter table public.application_status_events enable row level security;
alter table public.interview_periods enable row level security;
alter table public.interview_slots enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_interviewers enable row level security;
alter table public.interview_changes enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notifications enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_placements enable row level security;
alter table public.event_ticket_types enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "staff can read membership applications" on public.membership_applications;
drop policy if exists "admins can update membership applications" on public.membership_applications;

create policy recruitment_campaigns_public_read
on public.recruitment_campaigns for select to public
using (status in ('open', 'closed') or public.is_admin());
create policy recruitment_campaigns_admin_write
on public.recruitment_campaigns for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy recruitment_departments_public_read
on public.recruitment_departments for select to public
using (active or public.is_admin());
create policy recruitment_departments_admin_write
on public.recruitment_departments for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy applications_authorized_read
on public.membership_applications for select to authenticated
using (public.can_access_application(id));
create policy applications_admin_write
on public.membership_applications for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy application_events_authorized_read
on public.application_status_events for select to authenticated
using (public.can_access_application(application_id));
create policy application_events_admin_write
on public.application_status_events for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy interview_periods_staff_read
on public.interview_periods for select to authenticated
using (public.is_admin() or public.is_interviewer());
create policy interview_periods_admin_write
on public.interview_periods for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy interview_slots_staff_read
on public.interview_slots for select to authenticated
using (public.is_admin() or public.is_interviewer());
create policy interview_slots_admin_write
on public.interview_slots for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy interviews_authorized_read
on public.interviews for select to authenticated
using (public.can_access_application(application_id));
create policy interviews_admin_write
on public.interviews for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy interview_interviewers_authorized_read
on public.interview_interviewers for select to authenticated
using (public.is_admin() or profile_id = auth.uid());
create policy interview_interviewers_admin_write
on public.interview_interviewers for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy interview_changes_authorized_read
on public.interview_changes for select to authenticated
using (
  public.is_admin() or exists (
    select 1 from public.interview_interviewers ii
    where ii.interview_id = interview_changes.interview_id and ii.profile_id = auth.uid()
  )
);
create policy interview_changes_admin_write
on public.interview_changes for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy notification_templates_admin
on public.notification_templates for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy notifications_admin
on public.notifications for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy media_assets_admin
on public.media_assets for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy media_placements_admin
on public.media_placements for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy event_ticket_types_public_read
on public.event_ticket_types for select to public
using (
  (status = 'active' and exists (
    select 1 from public.events e
    where e.id = event_ticket_types.event_id and e.status in ('active', 'past')
  )) or public.is_staff()
);
create policy event_ticket_types_admin_write
on public.event_ticket_types for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy audit_logs_admin_read
on public.audit_logs for select to authenticated
using (public.is_admin());

revoke all on table
  public.recruitment_campaigns,
  public.recruitment_departments,
  public.application_status_events,
  public.interview_periods,
  public.interview_slots,
  public.interviews,
  public.interview_interviewers,
  public.interview_changes,
  public.notification_templates,
  public.notifications,
  public.media_assets,
  public.media_placements,
  public.event_ticket_types,
  public.audit_logs
from anon, authenticated;

grant select on table
  public.recruitment_campaigns,
  public.recruitment_departments,
  public.event_ticket_types
to anon, authenticated;

grant select on table
  public.membership_applications,
  public.application_status_events,
  public.interview_periods,
  public.interview_slots,
  public.interviews,
  public.interview_interviewers,
  public.interview_changes,
  public.notification_templates,
  public.notifications,
  public.media_assets,
  public.media_placements,
  public.audit_logs
to authenticated;

grant insert, update, delete on table
  public.recruitment_campaigns,
  public.recruitment_departments,
  public.membership_applications,
  public.application_status_events,
  public.interview_periods,
  public.interview_slots,
  public.interviews,
  public.interview_interviewers,
  public.interview_changes,
  public.notification_templates,
  public.notifications,
  public.media_assets,
  public.media_placements,
  public.event_ticket_types
to authenticated;

grant execute on function public.is_interviewer() to anon, authenticated;
grant execute on function public.can_access_application(uuid) to authenticated;

comment on table public.media_assets is
  'Pre-analysed real and generated media. Page rendering uses stored metadata only; it never triggers generation.';
comment on column public.membership_applications.public_token is
  'Unpredictable bearer token used by the candidate status page; never exposed in list views.';
