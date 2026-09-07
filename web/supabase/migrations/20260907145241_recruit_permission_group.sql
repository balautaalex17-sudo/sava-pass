-- Recruit is a permission group selected by membership_status, not a staff role.
-- No defaults are inserted: existing recruit access stays unchanged until configured.
alter table public.role_permissions drop constraint role_permissions_role_key_check;
alter table public.role_permissions add constraint role_permissions_role_key_check
  check (role_key in ('recruit', 'member', 'admin', 'board', 'scanner', 'statistici', 'interviewer'));
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

  -- Recruits never inherit member or staff mappings, even if stale staff data exists.
  if found and v_status = 'recruit' then
    if p_permission_key in ('manage_permissions', 'manage_members', 'manage_staff_assignments') then
      return false;
    end if;
    select o.allowed into v_override from public.profile_permission_overrides o
    where o.profile_id = p_profile_id and o.permission_key = p_permission_key;
    if found then return v_override; end if;
    return exists (
      select 1 from public.role_permissions rp
      where rp.role_key = 'recruit' and rp.permission_key = p_permission_key
    );
  end if;
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


-- QR grants also allow the recruit's attendance to be recorded.
create or replace function public.record_meeting_attendance(
  p_meeting_id uuid,
  p_member_ref uuid,
  p_scanner_user_id uuid,
  p_token_fingerprint text,
  p_device_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting public.meetings%rowtype;
  v_member public.profiles%rowtype;
  v_attendance public.meeting_attendance%rowtype;
  v_scan_id uuid;
  v_confirmer_name text;
begin
  if not private.profile_has_permission(p_scanner_user_id, 'scan_meeting_attendance') then
    return jsonb_build_object('result', 'unauthorized');
  end if;

  select * into v_meeting from public.meetings m where m.id = p_meeting_id;
  if not found then
    return jsonb_build_object('result', 'attendance_closed');
  end if;

  select * into v_member from public.profiles p where p.member_ref = p_member_ref;
  if not found or not coalesce(private.profile_has_permission(v_member.id, 'display_member_qr'), false) then
    insert into public.attendance_scans(
      meeting_id, member_id, scanner_user_id, token_fingerprint, result, error_code, device_metadata
    ) values (
      v_meeting.id, v_member.id, p_scanner_user_id,
      p_token_fingerprint, 'inactive_member', 'INACTIVE_MEMBER', coalesce(p_device_metadata, '{}'::jsonb)
    );
    return jsonb_build_object('result', 'inactive_member');
  end if;

  if v_member.id = p_scanner_user_id then
    insert into public.attendance_scans(
      meeting_id, member_id, scanner_user_id, token_fingerprint, result, error_code, device_metadata
    ) values (
      v_meeting.id, v_member.id, p_scanner_user_id, p_token_fingerprint,
      'self_scan_blocked', 'SELF_SCAN_BLOCKED', coalesce(p_device_metadata, '{}'::jsonb)
    );
    return jsonb_build_object('result', 'self_scan_blocked', 'member_name', v_member.full_name);
  end if;

  if v_meeting.status <> 'attendance_open'
    or now() < v_meeting.attendance_opens_at
    or now() > v_meeting.attendance_closes_at then
    insert into public.attendance_scans(
      meeting_id, member_id, scanner_user_id, token_fingerprint, result, error_code, device_metadata
    ) values (
      v_meeting.id, v_member.id, p_scanner_user_id, p_token_fingerprint,
      'attendance_closed', 'ATTENDANCE_CLOSED', coalesce(p_device_metadata, '{}'::jsonb)
    );
    return jsonb_build_object('result', 'attendance_closed', 'member_name', v_member.full_name);
  end if;

  insert into public.meeting_attendance(
    meeting_id, member_id, status, checked_in_at, checked_in_by
  ) values (
    v_meeting.id, v_member.id, 'present', now(), p_scanner_user_id
  )
  on conflict (meeting_id, member_id) do nothing
  returning * into v_attendance;

  if v_attendance.id is null then
    select * into v_attendance
    from public.meeting_attendance a
    where a.meeting_id = v_meeting.id and a.member_id = v_member.id;

    select p.full_name into v_confirmer_name
    from public.profiles p where p.id = v_attendance.checked_in_by;

    insert into public.attendance_scans(
      meeting_id, member_id, scanner_user_id, token_fingerprint, result, error_code, device_metadata
    ) values (
      v_meeting.id, v_member.id, p_scanner_user_id, p_token_fingerprint,
      'already_present', 'ALREADY_PRESENT', coalesce(p_device_metadata, '{}'::jsonb)
    );

    return jsonb_build_object(
      'result', 'already_present',
      'member_name', v_member.full_name,
      'member_avatar_url', v_member.avatar_url,
      'meeting_name', v_meeting.title,
      'checked_in_at', v_attendance.checked_in_at,
      'confirmed_by', v_confirmer_name
    );
  end if;

  insert into public.attendance_scans(
    meeting_id, member_id, scanner_user_id, token_fingerprint, result, device_metadata
  ) values (
    v_meeting.id, v_member.id, p_scanner_user_id, p_token_fingerprint,
    'accepted', coalesce(p_device_metadata, '{}'::jsonb)
  ) returning id into v_scan_id;

  update public.meeting_attendance set scan_id = v_scan_id where id = v_attendance.id;
  select p.full_name into v_confirmer_name from public.profiles p where p.id = p_scanner_user_id;

  return jsonb_build_object(
    'result', 'accepted',
    'member_name', v_member.full_name,
    'member_avatar_url', v_member.avatar_url,
    'membership_status', v_member.membership_status,
    'meeting_name', v_meeting.title,
    'checked_in_at', v_attendance.checked_in_at,
    'confirmed_by', v_confirmer_name
  );
end;
$$;

revoke all on function private.profile_has_permission(uuid, text) from public;
grant execute on function private.profile_has_permission(uuid, text) to service_role;
revoke all on function public.record_meeting_attendance(uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_meeting_attendance(uuid, uuid, uuid, text, jsonb) to service_role;
