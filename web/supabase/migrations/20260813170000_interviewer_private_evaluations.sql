-- Private, per-interviewer candidate evaluations.
-- A separate row prevents one interviewer from reading or overwriting another's notes.
create table if not exists public.interview_evaluations (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  interviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating text not null
    constraint interview_evaluations_rating_check
    check (rating in ('green', 'yellow', 'red')),
  comment text not null
    constraint interview_evaluations_comment_check
    check (char_length(btrim(comment)) between 3 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interview_evaluations_interview_interviewer_key
    unique (interview_id, interviewer_id)
);

create index if not exists interview_evaluations_interviewer_updated_idx
  on public.interview_evaluations(interviewer_id, updated_at desc);

drop trigger if exists interview_evaluations_updated_at
  on public.interview_evaluations;
create trigger interview_evaluations_updated_at
before update on public.interview_evaluations
for each row execute function public.set_updated_at();

insert into public.permissions (key, label, category, description)
values (
  'evaluate_interview_candidates',
  'Evaluează candidații alocați',
  'Recrutare',
  'Acordă un verdict colorat și un comentariu privat candidaților alocați.'
)
on conflict (key) do update set
  label = excluded.label,
  category = excluded.category,
  description = excluded.description;

insert into public.role_permissions (role_key, permission_key)
values
  ('interviewer', 'evaluate_interview_candidates'),
  ('admin', 'evaluate_interview_candidates')
on conflict do nothing;

alter table public.interview_evaluations enable row level security;

revoke all on public.interview_evaluations from anon, authenticated;
grant select, insert, update on public.interview_evaluations to authenticated;
grant all on public.interview_evaluations to service_role;

drop policy if exists interview_evaluations_private_read
  on public.interview_evaluations;
create policy interview_evaluations_private_read
on public.interview_evaluations
for select
to authenticated
using (
  interviewer_id = (select auth.uid())
  or (select private.is_admin())
);

drop policy if exists interview_evaluations_private_insert
  on public.interview_evaluations;
create policy interview_evaluations_private_insert
on public.interview_evaluations
for insert
to authenticated
with check (
  interviewer_id = (select auth.uid())
  and (select private.has_permission('evaluate_interview_candidates'))
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.interview_interviewers assignment
      where assignment.interview_id = interview_evaluations.interview_id
        and assignment.profile_id = (select auth.uid())
    )
  )
);

drop policy if exists interview_evaluations_private_update
  on public.interview_evaluations;
create policy interview_evaluations_private_update
on public.interview_evaluations
for update
to authenticated
using (
  interviewer_id = (select auth.uid())
  and (select private.has_permission('evaluate_interview_candidates'))
)
with check (
  interviewer_id = (select auth.uid())
  and (select private.has_permission('evaluate_interview_candidates'))
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.interview_interviewers assignment
      where assignment.interview_id = interview_evaluations.interview_id
        and assignment.profile_id = (select auth.uid())
    )
  )
);

comment on table public.interview_evaluations is
  'Private traffic-light interview verdict and comment owned by one interviewer.';
comment on column public.interview_evaluations.rating is
  'green = recommended, yellow = discuss, red = not recommended';
