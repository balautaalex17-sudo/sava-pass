-- Staging/local only: disposable fixtures, no Auth email or production access.
-- Every fixture and change is rolled back.
begin;
do $$
<<fixture>>
declare
  board_id uuid := gen_random_uuid();
  recruit_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  suspended_id uuid := gen_random_uuid();
  application_id uuid := gen_random_uuid();
  other_application_id uuid := gen_random_uuid();
  board_application_id uuid := gen_random_uuid();
  suspended_application_id uuid := gen_random_uuid();
  photo_id uuid := gen_random_uuid();
  form_id uuid := gen_random_uuid();
  result text;
  n integer;
begin
  insert into auth.users (id, email) values
    (board_id, board_id || '@example.com'), (recruit_id, recruit_id || '@example.com'),
    (other_id, other_id || '@example.com'), (suspended_id, suspended_id || '@example.com');
  insert into public.profiles (id, email, full_name, role, membership_status) values
    (board_id, board_id || '@example.com', 'Recruit fixture board', 'board', 'active'),
    (suspended_id, suspended_id || '@example.com', 'Recruit fixture suspended', null, 'suspended');
  insert into public.recruitment_forms(id, title, version) values (form_id, 'Recruit fixture ' || form_id, 1);
  insert into public.membership_applications (id, full_name, email, phone, motivation, status, form_id) values
    (application_id, 'Recruit fixture new', recruit_id || '@example.com', '0700000000', 'Isolated test', 'interview_completed', form_id),
    (other_application_id, 'Recruit fixture other', other_id || '@example.com', '0700000000', 'Isolated test', 'submitted', form_id),
    (board_application_id, 'Must not overwrite Board', board_id || '@example.com', '0700000000', 'Isolated test', 'waiting_list', form_id),
    (suspended_application_id, 'Must not reactivate', suspended_id || '@example.com', '0700000000', 'Isolated test', 'interview_completed', form_id);

  assert public.accept_recruit_application(application_id, recruit_id, 'waiting_list', board_id, board_id) is null,
    'Stale requests do not grant access';
  begin
    perform public.accept_recruit_application(other_application_id, other_id, 'submitted', board_id, board_id);
    raise exception 'Unreviewed application unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'recruit_acceptance_invalid_stage' then raise; end if;
  end;
  begin
    perform public.accept_recruit_application(application_id, other_id, 'interview_completed', board_id, board_id);
    raise exception 'Wrong email unexpectedly linked';
  exception when raise_exception then
    if sqlerrm <> 'recruit_acceptance_email_mismatch' then raise; end if;
  end;

  -- Force failure AFTER the profile insert: the entire acceptance must roll back.
  begin
    perform public.accept_recruit_application(application_id, recruit_id, 'interview_completed', board_id, gen_random_uuid());
    raise exception 'Invalid reviewer unexpectedly allowed';
  exception when foreign_key_violation then null; end;
  assert not exists(select 1 from public.profiles where id = recruit_id), 'No partial profile after failed transaction';
  assert (select status = 'interview_completed' from public.membership_applications where id = application_id);

  set local role service_role;
  result := public.accept_recruit_application(application_id, recruit_id, 'interview_completed', board_id, board_id);
  reset role;
  assert result = 'recruit', 'Final acceptance grants recruit access';
  assert (select membership_status = 'recruit' and role is null from public.profiles where id = recruit_id);
  assert (select status = 'accepted' from public.membership_applications where id = application_id);
  assert public.accept_recruit_application(application_id, recruit_id, 'interview_completed', board_id, board_id) is null;
  assert (select count(*) = 1 from public.application_status_events e where e.application_id = fixture.application_id), 'Repeated acceptance creates one history event';
  assert public.accept_recruit_application(board_application_id, board_id, 'waiting_list', board_id, board_id) = 'active';
  assert (select role = 'board' and membership_status = 'active' and full_name = 'Recruit fixture board' from public.profiles where id = board_id), 'Existing access and profile are preserved';

  begin
    perform public.accept_recruit_application(suspended_application_id, suspended_id, 'interview_completed', board_id, board_id);
    raise exception 'Suspended account unexpectedly activated';
  exception when raise_exception then
    if sqlerrm <> 'recruit_acceptance_inactive_account' then raise; end if;
  end;
  assert (select status = 'interview_completed' from public.membership_applications where id = suspended_application_id);
  begin
    perform public.accept_recruit_application(other_application_id, other_id, 'submitted', recruit_id, recruit_id);
    raise exception 'Recruit unexpectedly allowed to accept candidates';
  exception when raise_exception then
    if sqlerrm <> 'recruit_acceptance_forbidden' then raise; end if;
  end;

  assert not has_function_privilege('authenticated', 'public.accept_recruit_application(uuid,uuid,text,uuid,uuid)', 'EXECUTE');
  assert not has_function_privilege('anon', 'public.accept_recruit_application(uuid,uuid,text,uuid,uuid)', 'EXECUTE');
  assert not private.profile_has_permission(recruit_id, 'manage_members');
  assert not private.profile_has_permission(recruit_id, 'view_member_dashboard');
  assert not has_column_privilege('authenticated', 'public.profiles', 'membership_status', 'UPDATE'), 'Recruit cannot self-promote';

  insert into public.gallery_photos(id, uploader_id, uploader_name, original_name, drive_file_id, mime_type, size_bytes)
  values (photo_id, board_id, 'Fixture Board', 'recruit.jpg', 'fixture_' || photo_id, 'image/jpeg', 1024);
  perform set_config('request.jwt.claim.sub', recruit_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', recruit_id, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  set local role authenticated;
  select count(*) into n from public.profiles where id in (recruit_id, board_id);
  assert n = 1, 'Recruit sees their own profile, not the Board profile';
  select count(*) into n from public.gallery_photos where id = photo_id;
  assert n = 1, 'Accepted recruit can read the shared gallery';
  begin
    update public.profiles set membership_status = 'active' where id = recruit_id;
    raise exception 'Direct self-promotion unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  reset role;

  update public.profiles set membership_status = 'active' where id = recruit_id;
  assert private.profile_has_permission(recruit_id, 'view_member_dashboard'), 'Promotion unlocks member access on the same account';
end $$;
rollback;
