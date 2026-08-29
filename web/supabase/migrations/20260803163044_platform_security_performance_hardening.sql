-- Follow-up from Supabase's security/performance advisors.

-- These helpers are policy internals, not anonymous RPC endpoints.
revoke all privileges on function public.can_access_application(uuid) from public;
revoke all privileges on function public.can_access_application(uuid) from anon;
grant execute on function public.can_access_application(uuid) to authenticated;

revoke all privileges on function public.is_interviewer() from public;
revoke all privileges on function public.is_interviewer() from anon;
grant execute on function public.is_interviewer() to authenticated;

create or replace function public.is_interviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role::text = 'interviewer'
  );
$$;

create or replace function public.can_access_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.interviews i
    join public.interview_interviewers ii on ii.interview_id = i.id
    where i.application_id = target_application_id
      and ii.profile_id = (select auth.uid())
  );
$$;

-- Public buckets serve public object URLs without a broad list policy.
drop policy if exists "media public read" on storage.objects;

-- The legacy applicants table is orphaned; do not leave an anonymous write API.
drop policy if exists applicants_insert on public.applicants;
revoke insert on public.applicants from anon, authenticated;

-- Cover foreign-key lookups used by admin filters and cascade checks.
create index if not exists application_status_events_actor_idx
  on public.application_status_events(actor_id);
create index if not exists interview_changes_actor_idx
  on public.interview_changes(actor_id);
create index if not exists interview_changes_interview_idx
  on public.interview_changes(interview_id);
create index if not exists interview_changes_old_slot_idx
  on public.interview_changes(old_slot_id);
create index if not exists interview_changes_new_slot_idx
  on public.interview_changes(new_slot_id);
create index if not exists interview_interviewers_slot_idx
  on public.interview_interviewers(slot_id);
create index if not exists interview_periods_campaign_idx
  on public.interview_periods(campaign_id);
create index if not exists media_assets_created_by_idx
  on public.media_assets(created_by);
create index if not exists media_assets_poster_idx
  on public.media_assets(poster_asset_id);
create index if not exists media_placements_pinned_idx
  on public.media_placements(pinned_asset_id);
create index if not exists media_placements_selected_idx
  on public.media_placements(selected_asset_id);
create index if not exists media_placements_updated_by_idx
  on public.media_placements(updated_by);
create index if not exists membership_applications_reviewer_idx
  on public.membership_applications(reviewer_id);
create index if not exists notification_templates_updated_by_idx
  on public.notification_templates(updated_by);
create index if not exists notifications_created_by_idx
  on public.notifications(created_by);
create index if not exists notifications_interview_idx
  on public.notifications(interview_id);
create index if not exists notifications_order_idx
  on public.notifications(order_id);
create index if not exists notifications_template_idx
  on public.notifications(template_key);

-- FOR ALL also applies to SELECT. Split write policies so read policies are
-- evaluated once and stay understandable in the dashboard.
drop policy if exists recruitment_campaigns_admin_write on public.recruitment_campaigns;
create policy recruitment_campaigns_admin_insert on public.recruitment_campaigns
  for insert to authenticated with check (public.is_admin());
create policy recruitment_campaigns_admin_update on public.recruitment_campaigns
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy recruitment_campaigns_admin_delete on public.recruitment_campaigns
  for delete to authenticated using (public.is_admin());

drop policy if exists recruitment_departments_admin_write on public.recruitment_departments;
create policy recruitment_departments_admin_insert on public.recruitment_departments
  for insert to authenticated with check (public.is_admin());
create policy recruitment_departments_admin_update on public.recruitment_departments
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy recruitment_departments_admin_delete on public.recruitment_departments
  for delete to authenticated using (public.is_admin());

drop policy if exists applications_admin_write on public.membership_applications;
create policy applications_admin_insert on public.membership_applications
  for insert to authenticated with check (public.is_admin());
create policy applications_admin_update on public.membership_applications
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy applications_admin_delete on public.membership_applications
  for delete to authenticated using (public.is_admin());

drop policy if exists application_events_admin_write on public.application_status_events;
create policy application_events_admin_insert on public.application_status_events
  for insert to authenticated with check (public.is_admin());
create policy application_events_admin_update on public.application_status_events
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy application_events_admin_delete on public.application_status_events
  for delete to authenticated using (public.is_admin());

drop policy if exists interview_periods_admin_write on public.interview_periods;
create policy interview_periods_admin_insert on public.interview_periods
  for insert to authenticated with check (public.is_admin());
create policy interview_periods_admin_update on public.interview_periods
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy interview_periods_admin_delete on public.interview_periods
  for delete to authenticated using (public.is_admin());

drop policy if exists interview_slots_admin_write on public.interview_slots;
create policy interview_slots_admin_insert on public.interview_slots
  for insert to authenticated with check (public.is_admin());
create policy interview_slots_admin_update on public.interview_slots
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy interview_slots_admin_delete on public.interview_slots
  for delete to authenticated using (public.is_admin());

drop policy if exists interviews_admin_write on public.interviews;
create policy interviews_admin_insert on public.interviews
  for insert to authenticated with check (public.is_admin());
create policy interviews_admin_update on public.interviews
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy interviews_admin_delete on public.interviews
  for delete to authenticated using (public.is_admin());

drop policy if exists interview_interviewers_admin_write on public.interview_interviewers;
create policy interview_interviewers_admin_insert on public.interview_interviewers
  for insert to authenticated with check (public.is_admin());
create policy interview_interviewers_admin_update on public.interview_interviewers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy interview_interviewers_admin_delete on public.interview_interviewers
  for delete to authenticated using (public.is_admin());

drop policy if exists interview_changes_admin_write on public.interview_changes;
create policy interview_changes_admin_insert on public.interview_changes
  for insert to authenticated with check (public.is_admin());
create policy interview_changes_admin_update on public.interview_changes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy interview_changes_admin_delete on public.interview_changes
  for delete to authenticated using (public.is_admin());

drop policy if exists event_ticket_types_admin_write on public.event_ticket_types;
create policy event_ticket_types_admin_insert on public.event_ticket_types
  for insert to authenticated with check (public.is_admin());
create policy event_ticket_types_admin_update on public.event_ticket_types
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy event_ticket_types_admin_delete on public.event_ticket_types
  for delete to authenticated using (public.is_admin());

drop policy if exists interview_interviewers_authorized_read on public.interview_interviewers;
create policy interview_interviewers_authorized_read
on public.interview_interviewers for select to authenticated
using (public.is_admin() or profile_id = (select auth.uid()));

drop policy if exists interview_changes_authorized_read on public.interview_changes;
create policy interview_changes_authorized_read
on public.interview_changes for select to authenticated
using (
  public.is_admin() or exists (
    select 1 from public.interview_interviewers ii
    where ii.interview_id = interview_changes.interview_id
      and ii.profile_id = (select auth.uid())
  )
);
