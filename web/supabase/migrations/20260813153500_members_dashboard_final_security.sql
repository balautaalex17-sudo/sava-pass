-- Keep the promised member baseline immutable and make super-admin access
-- independent from editable role mappings or per-profile overrides.
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

  if v_role = 'admin'::public.staff_role then
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
    select 1 from public.role_permissions rp
    where rp.permission_key = p_permission_key
      and (rp.role_key = 'member' or rp.role_key = v_role::text)
  );
end;
$$;

revoke all on function private.profile_has_permission(uuid, text) from public;
grant execute on function private.profile_has_permission(uuid, text) to service_role;
