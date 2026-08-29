-- Ticketing can publish at most three events at the same time.
drop index if exists public.one_active_event;

create or replace function public.enforce_active_event_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  active_count integer;
begin
  if tg_op = 'UPDATE' then
    if old.status = 'active'::public.event_status then
      return new;
    end if;
  end if;

  if new.status = 'active'::public.event_status then
    -- Serialize concurrent activations so two admins cannot both take the last slot.
    perform pg_advisory_xact_lock(82173403);

    select count(*)
    into active_count
    from public.events
    where status = 'active'::public.event_status
      and id <> new.id;

    if active_count >= 3 then
      raise exception 'active_event_limit_reached'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists events_active_limit on public.events;
create trigger events_active_limit
before insert or update of status on public.events
for each row execute function public.enforce_active_event_limit();

revoke all on function public.enforce_active_event_limit()
  from public, anon, authenticated;

create or replace function public.admin_set_event_status(
  target_id uuid,
  target_status public.event_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.events
  set status = target_status
  where id = target_id;

  if not found then raise exception 'event_not_found'; end if;
end;
$$;

revoke all on function public.admin_set_event_status(uuid, public.event_status)
  from public, anon, authenticated;
grant execute on function public.admin_set_event_status(uuid, public.event_status)
  to service_role;
