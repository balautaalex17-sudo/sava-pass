-- Harden membership application inserts (code-review finding #1).
--
-- The /devino-membru server action (submitApplication) writes via the service-role
-- client, which BYPASSES RLS — so the public anon INSERT policy is not needed for the
-- form to work. While present, it let a direct anon-key REST call bypass the action's
-- zod/GDPR validation entirely: forge a row (e.g. status='accepted', which is in the
-- CHECK enum so nothing rejected it) or flood the staff queue with unthrottled inserts.
--
-- Dropping the policy closes the bypass with zero impact on the real form path.
-- (If client-side submission is ever needed, re-add a scoped policy:
--  with check (status = 'new' and source = 'web').)

drop policy if exists "anyone can submit a membership application"
  on public.membership_applications;
