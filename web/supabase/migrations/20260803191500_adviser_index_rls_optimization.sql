-- Safe adviser fixes: covering indexes for foreign keys used by joins/deletes,
-- plus one-time auth lookups in the three legacy RLS policies flagged by Supabase.

create index if not exists orders_event_idx on public.orders(event_id);
create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists projects_event_idx on public.projects(event_id);
create index if not exists scans_scanned_by_idx on public.scans(scanned_by);
create index if not exists scans_ticket_idx on public.scans(ticket_id);
create index if not exists tickets_order_idx on public.tickets(order_id);
create index if not exists tickets_user_idx on public.tickets(user_id);

alter policy profiles_read on public.profiles
using (
  id = (select auth.uid())
  or (select public.is_admin())
);

alter policy tickets_buyer_read on public.tickets
using (
  ((select auth.jwt()) ->> 'email') = holder_email
);

alter policy scans_staff_insert on public.scans
with check (
  scanned_by = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role in ('admin', 'scanner')
  )
);
