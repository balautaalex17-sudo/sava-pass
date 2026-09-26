-- Department changes are requests, not edits to the member's authorization role.
create table public.member_department_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id),
  from_department text not null check (from_department in ('hr', 'pr')),
  to_department text not null check (to_department in ('hr', 'pr')),
  reason text not null check (char_length(btrim(reason)) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text check (char_length(review_note) <= 1000),
  check (from_department <> to_department),
  check (reviewed_by is null or reviewed_by <> member_id),
  check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null and review_note is null)
    or (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
  )
);
create unique index member_department_requests_one_pending_idx
  on public.member_department_requests(member_id) where status = 'pending';
create index member_department_requests_member_idx on public.member_department_requests(member_id, created_at desc);
create index member_department_requests_status_idx on public.member_department_requests(status, created_at desc);
create index member_department_requests_reviewer_idx on public.member_department_requests(reviewed_by);

alter table public.member_department_requests enable row level security;
revoke all on public.member_department_requests from public, anon, authenticated;
grant select on public.member_department_requests to authenticated;
grant all on public.member_department_requests to service_role;
create policy member_department_requests_read on public.member_department_requests
for select to authenticated using (
  (select private.has_permission('update_own_profile')) and (
    member_id = (select auth.uid()) or exists (
      select 1 from public.profiles p where p.id = (select auth.uid())
      and p.role in ('board', 'admin') and p.membership_status = 'active'
    )
  )
);

create function public.get_member_department_balance()
returns jsonb language sql stable security invoker set search_path = '' as $$
  with counts as (
    select count(*) filter (where p.member_department = 'hr') as hr,
           count(*) filter (where p.member_department = 'pr') as pr
    from public.profiles p where p.membership_status = 'active'
      and coalesce(p.role::text, '') not in ('board', 'admin')
      and not exists (select 1 from public.profile_roles r where r.profile_id = p.id and r.role::text in ('board', 'admin'))
  )
  select jsonb_build_object('hr', hr, 'pr', pr, 'blockedDepartment', case
    when hr * 10 > (hr + pr) * 7 then 'hr'
    when pr * 10 > (hr + pr) * 7 then 'pr' else null end) from counts;
$$;

create function public.submit_member_department_request(p_member_id uuid, p_reason text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_options jsonb;
  v_from text;
  v_to text;
  v_id uuid;
begin
  if p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then
    return jsonb_build_object('result', 'invalid');
  end if;
  perform 1 from public.profiles where id = p_member_id for update;
  v_options := public.get_member_department_options(p_member_id);
  if v_options->>'result' <> 'already_selected' then
    return jsonb_build_object('result', 'ineligible');
  end if;
  v_from := v_options->>'department';
  v_to := case when v_from = 'hr' then 'pr' else 'hr' end;
  insert into public.member_department_requests(member_id, from_department, to_department, reason)
    values (p_member_id, v_from, v_to, btrim(p_reason))
    on conflict (member_id) where status = 'pending' do nothing returning id into v_id;
  if v_id is null then return jsonb_build_object('result', 'already_requested'); end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (p_member_id, 'department.requested', 'member_department_requests', v_id::text,
      jsonb_build_object('from_department', v_from, 'to_department', v_to));
  return jsonb_build_object('result', 'submitted');
end;
$$;

create function public.review_member_department_request(p_request_id uuid, p_actor_id uuid, p_decision text, p_note text default '', p_accept_imbalance boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_request public.member_department_requests%rowtype;
  v_options jsonb;
  v_balance jsonb;
begin
  -- Share the initial-selection lock so two approvals or choices cannot race a recount.
  perform pg_catalog.pg_advisory_xact_lock(735021, 1);
  perform 1 from public.profiles where id = p_actor_id
    and role in ('board', 'admin') and membership_status = 'active' for share;
  if not found then return jsonb_build_object('result', 'unauthorized'); end if;
  if p_decision is null or p_decision not in ('approved', 'rejected')
    or char_length(coalesce(p_note, '')) > 1000 then
    return jsonb_build_object('result', 'invalid');
  end if;
  select * into v_request from public.member_department_requests where id = p_request_id for update;
  if not found then return jsonb_build_object('result', 'not_found'); end if;
  if v_request.member_id = p_actor_id then return jsonb_build_object('result', 'self_review'); end if;
  if v_request.status <> 'pending' then return jsonb_build_object('result', 'already_reviewed'); end if;

  if p_decision = 'approved' then
    perform 1 from public.profiles where id = v_request.member_id for update;
    v_options := public.get_member_department_options(v_request.member_id);
    if v_options->>'result' <> 'already_selected'
      or v_options->>'department' <> v_request.from_department then
      return jsonb_build_object('result', 'stale_request');
    end if;
    v_balance := public.get_member_department_balance();
    if v_balance->>'blockedDepartment' = v_request.to_department and not coalesce(p_accept_imbalance, false) then
      return v_balance || jsonb_build_object('result', 'balance_warning');
    end if;
    update public.profiles set member_department = v_request.to_department where id = v_request.member_id;
  end if;
  update public.member_department_requests set status = p_decision, reviewed_by = p_actor_id,
    reviewed_at = now(), review_note = nullif(btrim(coalesce(p_note, '')), '') where id = p_request_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (p_actor_id, 'department.reviewed', 'member_department_requests', p_request_id::text,
      jsonb_build_object('member_id', v_request.member_id, 'from_department', v_request.from_department,
        'to_department', v_request.to_department, 'decision', p_decision,
        'balance_override', p_decision = 'approved' and coalesce(v_balance->>'blockedDepartment' = v_request.to_department, false)));
  return jsonb_build_object('result', 'reviewed');
end;
$$;

revoke all on function public.get_member_department_balance() from public, anon, authenticated;
revoke all on function public.submit_member_department_request(uuid, text) from public, anon, authenticated;
revoke all on function public.review_member_department_request(uuid, uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.get_member_department_balance() to service_role;
grant execute on function public.submit_member_department_request(uuid, text) to service_role;
grant execute on function public.review_member_department_request(uuid, uuid, text, text, boolean) to service_role;
comment on column public.profiles.member_department is
  'HR/PR member category. Initial balanced choice; subsequent changes require Board approval. Board and Super Admin are excluded.';
