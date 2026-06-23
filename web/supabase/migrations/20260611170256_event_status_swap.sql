create or replace function public.admin_set_event_status(
  target_id uuid,
  target_status public.event_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_status = 'active' then
    update public.events
    set status = 'past'
    where status = 'active'
      and id <> target_id;
  end if;

  update public.events
  set status = target_status
  where id = target_id;

  if not found then
    raise exception 'event_not_found';
  end if;
end;
$$;

revoke all on function public.admin_set_event_status(uuid, public.event_status) from public;
revoke all on function public.admin_set_event_status(uuid, public.event_status) from anon;
revoke all on function public.admin_set_event_status(uuid, public.event_status) from authenticated;
grant execute on function public.admin_set_event_status(uuid, public.event_status) to service_role;
