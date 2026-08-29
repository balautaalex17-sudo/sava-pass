create table if not exists public.recruitment_forms (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.recruitment_campaigns(id),
  title text not null,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (title, version)
);

create table if not exists public.recruitment_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.recruitment_forms(id) on delete cascade,
  key text not null,
  source_header text not null,
  label text not null,
  type text not null check (type in ('text', 'email', 'phone', 'datetime', 'long_text', 'select', 'multi_select', 'boolean')),
  required boolean not null default false,
  position integer not null check (position >= 0),
  options jsonb not null default '[]'::jsonb,
  conditional_rules jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_id, key),
  unique (form_id, source_header),
  unique (form_id, position)
);

create table if not exists public.recruitment_imports (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.recruitment_forms(id),
  file_name text not null,
  file_sha256 text not null check (char_length(file_sha256) = 64),
  detected_headers jsonb not null,
  field_mapping jsonb not null default '{}'::jsonb,
  staged_rows jsonb not null default '[]'::jsonb,
  status text not null default 'preview' check (status in ('preview', 'imported', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  committed_at timestamptz
);

drop trigger if exists recruitment_forms_updated_at on public.recruitment_forms;
create trigger recruitment_forms_updated_at
before update on public.recruitment_forms
for each row execute function public.set_updated_at();

drop trigger if exists recruitment_fields_updated_at on public.recruitment_fields;
create trigger recruitment_fields_updated_at
before update on public.recruitment_fields
for each row execute function public.set_updated_at();

insert into public.recruitment_forms (campaign_id, title, version, status)
select (
  select c.id from public.recruitment_campaigns c
  order by (c.status = 'open') desc, c.opens_at desc nulls last, c.created_at desc
  limit 1
), 'Formular recrutare Interact Sf. Sava', 1, 'active'
on conflict (title, version) do update set
  status = 'active',
  campaign_id = coalesce(public.recruitment_forms.campaign_id, excluded.campaign_id);

-- Exact Google Sheet export headers, in exact logical order. The seventh
-- question intentionally contains a line break because the source header does.
insert into public.recruitment_fields (
  form_id, key, source_header, label, type, required, position, is_system
)
select f.id, x.key, x.source_header, x.source_header, x.type, x.required, x.position, x.is_system
from public.recruitment_forms f
cross join (values
  ('timestamp', 'Timestamp', 'datetime', false, 0, true),
  ('respondent_email', 'Email address', 'email', false, 1, true),
  ('full_name', '1. Nume și prenume', 'text', true, 2, false),
  ('email', '2. Email', 'email', true, 3, false),
  ('phone', '3. Număr de telefon', 'phone', true, 4, false),
  ('grade', '4. Clasa (menționează și litera)', 'text', true, 5, false),
  ('volunteering_impact', '5. Ai mai fost implicat/ă în activități de voluntariat până acum? Dacă răspunsul este da, au ajutat acestea la formarea ta ca persoană; Care crezi că este diferența dintre „a face voluntariat” și „a avea impact real”?', 'long_text', true, 6, false),
  ('weakness_growth', '6. Care e un defect pe care consideri că îl ai? Cum crezi că te va ajuta Interactul să-l remediezi? ', 'long_text', true, 7, false),
  ('team_conflict', '7. Cum reacționezi când lucrezi cu persoane care nu își respectă responsabilitățile?
Ai fi dispus(ă) să îți asumi vina pentru o greșeală care nu îți aparține, pentru binele echipei? Explică.', 'long_text', true, 8, false),
  ('social_project', '8. Dacă ai avea un buget limitat, dar multă influență, ce proiect social ai începe?', 'long_text', true, 9, false),
  ('time_management', '9. Dacă treci printr-o perioadă aglomerată cu multe task-uri, cum îti planifici timpul ca să reușești să le gestionezi pe toate?', 'long_text', true, 10, false),
  ('engage_youth', '10. Cum ai atrage tineri care cred că voluntariatul este „o pierdere de timp”?', 'long_text', true, 11, false),
  ('creative_inspiration', '11. Ce te inspiră cel mai mult atunci când trebuie să creezi ceva nou?', 'long_text', true, 12, false),
  ('extra_message', 'Ce întrebare crezi că ar fi trebuit să te întrebăm și nu am făcut-o? Vrei să ne mai transmiți ceva? 😊', 'long_text', false, 13, false)
) as x(key, source_header, type, required, position, is_system)
where f.title = 'Formular recrutare Interact Sf. Sava' and f.version = 1
on conflict (form_id, key) do update set
  source_header = excluded.source_header,
  label = excluded.label,
  type = excluded.type,
  required = excluded.required,
  position = excluded.position,
  is_system = excluded.is_system;

alter table public.membership_applications
  add column if not exists form_id uuid references public.recruitment_forms(id),
  add column if not exists completion_percentage integer not null default 0 check (completion_percentage between 0 and 100),
  add column if not exists is_complete boolean not null default false,
  add column if not exists missing_required_fields text[] not null default '{}'::text[],
  add column if not exists source_row_identifier text,
  add column if not exists source_payload jsonb not null default '{}'::jsonb,
  add column if not exists import_id uuid references public.recruitment_imports(id);

update public.membership_applications a
set form_id = f.id
from public.recruitment_forms f
where a.form_id is null and f.status = 'active';

alter table public.membership_applications alter column form_id set not null;

create unique index if not exists membership_applications_source_row_unique
  on public.membership_applications(source, source_row_identifier)
  where source_row_identifier is not null;
create index if not exists membership_applications_completion_idx
  on public.membership_applications(form_id, is_complete, completion_percentage);
create index if not exists recruitment_imports_created_idx
  on public.recruitment_imports(created_at desc);

create or replace function public.calculate_recruitment_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_field record;
  v_total integer := 0;
  v_answered integer := 0;
  v_missing text[] := '{}'::text[];
  v_value text;
  v_condition_value text;
  v_condition_applies boolean;
  v_operator text;
begin
  for v_field in
    select rf.key, rf.source_header, rf.label, rf.required, rf.conditional_rules
    from public.recruitment_fields rf
    where rf.form_id = new.form_id
    order by rf.position
  loop
    v_condition_applies := true;

    if v_field.conditional_rules is not null
      and jsonb_typeof(v_field.conditional_rules) = 'object'
      and v_field.conditional_rules ? 'field' then
      v_condition_value := coalesce(new.answers ->> (v_field.conditional_rules ->> 'field'), '');
      v_operator := coalesce(v_field.conditional_rules ->> 'operator', 'equals');

      v_condition_applies := case v_operator
        when 'equals' then v_condition_value = coalesce(v_field.conditional_rules ->> 'value', '')
        when 'not_equals' then v_condition_value <> coalesce(v_field.conditional_rules ->> 'value', '')
        when 'not_empty' then btrim(v_condition_value) <> ''
        when 'in' then coalesce((v_field.conditional_rules -> 'value') ? v_condition_value, false)
        else false
      end;
    end if;

    if v_field.required and v_condition_applies then
      v_total := v_total + 1;
      v_value := coalesce(
        new.answers ->> v_field.key,
        new.source_payload ->> v_field.source_header,
        ''
      );

      if btrim(v_value) = '' then
        v_missing := array_append(v_missing, v_field.label);
      else
        v_answered := v_answered + 1;
      end if;
    end if;
  end loop;

  if v_total = 0 then
    new.completion_percentage := 100;
    new.is_complete := true;
  else
    new.completion_percentage := floor((v_answered::numeric / v_total::numeric) * 100)::integer;
    new.is_complete := v_answered = v_total;
  end if;

  new.missing_required_fields := v_missing;
  return new;
end;
$$;

drop trigger if exists membership_application_completion on public.membership_applications;
create trigger membership_application_completion
before insert or update of form_id, answers, source_payload
on public.membership_applications
for each row execute function public.calculate_recruitment_completion();

-- Recompute any existing rows after installing the trigger.
update public.membership_applications set answers = answers;

alter table public.recruitment_forms enable row level security;
alter table public.recruitment_fields enable row level security;
alter table public.recruitment_imports enable row level security;

revoke all on public.recruitment_forms, public.recruitment_fields, public.recruitment_imports
from anon, authenticated;
grant all on public.recruitment_forms, public.recruitment_fields, public.recruitment_imports
to service_role;

create policy recruitment_forms_board_read on public.recruitment_forms
for select to authenticated
using (
  private.has_permission('view_recruitment_signups')
  or private.has_permission('manage_recruitment_signups')
);

create policy recruitment_fields_board_read on public.recruitment_fields
for select to authenticated
using (
  private.has_permission('view_recruitment_signups')
  or private.has_permission('manage_recruitment_signups')
);

create policy recruitment_imports_admin_read on public.recruitment_imports
for select to authenticated
using (
  created_by = (select auth.uid())
  and private.has_permission('import_recruitment_signups')
);

grant select on public.recruitment_forms, public.recruitment_fields, public.recruitment_imports
to authenticated;

drop policy if exists applications_permission_read on public.membership_applications;
create policy applications_permission_read on public.membership_applications
for select to authenticated
using (private.has_permission('view_recruitment_signups'));

drop policy if exists applications_permission_update on public.membership_applications;
create policy applications_permission_update on public.membership_applications
for update to authenticated
using (private.has_permission('manage_recruitment_signups'))
with check (private.has_permission('manage_recruitment_signups'));

comment on table public.recruitment_fields is
  'Versioned form schema. source_header preserves the exact spreadsheet header and position preserves its order.';
comment on column public.membership_applications.source_payload is
  'Original imported columns keyed by their exact source header, including unknown fields.';
comment on column public.recruitment_imports.staged_rows is
  'Server-side import preview payload. Never exposed to normal members or public caches.';
