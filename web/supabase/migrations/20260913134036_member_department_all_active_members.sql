-- The 75% denominator includes every active eligible member, including members
-- who have not chosen HR or PR. Existing assignments and permissions stay intact.
create or replace function public.get_member_department_balance()
returns jsonb language sql stable security invoker set search_path = '' as $$
  with counts as (
    select count(*) filter (where p.member_department = 'hr') as hr,
           count(*) filter (where p.member_department = 'pr') as pr,
           count(*) as total
    from public.profiles p where p.membership_status = 'active'
      and coalesce(p.role::text, '') not in ('board', 'admin')
      and not exists (select 1 from public.profile_roles r where r.profile_id = p.id and r.role::text in ('board', 'admin'))
  )
  select jsonb_build_object('hr', hr, 'pr', pr, 'blockedDepartment', case
    when hr * 4 > total * 3 then 'hr'
    when pr * 4 > total * 3 then 'pr' else null end) from counts;
$$;

create or replace function public.get_member_department_options(p_profile_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles where id = p_profile_id;
  if not found or v_profile.membership_status <> 'active'
    or coalesce(v_profile.role::text, '') in ('board', 'admin')
    or exists (select 1 from public.profile_roles where profile_id = p_profile_id and role::text in ('board', 'admin')) then
    return jsonb_build_object('result', 'excluded');
  end if;
  if v_profile.member_department is not null then
    return jsonb_build_object('result', 'already_selected', 'department', v_profile.member_department);
  end if;

  -- Initial selection and Board approval use the same count and strict boundary.
  return public.get_member_department_balance() || jsonb_build_object('result', 'choice_required');
end;
$$;

revoke all on function public.get_member_department_options(uuid) from public, anon, authenticated;
revoke all on function public.get_member_department_balance() from public, anon, authenticated;
grant execute on function public.get_member_department_options(uuid) to service_role;
grant execute on function public.get_member_department_balance() to service_role;
