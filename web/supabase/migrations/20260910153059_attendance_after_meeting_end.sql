-- Match attendanceResult: absence begins three hours after the scheduled end,
-- regardless of finished status or confirmation deadline. Preserve permissions and audit.
create or replace function public.submit_absence_request(p_meeting_id uuid, p_member_id uuid, p_reason text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_meeting public.meetings%rowtype;
  v_id uuid;
begin
  if not private.profile_has_permission(p_member_id, 'view_own_attendance') then
    return jsonb_build_object('result', 'unauthorized');
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then
    return jsonb_build_object('result', 'invalid');
  end if;
  select * into v_meeting from public.meetings where id = p_meeting_id for share;
  if not found then return jsonb_build_object('result', 'not_found'); end if;
  if v_meeting.status in ('draft', 'cancelled')
    or v_meeting.ends_at + interval '3 hours' > now() then
    return jsonb_build_object('result', 'not_absent');
  end if;
  perform 1 from public.meeting_attendance
  where meeting_id = p_meeting_id and member_id = p_member_id and status = 'present' for share;
  if found then return jsonb_build_object('result', 'not_absent'); end if;

  insert into public.absence_requests(meeting_id, member_id, reason)
  values (p_meeting_id, p_member_id, btrim(p_reason))
  on conflict (meeting_id, member_id) do nothing returning id into v_id;
  if v_id is null then return jsonb_build_object('result', 'already_requested'); end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (p_member_id, 'absence.requested', 'absence_requests', v_id::text,
    jsonb_build_object('meeting_id', p_meeting_id, 'member_id', p_member_id));
  return jsonb_build_object('result', 'submitted');
end;
$$;

create or replace function public.review_absence_request(p_request_id uuid, p_actor_id uuid, p_decision text, p_note text default '')
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_request public.absence_requests%rowtype;
  v_meeting public.meetings%rowtype;
begin
  if not exists (
    select 1 from public.profiles where id = p_actor_id
    and role in ('board', 'admin') and membership_status = 'active'
  ) then return jsonb_build_object('result', 'unauthorized'); end if;
  if p_decision is null or p_decision not in ('approved', 'rejected')
    or char_length(coalesce(p_note, '')) > 1000 then
    return jsonb_build_object('result', 'invalid');
  end if;
  select * into v_request from public.absence_requests where id = p_request_id for update;
  if not found then return jsonb_build_object('result', 'not_found'); end if;
  if v_request.member_id = p_actor_id then return jsonb_build_object('result', 'self_review'); end if;
  if v_request.status <> 'pending' then return jsonb_build_object('result', 'already_reviewed'); end if;
  select * into v_meeting from public.meetings where id = v_request.meeting_id for share;
  if v_meeting.status in ('draft', 'cancelled')
    or v_meeting.ends_at + interval '3 hours' > now() then
    return jsonb_build_object('result', 'not_absent');
  end if;
  perform 1 from public.meeting_attendance where meeting_id = v_request.meeting_id
    and member_id = v_request.member_id and status = 'present' for share;
  if found then return jsonb_build_object('result', 'not_absent'); end if;

  update public.absence_requests set status = p_decision, reviewed_by = p_actor_id,
    reviewed_at = now(), review_note = nullif(btrim(coalesce(p_note, '')), '')
  where id = p_request_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (p_actor_id, 'absence.reviewed', 'absence_requests', p_request_id::text,
    jsonb_build_object('meeting_id', v_request.meeting_id, 'member_id', v_request.member_id,
      'decision', p_decision));
  return jsonb_build_object('result', 'reviewed');
end;
$$;

revoke all on function public.submit_absence_request(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.review_absence_request(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_absence_request(uuid, uuid, text) to service_role;
grant execute on function public.review_absence_request(uuid, uuid, text, text) to service_role;
