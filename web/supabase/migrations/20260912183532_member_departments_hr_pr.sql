-- HR/PR is a member category, never an authorization role.
alter table public.profiles add column member_department text
  constraint profiles_member_department_check check (member_department in ('hr', 'pr'));

comment on column public.profiles.member_department is
  'One-time HR/PR choice. Active members only; Board and Super Admin are excluded from selection and balancing.';

-- Only the trusted server may call these functions, after resolving the signed-in
-- profile itself. SECURITY INVOKER preserves that caller privilege boundary.
create function public.get_member_department_options(p_profile_id uuid)
returns jsonb
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_hr bigint;
  v_pr bigint;
  v_total bigint;
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

  select count(*) filter (where p.member_department = 'hr'),
         count(*) filter (where p.member_department = 'pr')
    into v_hr, v_pr
    from public.profiles p
    where p.membership_status = 'active'
      and p.member_department is not null
      and coalesce(p.role::text, '') not in ('board', 'admin')
      and not exists (select 1 from public.profile_roles r where r.profile_id = p.id and r.role::text in ('board', 'admin'));
  v_total := v_hr + v_pr;
  return jsonb_build_object('result', 'choice_required', 'hr', v_hr, 'pr', v_pr,
    'blockedDepartment', case
      when v_hr * 10 > v_total * 7 then 'hr'
      when v_pr * 10 > v_total * 7 then 'pr'
      else null end);
end;
$$;

create function public.select_member_department(p_profile_id uuid, p_department text)
returns jsonb
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_options jsonb;
begin
  if p_department is null or p_department not in ('hr', 'pr') then
    return jsonb_build_object('result', 'invalid_department');
  end if;
  -- Every selection shares a transaction lock: recount and write are one atomic
  -- operation, including requests arriving from different server instances.
  perform pg_catalog.pg_advisory_xact_lock(735021, 1);
  perform 1 from public.profiles where id = p_profile_id for update;
  v_options := public.get_member_department_options(p_profile_id);
  if v_options->>'result' <> 'choice_required' then
    return v_options;
  end if;
  if v_options->>'blockedDepartment' = p_department then
    return v_options || jsonb_build_object('result', 'blocked');
  end if;
  update public.profiles set member_department = p_department where id = p_profile_id;
  return jsonb_build_object('result', 'selected', 'department', p_department);
end;
$$;

revoke all on function public.get_member_department_options(uuid) from public, anon, authenticated;
revoke all on function public.select_member_department(uuid, text) from public, anon, authenticated;
grant execute on function public.get_member_department_options(uuid) to service_role;
grant execute on function public.select_member_department(uuid, text) to service_role;
-- Existing authenticated profile writes are column-scoped. Do not grant this
-- column: editing a profile must not bypass the balanced, one-time choice.
