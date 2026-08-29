# SavaPass security operations runbook

Status: required launch procedure. The club must assign the named roles and approve
the retention/legal sections before production use.

## Owners to assign

| Responsibility | Required owner |
|---|---|
| Incident lead and final go/no-go | SavaPass maintainer |
| Supabase, Vercel, Resend and domain access | Infrastructure owner |
| Member/candidate communication | Interact board representative |
| Privacy requests and incidents involving minors | Data-protection/legal owner |

Do not keep shared admin credentials. Every privileged action must map to one person.

## First 15 minutes of an incident

1. Stop the affected flow without deleting evidence. Disable public checkout or
   recruitment if integrity or personal data may be affected.
2. Record UTC start time, reporter, affected service, deployment commit and known
   accounts. Keep provider logs and audit rows read-only.
3. Revoke the narrowest compromised access first: user sessions, test accounts,
   API key, webhook secret or service-role key. Never paste a replacement secret in
   chat, an issue, logs or Git.
4. Preserve a database export and affected Storage object inventory before repair.
5. Escalate any suspected exposure of candidate/member data immediately to the
   data-protection/legal owner. That owner decides notification duties and timing.

## Containment playbooks

### Privileged account

- Disable the account and revoke sessions in Supabase Auth.
- Remove its operational roles and rotate any shared/test password.
- Review `audit_logs`, Auth logs and role assignments from the last known-good time.
- Restore access only with a personal account, MFA and a documented owner.

### Secret or provider credential

- Rotate the credential at its provider, update the matching Vercel environment,
  redeploy, and verify the old credential fails.
- QR signing-secret rotation is exceptional because it invalidates issued tickets;
  stop sales and plan ticket reissue before changing it.

### Database or Storage integrity

- Freeze writes, capture row counts/checksums and export the affected data.
- Restore only into a non-production Supabase project first.
- Run migrations, security tests, role-policy tests, ticket concurrency tests and
  Storage checks there before any production recovery.
- Storage must be inventoried and restored separately from the Postgres dump.

## Required launch evidence

- A clean Git commit reproduces the deployed build and all migrations are tracked.
- An encrypted off-site database backup exists on an approved schedule.
- A separate encrypted Storage backup exists for required objects.
- A non-production restore drill records duration, row counts, object counts and
  checksums. The club explicitly approves its recovery point and recovery time.
- Production test accounts are disabled, staff MFA is enforced, leaked-password
  protection is enabled and the Supabase Security Advisor has no unresolved warning.
- `CRON_SECRET` is configured; unauthorized cron calls return 401 and a missing
  configuration returns 503.

## Monitoring and escalation

Configure alerts for repeated admin login failures, role changes, service-role use,
rate-limit spikes, failed notification retries, migration failures and backup/restore
failures. Every alert needs an owner, destination and tested acknowledgement path.

## Data-rights requests

Do not approve export or deletion from possession of an email address alone. The
data-protection/legal owner must approve an identity-verification method, record the
request and deadline, locate data across Supabase, email and backups, review legal
retention duties, execute the approved action, and keep evidence without retaining
unnecessary personal data. Rules for minors, consent, retention periods and parental
involvement require legal approval before the next recruitment campaign.

## Close-out

Document cause, affected records, containment, rotated access, recovery evidence and
follow-up owner. Re-enable a stopped flow only after the incident lead and relevant
privacy owner approve the retest evidence.
