-- Board is a primary role with full administrative access. This server-only
-- function promotes or demotes one active member atomically and records the
-- change in the audit log.
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
  v_primary_role public.staff_role;
  v_status text;
  v_new_role public.staff_role;
begin
  if not private.profile_has_permission(p_actor_id, 'manage_staff_assignments') then
    raise exception 'unauthorized_staff_assignment';
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
    -- Preserve a legacy scanner/interviewer role as an additive assignment
    -- before replacing the primary role with Board.
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

    if p_profile_id = p_actor_id then
      raise exception 'self_board_removal_blocked';
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

revoke all on function public.set_profile_board_role(
  uuid, boolean, uuid
) from public, anon, authenticated;

grant execute on function public.set_profile_board_role(
  uuid, boolean, uuid
) to service_role;

comment on function public.set_profile_board_role(
  uuid, boolean, uuid
) is 'Server-only atomic Board promotion/demotion with audit history.';
