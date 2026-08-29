-- Foreign-key indexes keep dashboard joins and cascading integrity checks fast.
create index if not exists attendance_corrections_actor_idx
  on public.attendance_corrections(actor_id);
create index if not exists attendance_corrections_attendance_idx
  on public.attendance_corrections(attendance_id);
create index if not exists attendance_corrections_member_idx
  on public.attendance_corrections(member_id);
create index if not exists attendance_scans_member_idx
  on public.attendance_scans(member_id);
create index if not exists cash_payment_confirmations_actor_idx
  on public.cash_payment_confirmations(confirmed_by);
create index if not exists meeting_attendance_checked_in_by_idx
  on public.meeting_attendance(checked_in_by);
create index if not exists meeting_attendance_scan_idx
  on public.meeting_attendance(scan_id);
create index if not exists meetings_created_by_idx
  on public.meetings(created_by);
create index if not exists membership_applications_import_idx
  on public.membership_applications(import_id);
create index if not exists profile_permission_overrides_permission_idx
  on public.profile_permission_overrides(permission_key);
create index if not exists profile_permission_overrides_updated_by_idx
  on public.profile_permission_overrides(updated_by);
create index if not exists recruitment_forms_campaign_idx
  on public.recruitment_forms(campaign_id);
create index if not exists recruitment_imports_created_by_idx
  on public.recruitment_imports(created_by);
create index if not exists recruitment_imports_form_idx
  on public.recruitment_imports(form_id);
create index if not exists role_permissions_permission_idx
  on public.role_permissions(permission_key);
create index if not exists tickets_payment_confirmed_by_idx
  on public.tickets(payment_confirmed_by);

-- Super admins can inspect mappings through RLS. Mutations still go through
-- permission-checked server actions using the service-role client.
grant select on public.permissions, public.role_permissions, public.profile_permission_overrides
to authenticated;

create policy permissions_admin_read on public.permissions
for select to authenticated
using (private.has_permission('manage_permissions'));

create policy role_permissions_admin_read on public.role_permissions
for select to authenticated
using (private.has_permission('manage_permissions'));

create policy profile_permission_overrides_admin_read on public.profile_permission_overrides
for select to authenticated
using (private.has_permission('manage_permissions'));

-- Merge overlapping application policies so each operation has one clear
-- authorization rule and the database does not evaluate duplicate policies.
drop policy if exists applications_authorized_read on public.membership_applications;
drop policy if exists applications_permission_read on public.membership_applications;
create policy applications_authorized_read on public.membership_applications
for select to authenticated
using (
  public.can_access_application(id)
  or private.has_permission('view_recruitment_signups')
);

drop policy if exists applications_admin_update on public.membership_applications;
drop policy if exists applications_permission_update on public.membership_applications;
create policy applications_authorized_update on public.membership_applications
for update to authenticated
using (
  public.is_admin()
  or private.has_permission('manage_recruitment_signups')
)
with check (
  public.is_admin()
  or private.has_permission('manage_recruitment_signups')
);
