-- The server actions use service_role and enforce the same primary-role check.
-- Direct Data API writes must not inherit Board's general recruitment access.
create or replace function private.guard_interview_invitation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  requires_super_admin boolean := false;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_table_name = 'membership_applications' then
    if tg_op = 'INSERT' then
      requires_super_admin := new.status in ('selected_for_interview', 'interview_scheduled', 'interview_completed');
    elsif new.status is distinct from old.status then
      requires_super_admin := new.status in ('selected_for_interview', 'interview_scheduled')
        or (new.status = 'interview_completed' and old.status not in ('selected_for_interview', 'interview_scheduled'));
    end if;
  elsif tg_table_name = 'interviews' then
    if tg_op = 'INSERT' then
      requires_super_admin := true;
    else
      requires_super_admin := new.application_id is distinct from old.application_id
        or (old.status = 'cancelled' and new.status <> 'cancelled');
    end if;
  elsif tg_table_name = 'notifications' then
    requires_super_admin := new.template_key = 'interview_invitation';
  end if;

  if requires_super_admin and not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.membership_status = 'active'
  ) then
    raise exception 'Only Super Admin can send interview invitations'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_interview_invitation() from public, anon, authenticated;

create trigger guard_interview_selection
before insert or update on public.membership_applications
for each row execute function private.guard_interview_invitation();

create trigger guard_interview_creation
before insert or update on public.interviews
for each row execute function private.guard_interview_invitation();

create trigger guard_interview_email
before insert or update on public.notifications
for each row execute function private.guard_interview_invitation();
