-- Operational roles are additive. The primary profiles.role column remains the
-- identity role for admin/board and for legacy staff routes.
create table public.profile_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.staff_role not null,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint profile_roles_pkey primary key (profile_id, role),
  constraint profile_roles_operational_role_check check (
    role in ('scanner'::public.staff_role, 'interviewer'::public.staff_role)
  )
);

create index profile_roles_role_profile_idx
  on public.profile_roles(role, profile_id);

alter table public.profile_roles enable row level security;
revoke all on public.profile_roles from public, anon, authenticated;
grant select on public.profile_roles to authenticated;
grant all on public.profile_roles to service_role;

create policy profile_roles_own_read
on public.profile_roles
for select
to authenticated
using (profile_id = (select auth.uid()));

-- Preserve every existing scanner/interviewer assignment while enabling a
-- second operational role to be added later.
insert into public.profile_roles (profile_id, role)
select p.id, p.role
from public.profiles p
where p.role in ('scanner'::public.staff_role, 'interviewer'::public.staff_role)
on conflict do nothing;

-- Board is intentionally equivalent to super admin. Keep explicit rows for the
-- permission matrix and also enforce equivalence in the permission helper below.
insert into public.role_permissions (role_key, permission_key)
select 'board', key
from public.permissions
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'admin', key
from public.permissions
on conflict do nothing;

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

  if not found or v_status <> 'active' then
    return false;
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

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin'::public.staff_role, 'board'::public.staff_role)
      and p.membership_status = 'active'
  );
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.membership_status = 'active'
      and (
        p.role is not null
        or exists (
          select 1 from public.profile_roles pr where pr.profile_id = p.id
        )
      )
  );
$$;

create or replace function private.is_interviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.membership_status = 'active'
      and (
        p.role = 'interviewer'::public.staff_role
        or exists (
          select 1
          from public.profile_roles pr
          where pr.profile_id = p.id
            and pr.role = 'interviewer'::public.staff_role
        )
      )
  );
$$;

-- This server-only RPC replaces scanner/interviewer assignments in one
-- transaction and records the exact before/after state in the audit log.
create or replace function public.set_profile_operational_roles(
  p_profile_id uuid,
  p_roles public.staff_role[],
  p_actor_id uuid
)
returns public.staff_role[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_primary_role public.staff_role;
  v_status text;
  v_roles public.staff_role[];
  v_previous_roles public.staff_role[];
begin
  if not private.profile_has_permission(p_actor_id, 'manage_staff_assignments') then
    raise exception 'unauthorized_staff_assignment';
  end if;

  select p.role, p.membership_status into v_primary_role, v_status
  from public.profiles p
  where p.id = p_profile_id;

  if not found then
    raise exception 'profile_not_found';
  end if;

  if v_status <> 'active' then
    raise exception 'inactive_profile';
  end if;

  if v_primary_role in (
    'admin'::public.staff_role,
    'board'::public.staff_role,
    'statistici'::public.staff_role
  ) then
    raise exception 'protected_primary_role';
  end if;

  select coalesce(
    array_agg(distinct requested_role order by requested_role),
    array[]::public.staff_role[]
  ) into v_roles
  from unnest(coalesce(p_roles, array[]::public.staff_role[])) as requested(requested_role);

  if cardinality(v_roles) > 2 or exists (
    select 1
    from unnest(v_roles) as requested(role)
    where requested.role not in (
      'scanner'::public.staff_role,
      'interviewer'::public.staff_role
    )
  ) then
    raise exception 'invalid_operational_roles';
  end if;

  select coalesce(
    array_agg(pr.role order by pr.role),
    array[]::public.staff_role[]
  ) into v_previous_roles
  from public.profile_roles pr
  where pr.profile_id = p_profile_id;

  -- Retire the legacy single operational role only after the new code edits
  -- this profile. This keeps the migration backwards-compatible during deploy.
  if v_primary_role in (
    'scanner'::public.staff_role,
    'interviewer'::public.staff_role
  ) then
    update public.profiles
    set role = null
    where id = p_profile_id
      and role = v_primary_role;
  end if;

  delete from public.profile_roles pr
  where pr.profile_id = p_profile_id;

  insert into public.profile_roles (profile_id, role, assigned_by)
  select p_profile_id, requested.role, p_actor_id
  from unnest(v_roles) as requested(role);

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_actor_id,
    'staff.operational_roles_changed',
    'profile',
    p_profile_id::text,
    jsonb_build_object(
      'previous_roles', to_jsonb(v_previous_roles),
      'roles', to_jsonb(v_roles)
    )
  );

  return v_roles;
end;
$$;

revoke all on function public.set_profile_operational_roles(
  uuid, public.staff_role[], uuid
) from public, anon, authenticated;

grant execute on function public.set_profile_operational_roles(
  uuid, public.staff_role[], uuid
) to service_role;

comment on table public.profile_roles is
  'Additive scanner/interviewer assignments for one existing member profile.';

comment on function public.set_profile_operational_roles(
  uuid, public.staff_role[], uuid
) is 'Server-only atomic replacement of additive operational roles with audit history.';
