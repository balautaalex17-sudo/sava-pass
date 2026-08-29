-- Traffic-light verdicts belong to the application-form review stage.
-- Interview criteria remain a separate workflow and no longer write verdicts
-- to interview_evaluations.

insert into public.permissions (key, label, category, description)
values (
  'evaluate_recruitment_forms',
  'Evaluează formularele candidaților',
  'Recrutare',
  'Acordă un verdict colorat și un comentariu privat formularului unui candidat.'
)
on conflict (key) do update set
  label = excluded.label,
  category = excluded.category,
  description = excluded.description;

update public.permissions
set
  label = 'Participă la interviurile alocate',
  description = 'Vezi candidații alocați și criteriile stabilite pentru interviu.'
where key = 'evaluate_interview_candidates';

insert into public.role_permissions (role_key, permission_key)
values
  ('interviewer', 'evaluate_recruitment_forms'),
  ('board', 'evaluate_recruitment_forms'),
  ('admin', 'evaluate_recruitment_forms')
on conflict do nothing;

create table if not exists public.application_evaluations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.membership_applications(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating text not null
    constraint application_evaluations_rating_check
    check (rating in ('green', 'yellow', 'red')),
  comment text not null
    constraint application_evaluations_comment_check
    check (char_length(btrim(comment)) between 3 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_evaluations_application_reviewer_key
    unique (application_id, reviewer_id)
);

create index if not exists application_evaluations_reviewer_updated_idx
  on public.application_evaluations(reviewer_id, updated_at desc);

drop trigger if exists application_evaluations_updated_at
  on public.application_evaluations;
create trigger application_evaluations_updated_at
before update on public.application_evaluations
for each row execute function public.set_updated_at();

-- Preserve the existing demo and production verdicts, but attach them to the
-- application they reviewed instead of the later interview record.
insert into public.application_evaluations (
  application_id,
  reviewer_id,
  rating,
  comment,
  created_at,
  updated_at
)
select distinct on (interview.application_id, evaluation.interviewer_id)
  interview.application_id,
  evaluation.interviewer_id,
  evaluation.rating,
  evaluation.comment,
  evaluation.created_at,
  evaluation.updated_at
from public.interview_evaluations evaluation
join public.interviews interview on interview.id = evaluation.interview_id
order by interview.application_id, evaluation.interviewer_id, evaluation.updated_at desc
on conflict (application_id, reviewer_id) do update set
  rating = excluded.rating,
  comment = excluded.comment,
  updated_at = excluded.updated_at
where excluded.updated_at > application_evaluations.updated_at;

alter table public.application_evaluations enable row level security;

revoke all on public.application_evaluations from public, anon, authenticated;
grant select, insert, update on public.application_evaluations to authenticated;
grant all on public.application_evaluations to service_role;

create policy application_evaluations_private_read
on public.application_evaluations
for select
to authenticated
using (
  reviewer_id = (select auth.uid())
  or (select private.is_admin())
);

create policy application_evaluations_private_insert
on public.application_evaluations
for insert
to authenticated
with check (
  reviewer_id = (select auth.uid())
  and (select private.has_permission('evaluate_recruitment_forms'))
);

create policy application_evaluations_private_update
on public.application_evaluations
for update
to authenticated
using (
  reviewer_id = (select auth.uid())
  and (select private.has_permission('evaluate_recruitment_forms'))
)
with check (
  reviewer_id = (select auth.uid())
  and (select private.has_permission('evaluate_recruitment_forms'))
);

drop policy if exists interview_evaluations_private_insert
  on public.interview_evaluations;
drop policy if exists interview_evaluations_private_update
  on public.interview_evaluations;
revoke insert, update on public.interview_evaluations from authenticated;

comment on table public.application_evaluations is
  'Private traffic-light review of one recruitment application, owned by one reviewer; Board can centralize all reviews.';
comment on column public.application_evaluations.rating is
  'green = recommended, yellow = discuss, red = not recommended';
comment on table public.interview_evaluations is
  'Legacy read-only archive. Traffic-light verdicts now belong to application_evaluations.';
