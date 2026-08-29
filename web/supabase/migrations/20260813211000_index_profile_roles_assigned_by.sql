create index if not exists profile_roles_assigned_by_idx
  on public.profile_roles(assigned_by)
  where assigned_by is not null;
