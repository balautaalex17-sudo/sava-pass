-- Recruitment acceptance grants recruit access. Full membership is a separate
-- Board decision; existing accounts and their higher access are preserved.
alter table public.profiles drop constraint profiles_membership_status_check;
alter table public.profiles add constraint profiles_membership_status_check
  check (membership_status in ('recruit', 'active', 'inactive', 'suspended', 'alumni'));

create or replace function public.accept_recruit_application(
  p_application_id uuid,
  p_user_id uuid,
  p_expected_status text,
  p_actor_id uuid,
  p_reviewer_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.membership_applications%rowtype;
  account_status text;
begin
  if not coalesce(private.profile_has_permission(p_actor_id, 'manage_recruitment_signups'), false) then
    raise exception 'recruit_acceptance_forbidden';
  end if;

  select * into application from public.membership_applications
  where id = p_application_id for update;
  if not found or application.status <> p_expected_status then
    return null;
  end if;
  if application.status not in ('selected_for_interview', 'interview_scheduled', 'interview_completed', 'waiting_list') then
    raise exception 'recruit_acceptance_invalid_stage';
  end if;
  if not exists (
    select 1 from auth.users where id = p_user_id
      and lower(btrim(email)) = lower(btrim(application.email))
  ) then
    raise exception 'recruit_acceptance_email_mismatch';
  end if;

  insert into public.profiles (id, full_name, email, phone, grade, membership_status, role)
  values (p_user_id, application.full_name, lower(btrim(application.email)),
    nullif(application.phone, ''), application.grade, 'recruit', null)
  on conflict (id) do nothing;

  select membership_status into account_status from public.profiles
  where id = p_user_id for update;
  -- Do not downgrade members/Board or silently reactivate suspended accounts.
  if account_status not in ('recruit', 'active') then
    raise exception 'recruit_acceptance_inactive_account';
  end if;

  update public.membership_applications
  set status = 'accepted', reviewer_id = p_reviewer_id
  where id = p_application_id;

  update public.interviews
  set status = 'completed', decision = 'accepted', completed_at = now()
  where application_id = p_application_id and status <> 'cancelled';

  insert into public.application_status_events
    (application_id, actor_id, from_status, to_status, note, visible_to_candidate)
  values (p_application_id, p_actor_id, application.status, 'accepted',
    case when account_status = 'recruit'
      then 'Candidatul a fost acceptat și contul de recrut este pregătit.'
      else 'Candidatul a fost acceptat. Accesul contului existent a fost păstrat.' end, true);

  return account_status;
end;
$$;

revoke all on function public.accept_recruit_application(uuid, uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.accept_recruit_application(uuid, uuid, text, uuid, uuid) to service_role;
