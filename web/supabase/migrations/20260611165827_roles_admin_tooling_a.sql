do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'staff_role'
      and e.enumlabel = 'organizer'
  ) and not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'staff_role'
      and e.enumlabel = 'scanner'
  ) then
    alter type public.staff_role rename value 'organizer' to 'scanner';
  end if;
end $$;

alter type public.staff_role add value if not exists 'statistici';
