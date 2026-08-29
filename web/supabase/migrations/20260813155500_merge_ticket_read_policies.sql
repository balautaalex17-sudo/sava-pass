-- One SELECT policy avoids evaluating two permissive policies per ticket row.
-- Buyers retain access only to their own email-bound ticket; board access stays
-- permission-based.
drop policy if exists tickets_board_read on public.tickets;
drop policy if exists tickets_buyer_read on public.tickets;

create policy tickets_authenticated_read
on public.tickets
for select
to authenticated
using (
  ((select auth.jwt()) ->> 'email') = holder_email
  or private.has_permission('scan_event_tickets')
);
