-- Role-administration permissions are not delegable. Board may manage members
-- and operational assignments, while only Super Admin may edit the permission
-- matrix or grant/revoke the Board role.
delete from public.role_permissions
where permission_key = 'manage_permissions'
  and role_key <> 'admin';

delete from public.role_permissions
where permission_key in ('manage_members', 'manage_staff_assignments')
  and role_key not in ('admin', 'board');

create or replace function private.profile_has_permission(
  p_profile_id uuid,
  p_permission_key text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_override boolean;
  v_role public.staff_role;
  v_status text;
begin
  select p.role, p.membership_status into v_role, v_status
  from public.profiles p
  where p.id = p_profile_id;

  if not found or v_status <> 'active' then
    return false;
  end if;

  -- These checks intentionally run before overrides and role mappings. This
  -- prevents a lower role from indirectly receiving role-administration power.
  if p_permission_key = 'manage_permissions' then
    return v_role = 'admin'::public.staff_role;
  end if;

  if p_permission_key in ('manage_members', 'manage_staff_assignments') then
    return v_role in ('admin'::public.staff_role, 'board'::public.staff_role);
  end if;

  if v_role in ('admin'::public.staff_role, 'board'::public.staff_role) then
    return true;
  end if;

  if p_permission_key in (
    'view_member_dashboard',
    'view_own_attendance',
    'display_member_qr',
    'update_own_profile'
  ) then
    return true;
  end if;

  select o.allowed into v_override
  from public.profile_permission_overrides o
  where o.profile_id = p_profile_id and o.permission_key = p_permission_key;

  if found then
    return v_override;
  end if;

  return exists (
    select 1
    from public.role_permissions rp
    where rp.permission_key = p_permission_key
      and (
        rp.role_key = 'member'
        or rp.role_key = v_role::text
        or exists (
          select 1
          from public.profile_roles pr
          where pr.profile_id = p_profile_id
            and pr.role::text = rp.role_key
        )
      )
  );
end;
$$;

create or replace function public.set_profile_operational_roles(
  p_profile_id uuid,
  p_roles public.staff_role[],
  p_actor_id uuid
)
returns public.staff_role[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor_role public.staff_role;
  v_actor_status text;
  v_primary_role public.staff_role;
  v_status text;
  v_roles public.staff_role[];
  v_previous_roles public.staff_role[];
begin
  select p.role, p.membership_status into v_actor_role, v_actor_status
  from public.profiles p
  where p.id = p_actor_id;

  if not found
    or v_actor_status <> 'active'
    or v_actor_role not in ('admin'::public.staff_role, 'board'::public.staff_role)
    or not private.profile_has_permission(p_actor_id, 'manage_staff_assignments')
  then
    raise exception 'unauthorized_staff_assignment';
  end if;

  select p.role, p.membership_status into v_primary_role, v_status
  from public.profiles p
  where p.id = p_profile_id;

  if not found then
    raise exception 'profile_not_found';
  end if;

  if v_status <> 'active' then
    raise exception 'inactive_profile';
  end if;

  if v_primary_role in (
    'admin'::public.staff_role,
    'board'::public.staff_role,
    'statistici'::public.staff_role
  ) then
    raise exception 'protected_primary_role';
  end if;

  select coalesce(
    array_agg(distinct requested_role order by requested_role),
    array[]::public.staff_role[]
  ) into v_roles
  from unnest(coalesce(p_roles, array[]::public.staff_role[])) as requested(requested_role);

  if cardinality(v_roles) > 2 or exists (
    select 1
    from unnest(v_roles) as requested(role)
    where requested.role not in (
      'scanner'::public.staff_role,
      'interviewer'::public.staff_role
    )
  ) then
    raise exception 'invalid_operational_roles';
  end if;

  select coalesce(
    array_agg(pr.role order by pr.role),
    array[]::public.staff_role[]
  ) into v_previous_roles
  from public.profile_roles pr
  where pr.profile_id = p_profile_id;

  if v_primary_role in (
    'scanner'::public.staff_role,
    'interviewer'::public.staff_role
  ) then
    update public.profiles
    set role = null
    where id = p_profile_id
      and role = v_primary_role;
  end if;

  delete from public.profile_roles pr
  where pr.profile_id = p_profile_id;

  insert into public.profile_roles (profile_id, role, assigned_by)
  select p_profile_id, requested.role, p_actor_id
  from unnest(v_roles) as requested(role);

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_actor_id,
    'staff.operational_roles_changed',
    'profile',
    p_profile_id::text,
    jsonb_build_object(
      'previous_roles', to_jsonb(v_previous_roles),
      'roles', to_jsonb(v_roles)
    )
  );

  return v_roles;
end;
$$;

create or replace function public.set_profile_board_role(
  p_profile_id uuid,
  p_board_enabled boolean,
  p_actor_id uuid
)
returns public.staff_role
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor_role public.staff_role;
  v_actor_status text;
  v_primary_role public.staff_role;
  v_status text;
  v_new_role public.staff_role;
begin
  select p.role, p.membership_status into v_actor_role, v_actor_status
  from public.profiles p
  where p.id = p_actor_id;

  if not found
    or v_actor_status <> 'active'
    or v_actor_role <> 'admin'::public.staff_role
  then
    raise exception 'unauthorized_board_assignment';
  end if;

  if p_board_enabled is null then
    raise exception 'invalid_board_state';
  end if;

  select p.role, p.membership_status
  into v_primary_role, v_status
  from public.profiles p
  where p.id = p_profile_id
  for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  if v_status <> 'active' then
    raise exception 'inactive_profile';
  end if;

  if v_primary_role in (
    'admin'::public.staff_role,
    'statistici'::public.staff_role
  ) then
    raise exception 'protected_primary_role';
  end if;

  if p_board_enabled then
    if v_primary_role in (
      'scanner'::public.staff_role,
      'interviewer'::public.staff_role
    ) then
      insert into public.profile_roles (profile_id, role, assigned_by)
      values (p_profile_id, v_primary_role, p_actor_id)
      on conflict do nothing;
    end if;

    update public.profiles
    set role = 'board'::public.staff_role
    where id = p_profile_id;

    v_new_role := 'board'::public.staff_role;
  else
    if v_primary_role is distinct from 'board'::public.staff_role then
      raise exception 'board_role_not_assigned';
    end if;

    if not exists (
      select 1
      from public.profiles p
      where p.id <> p_profile_id
        and p.membership_status = 'active'
        and p.role in (
          'admin'::public.staff_role,
          'board'::public.staff_role
        )
    ) then
      raise exception 'last_admin_equivalent';
    end if;

    update public.profiles
    set role = null
    where id = p_profile_id;

    v_new_role := null;
  end if;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_actor_id,
    'staff.board_role_changed',
    'profile',
    p_profile_id::text,
    jsonb_build_object(
      'previous_role', v_primary_role,
      'role', v_new_role,
      'board_enabled', p_board_enabled
    )
  );

  return v_new_role;
end;
$$;

revoke all on function private.profile_has_permission(uuid, text) from public;
grant execute on function private.profile_has_permission(uuid, text) to service_role;

revoke all on function public.set_profile_operational_roles(
  uuid, public.staff_role[], uuid
) from public, anon, authenticated;
grant execute on function public.set_profile_operational_roles(
  uuid, public.staff_role[], uuid
) to service_role;

revoke all on function public.set_profile_board_role(
  uuid, boolean, uuid
) from public, anon, authenticated;
grant execute on function public.set_profile_board_role(
  uuid, boolean, uuid
) to service_role;

comment on function public.set_profile_operational_roles(
  uuid, public.staff_role[], uuid
) is 'Server-only operational-role assignment restricted to active Board or Super Admin actors.';

comment on function public.set_profile_board_role(
  uuid, boolean, uuid
) is 'Server-only Board promotion/demotion restricted to active Super Admin actors.';
