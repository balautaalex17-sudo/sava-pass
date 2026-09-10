-- Run only on disposable local/staging data, never production. Every fixture
-- and write is rolled back, including audit entries and temporary privileges.
begin;
do $$
declare
  v_member uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_board uuid := gen_random_uuid();
  v_scanner uuid := gen_random_uuid();
  v_meeting uuid := gen_random_uuid();
  v_request uuid;
  v_result jsonb;
  v_count integer;
  v_status text;
begin
  insert into auth.users(id, email, raw_user_meta_data) values
    (v_member, v_member::text || '@example.com', '{"name":"Attendance test member"}'),
    (v_other, v_other::text || '@example.com', '{"name":"Attendance test other"}'),
    (v_board, v_board::text || '@example.com', '{"name":"Attendance test board"}'),
    (v_scanner, v_scanner::text || '@example.com', '{"name":"Attendance test scanner"}');
  insert into public.profiles(id, email, full_name, membership_status) values
    (v_member, v_member::text || '@example.com', 'Attendance test member', 'active'),
    (v_other, v_other::text || '@example.com', 'Attendance test other', 'active'),
    (v_board, v_board::text || '@example.com', 'Attendance test board', 'active'),
    (v_scanner, v_scanner::text || '@example.com', 'Attendance test scanner', 'active')
  on conflict (id) do nothing;
  update public.profiles set membership_status = 'active', role = null where id in (v_member, v_other);
  update public.profiles set membership_status = 'active', role = 'board' where id = v_board;
  update public.profiles set membership_status = 'active', role = 'scanner' where id = v_scanner;
  insert into public.meetings(id, title, starts_at, ends_at, location, attendance_opens_at, attendance_closes_at, status, created_by)
  values (v_meeting, 'Attendance isolated test', now() - interval '2 days', now() - interval '47 hours', 'Test', now() - interval '49 hours', now() - interval '47 hours', 'finished', v_board);

  set local role service_role;
  v_result := public.submit_absence_request(v_meeting, v_member, 'Motiv de test suficient de lung');
  reset role;
  assert v_result->>'result' = 'submitted', 'Member submits an absence request';
  assert public.submit_absence_request(v_meeting, v_member, 'Cerere repetată de test')->>'result' = 'already_requested', 'Duplicate requests are prevented';
  select id into v_request from public.absence_requests where meeting_id = v_meeting and member_id = v_member;
  assert public.review_absence_request(v_request, v_scanner, 'approved')->>'result' = 'unauthorized', 'Scanner cannot review';
  assert public.review_absence_request(v_request, v_member, 'approved')->>'result' = 'unauthorized', 'Member cannot review';
  assert public.review_absence_request(v_request, v_board, 'invalid')->>'result' = 'invalid', 'Invalid decision is rejected';
  set local role service_role;
  assert public.review_absence_request(v_request, v_board, 'approved', 'Acceptată pentru test')->>'result' = 'reviewed', 'Board approves';
  reset role;
  assert public.review_absence_request(v_request, v_board, 'rejected')->>'result' = 'already_reviewed', 'Decision cannot be overwritten';
  assert (select status = 'approved' and reviewed_by = v_board and reviewed_at is not null and review_note = 'Acceptată pentru test' from public.absence_requests where id = v_request), 'Decision metadata persisted';
  assert not exists (select 1 from public.meeting_attendance where meeting_id = v_meeting), 'Approval never fabricates presence';
  assert (select count(*) = 2 from public.audit_logs where entity_id = v_request::text), 'Submission and review are audited';

  assert public.submit_absence_request(v_meeting, v_other, 'Motiv separat de test')->>'result' = 'submitted';
  select id into v_request from public.absence_requests where meeting_id = v_meeting and member_id = v_other;
  assert public.review_absence_request(v_request, v_board, 'rejected', 'Respinsă pentru test')->>'result' = 'reviewed', 'Board rejects';
  assert (select status = 'rejected' from public.absence_requests where id = v_request);

  assert public.submit_absence_request(v_meeting, v_board, 'Cerere proprie de board')->>'result' = 'submitted';
  select id into v_request from public.absence_requests where meeting_id = v_meeting and member_id = v_board;
  assert public.review_absence_request(v_request, v_board, 'approved')->>'result' = 'self_review', 'Board cannot approve own request';

  update public.meetings set status = 'cancelled' where id = v_meeting;
  update public.profiles set role = 'board' where id = v_member;
  assert public.review_absence_request(v_request, v_member, 'approved')->>'result' = 'not_absent', 'Cannot review a cancelled meeting';
  assert public.review_absence_request(v_request, v_other, 'approved')->>'result' = 'unauthorized';
  assert public.submit_absence_request(v_meeting, v_scanner, 'Test ședință anulată')->>'result' = 'not_absent', 'Cancelled meetings cannot be excused';
  update public.meetings set status = 'attendance_open', ends_at = now() + interval '1 hour',
    attendance_closes_at = now() + interval '1 day' where id = v_meeting;
  assert public.review_absence_request(v_request, v_member, 'approved')->>'result' = 'not_absent', 'Cannot review a reopened meeting';
  assert public.submit_absence_request(v_meeting, v_scanner, 'Test ședință viitoare')->>'result' = 'not_absent', 'Open meetings cannot be excused';
  update public.meetings set status = 'finished', ends_at = now() - interval '4 hours' where id = v_meeting;
  insert into public.meeting_attendance(meeting_id, member_id, checked_in_by) values(v_meeting, v_board, v_member);
  assert public.review_absence_request(v_request, v_member, 'approved')->>'result' = 'not_absent', 'Cannot review after absence was corrected to presence';
  update public.profiles set role = null where id = v_member;
  insert into public.meeting_attendance(meeting_id, member_id, checked_in_by) values(v_meeting, v_scanner, v_board);
  assert public.submit_absence_request(v_meeting, v_scanner, 'Test membru prezent')->>'result' = 'not_absent', 'Present members cannot request';
  assert public.submit_absence_request(v_meeting, v_scanner, 'scurt')->>'result' = 'invalid', 'Short reasons are rejected';
  update public.profiles set membership_status = 'inactive' where id = v_scanner;
  assert public.submit_absence_request(v_meeting, v_scanner, 'Test membru inactiv')->>'result' = 'unauthorized', 'Inactive members cannot request';

  assert not has_table_privilege('anon', 'public.absence_requests', 'SELECT'), 'Anonymous reads blocked';
  assert not has_table_privilege('authenticated', 'public.absence_requests', 'INSERT'), 'Direct inserts blocked';
  assert not has_table_privilege('authenticated', 'public.absence_requests', 'UPDATE'), 'Direct approvals blocked';
  assert not has_function_privilege('authenticated', 'public.submit_absence_request(uuid,uuid,text)', 'EXECUTE'), 'Client cannot impersonate member RPC';
  assert not has_function_privilege('authenticated', 'public.review_absence_request(uuid,uuid,text,text)', 'EXECUTE'), 'Client cannot impersonate reviewer RPC';

  -- A real authenticated role proves row ownership, not just policy text.
  perform set_config('request.jwt.claim.sub', v_member::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_member, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_count from public.absence_requests where meeting_id = v_meeting;
  assert v_count = 1, 'Member sees only own request';
  reset role;
  perform set_config('request.jwt.claim.sub', v_board::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_board, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_count from public.absence_requests where meeting_id = v_meeting;
  assert v_count = 3, 'Board sees all requests';
  reset role;

  -- now() stays fixed in this transaction, so grace-period boundaries are stable.
  update public.profiles set membership_status = 'active' where id = v_scanner;
  update public.profiles set role = 'board' where id = v_member;
  update public.meeting_attendance set status = 'reversed'
    where meeting_id = v_meeting and member_id in (v_scanner, v_board);
  select id into v_request from public.absence_requests where meeting_id = v_meeting and member_id = v_board;
  foreach v_status in array array['upcoming', 'attendance_open', 'finished'] loop
    update public.meetings set status = v_status, ends_at = now() - interval '3 hours' + interval '1 millisecond',
      attendance_closes_at = now() - interval '1 day' where id = v_meeting;
    set local role service_role;
    assert public.submit_absence_request(v_meeting, v_scanner, 'Motiv înainte de termen')->>'result' = 'not_absent', 'Grace period blocks a request despite finished status or closed confirmations';
    assert public.review_absence_request(v_request, v_member, 'approved')->>'result' = 'not_absent', 'Grace period blocks review despite finished status or closed confirmations';
    reset role;
  end loop;

  update public.meetings set status = 'attendance_open', ends_at = now() - interval '3 hours',
    attendance_closes_at = now() + interval '3 days' where id = v_meeting;
  set local role service_role;
  assert public.submit_absence_request(v_meeting, v_scanner, 'Motiv după finalul ședinței')->>'result' = 'submitted', 'Exactly three hours after meeting end permits a request despite an open confirmation window';
  reset role;
  select id into v_request from public.absence_requests where meeting_id = v_meeting and member_id = v_scanner;
  set local role service_role;
  assert public.review_absence_request(v_request, v_board, 'approved')->>'result' = 'reviewed', 'Exactly three hours after meeting end permits reviewing the request';
  reset role;

  select id into v_request from public.absence_requests where meeting_id = v_meeting and member_id = v_board;
  update public.meetings set status = 'draft' where id = v_meeting;
  assert public.submit_absence_request(v_meeting, v_scanner, 'Test ciornă încheiată')->>'result' = 'not_absent', 'Draft meetings still cannot be excused';
  assert public.review_absence_request(v_request, v_member, 'approved')->>'result' = 'not_absent', 'Draft meetings still cannot be reviewed';
  update public.meetings set status = 'upcoming', ends_at = now() - interval '4 hours' where id = v_meeting;
  assert public.review_absence_request(v_request, v_member, 'rejected')->>'result' = 'reviewed', 'An elapsed end permits review without a manual finished status';
end;
$$;
rollback;
