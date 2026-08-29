-- Keep RLS helper functions out of the public PostgREST API surface. Existing
-- policy dependencies follow the functions when PostgreSQL changes schema.
alter function public.is_admin() set schema private;
alter function public.is_staff() set schema private;
alter function public.is_interviewer() set schema private;

create or replace function public.can_access_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1
    from public.interviews i
    join public.interview_interviewers ii on ii.interview_id = i.id
    where i.application_id = target_application_id
      and ii.profile_id = (select auth.uid())
  );
$$;

alter function public.can_access_application(uuid) set schema private;

grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.is_staff() to anon, authenticated, service_role;
grant execute on function private.is_interviewer() to anon, authenticated, service_role;
grant execute on function private.can_access_application(uuid) to anon, authenticated, service_role;
