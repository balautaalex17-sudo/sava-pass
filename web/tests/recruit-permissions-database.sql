-- Disposable staging fixtures only. All profile, permission and attendance writes roll back.
begin;
do $$
declare
  recruit_id uuid := gen_random_uuid();
  board_id uuid := gen_random_uuid();
  member_id uuid := gen_random_uuid();
  meeting_id uuid := gen_random_uuid();
  recruit_ref uuid;
begin
  insert into auth.users(id, email) values
    (recruit_id, recruit_id || '@example.com'),
    (board_id, board_id || '@example.com'),
    (member_id, member_id || '@example.com');
  insert into public.profiles(id, email, full_name, membership_status, role) values
    (recruit_id, recruit_id || '@example.com', 'Permission fixture recruit', 'recruit', null),
    (board_id, board_id || '@example.com', 'Permission fixture board', 'active', 'board'),
    (member_id, member_id || '@example.com', 'Permission fixture member', 'active', null);
  select member_ref into recruit_ref from public.profiles where id = recruit_id;
  delete from public.role_permissions where role_key = 'recruit';
  assert not coalesce(private.profile_has_permission(recruit_id, 'view_own_attendance'), false);
  assert private.profile_has_permission(member_id, 'view_own_attendance');
  assert private.profile_has_permission(board_id, 'manage_members');
  assert not private.profile_has_permission(board_id, 'manage_permissions');

  insert into public.role_permissions(role_key, permission_key) values
    ('recruit', 'view_own_attendance'), ('recruit', 'display_member_qr'),
    ('recruit', 'manage_permissions'), ('recruit', 'manage_members'), ('recruit', 'manage_staff_assignments');
  assert private.profile_has_permission(recruit_id, 'view_own_attendance');
  assert not coalesce(private.profile_has_permission(recruit_id, 'view_member_dashboard'), false);
  assert not private.profile_has_permission(recruit_id, 'manage_permissions');
  assert not private.profile_has_permission(recruit_id, 'manage_members');
  assert not private.profile_has_permission(recruit_id, 'manage_staff_assignments');

  update public.profiles set role = 'admin' where id = recruit_id;
  assert not private.profile_has_permission(recruit_id, 'manage_permissions'), 'Stale roles cannot elevate a recruit';
  assert not private.profile_has_permission(recruit_id, 'manage_meetings'), 'Recruits do not inherit staff access';
  update public.profiles set role = null where id = recruit_id;
  insert into public.profile_permission_overrides(profile_id, permission_key, allowed)
    values(recruit_id, 'view_own_attendance', false);
  assert not private.profile_has_permission(recruit_id, 'view_own_attendance');
  delete from public.profile_permission_overrides where profile_id = recruit_id;

  insert into public.meetings(id, title, starts_at, ends_at, location, attendance_opens_at, attendance_closes_at, status, created_by)
    values(meeting_id, 'Recruit permission fixture', now() - interval '10 minutes', now() + interval '1 hour',
      'Fixture', now() - interval '10 minutes', now() + interval '1 hour', 'attendance_open', board_id);
  assert public.record_meeting_attendance(meeting_id, recruit_ref, board_id, repeat('a', 64))->>'result' = 'accepted',
    'An explicitly granted QR is accepted by the real scanner function';

  perform set_config('request.jwt.claim.sub', recruit_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', recruit_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  assert (select count(*) = 1 from public.meeting_attendance a where a.member_id = recruit_id), 'Database RLS respects own attendance grants';
  begin
    insert into public.role_permissions(role_key, permission_key) values ('recruit', 'manage_meetings');
    raise exception 'Recruit changed its own permission group';
  exception when insufficient_privilege then null; end;
  reset role;

  delete from public.role_permissions where role_key = 'recruit' and permission_key in ('display_member_qr', 'view_own_attendance');
  assert not private.profile_has_permission(recruit_id, 'view_own_attendance');
  assert public.record_meeting_attendance(meeting_id, recruit_ref, board_id, repeat('b', 64))->>'result' = 'inactive_member';
  insert into public.role_permissions(role_key, permission_key) values ('recruit', 'view_own_attendance');
  update public.profiles set membership_status = 'suspended' where id = recruit_id;
  assert not private.profile_has_permission(recruit_id, 'view_own_attendance');
  update public.profiles set membership_status = 'active' where id = recruit_id;
  assert private.profile_has_permission(recruit_id, 'view_member_dashboard'), 'Promotion restores member baseline';
end;
$$;
rollback;
