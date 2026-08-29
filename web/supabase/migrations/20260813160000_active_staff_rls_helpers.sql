-- A staff role grants access only while the person is an active member.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.staff_role
      and p.membership_status = 'active'
  );
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role is not null
      and p.membership_status = 'active'
  );
$$;

create or replace function private.is_interviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'interviewer'::public.staff_role
      and p.membership_status = 'active'
  );
$$;

create or replace function private.can_access_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or (
    private.is_interviewer()
    and exists (
      select 1
      from public.interviews i
      join public.interview_interviewers ii on ii.interview_id = i.id
      where i.application_id = target_application_id
        and ii.profile_id = (select auth.uid())
    )
  );
$$;

grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.is_staff() to anon, authenticated, service_role;
grant execute on function private.is_interviewer() to anon, authenticated, service_role;
grant execute on function private.can_access_application(uuid) to anon, authenticated, service_role;
