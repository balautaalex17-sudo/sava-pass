-- Board/admin-equivalent members own the active interview scoring workflow.
-- Scheduling and committee records remain in the schema for compatibility with
-- legacy data, but they do not grant access to interview scoring.
update public.permissions
set
  label = 'Evaluează interviurile recrutării (Board)',
  description = 'Board-ul vede toate evaluările și notează cele trei criterii ale fiecărui interviu.'
where key = 'evaluate_interview_candidates';

-- Interviewers continue to review forms, but cannot score interviews.
delete from public.role_permissions
where role_key = 'interviewer'
  and permission_key = 'evaluate_interview_candidates';

-- Keep explicit rows for both admin-equivalent roles in every environment.
insert into public.role_permissions (role_key, permission_key)
values
  ('admin', 'evaluate_interview_candidates'),
  ('board', 'evaluate_interview_candidates')
on conflict do nothing;

-- The server action performs the Board/admin check and writes with the
-- service-role client. Authenticated browser sessions must not write directly.
revoke insert, update on public.interview_evaluations from authenticated;
drop policy if exists interview_evaluations_private_insert
  on public.interview_evaluations;
drop policy if exists interview_evaluations_private_update
  on public.interview_evaluations;

-- Scores are Board-only to read as well. Form-review rows remain separate and
-- keep their existing per-reviewer permissions.
drop policy if exists interview_evaluations_private_read
  on public.interview_evaluations;
create policy interview_evaluations_board_read
on public.interview_evaluations
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role in ('admin'::public.staff_role, 'board'::public.staff_role)
      and profile.membership_status = 'active'
  )
);
