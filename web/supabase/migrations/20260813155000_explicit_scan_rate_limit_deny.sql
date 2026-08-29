-- Rate-limit counters are service-only. An explicit deny policy documents that
-- intent for client roles while the service role continues to bypass RLS.
create policy scan_rate_limits_client_deny
on public.scan_rate_limits
for all
to anon, authenticated
using (false)
with check (false);
