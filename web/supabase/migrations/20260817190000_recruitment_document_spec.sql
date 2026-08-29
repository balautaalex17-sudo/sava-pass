-- Recruitment 2026–2027: document-backed form, scoring and interview committee data.

alter table public.application_evaluations
  add column if not exists question_scores jsonb not null default '{}'::jsonb,
  add column if not exists base_score numeric(4,1),
  add column if not exists bonus_points numeric(4,1) not null default 0;

alter table public.application_evaluations
  drop constraint if exists application_evaluations_base_score_check;
alter table public.application_evaluations
  add constraint application_evaluations_base_score_check
  check (base_score is null or (base_score >= 0 and base_score <= 6));
alter table public.application_evaluations
  drop constraint if exists application_evaluations_bonus_points_check;
alter table public.application_evaluations
  add constraint application_evaluations_bonus_points_check
  check (bonus_points >= 0 and bonus_points <= 2);

alter table public.interview_evaluations
  add column if not exists question_scores jsonb not null default '{}'::jsonb,
  add column if not exists category_scores jsonb not null default '{}'::jsonb,
  add column if not exists selected_sets jsonb not null default '{}'::jsonb,
  add column if not exists score numeric(4,1),
  add column if not exists red_flag boolean not null default false;

alter table public.interview_evaluations
  drop constraint if exists interview_evaluations_score_check;
alter table public.interview_evaluations
  add constraint interview_evaluations_score_check
  check (score is null or (score >= 0 and score <= 40));

alter table public.interview_interviewers
  add column if not exists committee_role text;
alter table public.interview_interviewers
  drop constraint if exists interview_interviewers_committee_role_check;
alter table public.interview_interviewers
  add constraint interview_interviewers_committee_role_check
  check (committee_role is null or committee_role in ('board','hr','pr','note_taker'));
create unique index if not exists interview_interviewers_committee_role_key
  on public.interview_interviewers(interview_id, committee_role)
  where committee_role is not null;

alter table public.interviews
  add column if not exists arrival_status text not null default 'pending';
alter table public.interviews
  drop constraint if exists interviews_arrival_status_check;
alter table public.interviews
  add constraint interviews_arrival_status_check
  check (arrival_status in ('pending','on_time','late','absent'));

update public.recruitment_campaigns
set
  title = 'Recrutare Interact Sf. Sava · 2026–2027',
  eyebrow = 'Recrutare 2026–2027',
  intro = 'Procesul de recrutare pentru mandatul 2026–2027: formular online, interviu fizic și decizie Board.',
  status = 'open',
  opens_at = '2026-09-06 21:00:00+00',
  closes_at = '2026-09-24 20:59:59+00',
  closed_message = 'Înscrierile pentru mandatul 2026–2027 sunt închise. Urmărește site-ul pentru următoarea perioadă de recrutare.',
  updated_at = now()
where slug = 'generatia-2026-2027';

do $$
declare
  v_campaign uuid;
  v_form uuid;
begin
  select id into v_campaign from public.recruitment_campaigns where slug = 'generatia-2026-2027' limit 1;
  select id into v_form
  from public.recruitment_forms
  where campaign_id = v_campaign and version = 2
  limit 1;

  if v_form is null then
    insert into public.recruitment_forms (campaign_id, title, version, status)
    values (v_campaign, 'Formular recrutare Interact Sf. Sava · 2026–2027', 2, 'active')
    returning id into v_form;
  else
    update public.recruitment_forms
    set title = 'Formular recrutare Interact Sf. Sava · 2026–2027', status = 'active'
    where id = v_form;
  end if;

  update public.recruitment_forms
  set status = 'archived', updated_at = now()
  where campaign_id = v_campaign and id <> v_form;

  insert into public.recruitment_fields (form_id, key, source_header, label, type, required, position, is_system)
  values
    (v_form, 'timestamp', 'Timestamp', 'Timestamp', 'datetime', false, 0, true),
    (v_form, 'respondent_email', 'Email address', 'Email address', 'email', false, 1, true),
    (v_form, 'full_name', 'Nume și prenume', 'Nume și prenume', 'text', true, 2, true),
    (v_form, 'email', 'Email', 'Email', 'email', true, 3, true),
    (v_form, 'phone', 'Număr de telefon', 'Număr de telefon', 'phone', true, 4, true),
    (v_form, 'grade', 'Clasa', 'Clasa (și litera + specializare)', 'text', true, 5, true),
    (v_form, 'about_you', 'Întrebarea 1', 'Care este un lucru despre tine pe care oamenii îl înțeleg abia după ce ajung să te cunoască mai bine?', 'long_text', true, 6, false),
    (v_form, 'mistake', 'Întrebarea 2', 'Povestește-ne despre o situație în care ai greșit. Ce ai făcut după ce ți-ai dat seama?', 'long_text', true, 7, false),
    (v_form, 'team_priority', 'Întrebarea 3', 'Ce este mai important într-o echipă: să îți respecți promisiunea sau să obții cel mai bun rezultat posibil? Ce faci când cele două intră în conflict?', 'long_text', true, 8, false),
    (v_form, 'club_exchange', 'Întrebarea 4', 'Ce crezi că poți oferi tu clubului și ce speri să primești de la Interact Sf. Sava?', 'long_text', true, 9, false),
    (v_form, 'promote_event', 'Întrebarea 5', 'În perioada următoare se va desfășura un eveniment important pentru clubul nostru, dar ne-am dat seama că nu avem așa multe înscrieri. Cum ai promova acest eveniment pentru elevi de liceu?', 'long_text', true, 10, false),
    (v_form, 'team_organization', 'Întrebarea 6', 'Ce sistem de organizare ai implementa în cadrul echipei tale (aprox. 3-5 oameni) într-o perioadă aglomerată?', 'long_text', true, 11, false)
  on conflict (form_id, key) do update
    set source_header = excluded.source_header,
        label = excluded.label,
        type = excluded.type,
        required = excluded.required,
        position = excluded.position,
        is_system = excluded.is_system,
        updated_at = now();
end $$;
