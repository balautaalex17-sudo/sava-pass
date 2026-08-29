# SavaPass Members Dashboard

The member and board dashboards extend the existing Next.js and Supabase app. They use the existing Supabase Auth users, `profiles`, event, order, and ticket records. No second authentication system or database was added.

## Staff test access

The recruitment page can expose a hidden staff-role login for development and
Vercel Preview testing. It uses real Supabase Auth users whose primary role or
additive `profile_roles` assignment is `admin`, `board`, `scanner`, or
`interviewer`; passwords remain server-only and are never sent to the browser.

The panel appears only when all checks pass: `STAFF_TEST_LOGIN_ENABLED=true`, the
request is from localhost or a Vercel Preview deployment, and the `?staff=` route
key matches `STAFF_TEST_LOGIN_ROUTE_KEY`. Login also requires
`STAFF_TEST_LOGIN_CODE`. On Vercel, the enable flag and credentials must be scoped
only to the Preview environment, so Production remains disabled. Run
`npm run seed:staff-test` to create or repair the four marked test accounts after
setting the environment variables from `.env.local.example`.

## Routes and access

- `/membru`: active-member overview, next meeting, attendance summary, and recent meetings.
- `/membru/qr`: the member's temporary attendance QR.
- `/membru/intalniri`, `/membru/prezenta`, `/membru/profil`: own meetings, own attendance, and editable profile fields.
- `/board`: permission-aware operational overview.
- `/board/echipa`: Board promotion plus ticket-scanner and interviewer assignment; both operational roles can be assigned to one member.
- `/board/intalniri`: meeting editor plus desktop month calendar and mobile agenda.
- `/board/scaneaza-prezenta`: meeting attendance scanner. A meeting must be selected and its attendance window must be open.
- `/board/scaneaza-bilete`: cash-aware ticket inspection, payment confirmation, and check-in.
- `/board/prezenta`: meeting roster, CSV export, and audited corrections.
- `/board/formular-inscrieri`: public recruitment open/closed schedule and closed-state message.
- `/board/inscrieri`: legacy route that redirects to the unified Formulare workspace.
- `/board/evenimente`: create, edit, publish, and archive the events shown on the public site.
- `/board/interviuri`: the single Formulare workspace. The Formulare tab contains candidate answers, private traffic-light reviews, and the Board selection action. The Interviuri tab contains only selected candidates, scheduling context, and clearly provisional criteria.
- `/board/istoric-scanari`: attendance and ticket scan audit history.
- `/board/membri`, `/board/permisiuni`: Board and super-admin management tools.

All pages, Server Actions, and API routes repeat their authorization checks on the server. The proxy refreshes sessions and redirects guests, but it is not the security boundary.

## Member account invitations

Adding a member from `/board/membri`, or accepting a recruitment candidate, creates a 12-digit SavaPass activation code with no time expiry. SavaPass saves only an HMAC fingerprint in a private database table, saves the member profile, and then sends the branded invitation through Resend.

The recipient opens `/invite`, enters the invited email and numeric code, chooses a password, and is redirected to the dashboard allowed by the database profile. The code stays valid until its first successful use, creates a session only, and never decides the role. Board users can replace an unused code from the member list when delivery fails; replacement explicitly invalidates the previous code. Plain codes and passwords are never written to the database or audit logs.

## Roles and permissions

Every active profile receives the immutable member baseline:

- `view_member_dashboard`
- `view_own_attendance`
- `display_member_qr`
- `update_own_profile`

`admin` and `board` are protected primary roles. Both always have every
dashboard permission, including member management, permission mappings,
imports, attendance corrections, ticket scanning, and interview management.
Their full access cannot be reduced from the permission matrix.

`scanner` and `interviewer` are additive operational roles stored in
`profile_roles`, so one existing member can hold either or both without a second
account. Their capabilities still come from `role_permissions`: `scanner` can
inspect tickets, confirm cash, and check in; `interviewer` can privately evaluate
candidate forms and see candidates assigned to them for interviews. All staff remain members
and retain their own QR/history. Marking a profile inactive removes every role's
access.

An authorized Board or super-admin user can promote an active profile to the
primary `board` role directly from `/board/echipa`. Board promotion/demotion is
atomic, audited, unavailable for protected Super Admin/Statistici profiles, and
a Board user cannot remove their own administrative access.

## Public recruitment and events

The public recruitment state is derived on the server from the campaign status, opening/closing dates, active form, and application limit. When closed, both `/devino-membru` and the homepage show the configured locked message, and the submission Server Action repeats the same checks before any insert. Campaign publication uses a service-role-only database function, so a browser session cannot call it directly.

Only an `active` event appears as the homepage event. Board users can save drafts, explicitly publish one event, and archive it later. Existing ticket, order, and cash-payment records remain attached to the original event tables.

## Private form evaluations

Every evaluator records one verdict per application form: `green` (recommended), `yellow` (discuss), or `red` (not recommended), together with a required comment. The unique `(application_id, reviewer_id)` database constraint prevents duplicate rows and makes a later save update that evaluator's own review.

Evaluations live in `application_evaluations`; the former `interview_evaluations` table is a read-only legacy archive. Row Level Security lets an evaluator select and update only rows whose `reviewer_id` matches their authenticated profile, while Board and super admins may inspect the complete per-author result. The Server Action repeats the permission check, forces `reviewer_id` from the session, and writes only the color to the audit log, never the private comment. No user can submit or edit an evaluation as another person.

Run `npm run seed:interviewer-examples` after `npm run seed:staff-test` to create four clearly marked example candidates for the test evaluator/interviewer. The seed provides green, yellow, and red form examples plus one unevaluated candidate, and is idempotent for existing example rows.

## QR security

Member QR tokens use `SPM1.<payload>.<HMAC>` and expire after 90 seconds. The payload contains the `member_attendance` purpose, an opaque `member_ref`, version, issue/expiry timestamps, and a random nonce. It contains no name, email, auth user ID, or database member ID. The client refreshes the server-rendered QR every 60 seconds and whenever the page becomes visible.

New ticket QR tokens use `SPT2` with the strict `event_ticket` purpose. Existing `SP1` tickets remain readable for migration compatibility. Attendance rejects ticket tokens and the ticket scanner rejects member tokens before any mutation. Logs keep only a SHA-256 fingerprint, never the complete token.

`record_meeting_attendance()` and `check_in_ticket()` lock or constrain the affected rows inside Postgres. Unique indexes make repeated and concurrent scans idempotent. A board member cannot scan their own member QR. Manual attendance changes use a reasoned correction record instead of deleting history.

## Cash ticket lifecycle

Ticket states are `reserved`, `paid`, `checked_in`, `cancelled`, and `expired`.

- `reserved`: identifies a reservation but does not grant entry.
- `paid`: cash was confirmed and the ticket may be checked in.
- `checked_in`: entry already occurred; the original timestamp and scanner are returned.
- `cancelled` and `expired`: entry is rejected with the exact state.

Cash confirmation and check-in are separate deliberate server operations. Both write operational scan history and audit records. Complimentary admin tickets create an explicit zero-value paid order.

## Recruitment schema and import

The active `recruitment_forms` version owns ordered `recruitment_fields`. Version 1 contains the 14 exact headers inspected from the supplied Google Sheet, including the source line break and trailing space. Imported values are stored in both mapped `answers` and exact-header `source_payload`; unknown columns remain in `source_payload`.

The import accepts server-side CSV or XLSX parsing with limits of 10 MB, 5,000 data rows, and 200 columns. It previews the actual header row, matches exact headers, lets an authorized admin preserve or map unknown fields, and deduplicates by an explicit source ID or normalized email plus source timestamp. Re-importing updates source answers without overwriting board-owned status or reviewer assignments.

Completion is recalculated by a database trigger from the active form's required and conditional fields. Whitespace-only answers are incomplete. The table shows missing fields, while long answers retain line breaks in the details drawer.

## Environment variables

See `.env.local.example`.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `QR_SIGNING_SECRET` (server only, at least 32 random characters)
- `NEXT_PUBLIC_SITE_URL`
- `RESEND_API_KEY` for existing ticket email delivery
- `RESEND_FROM` for ticket and member-account emails; it must use a Resend-verified domain

Production should also enable Supabase Auth leaked-password protection in the project dashboard. Keep the service-role key and QR secret out of browser bundles and logs.

## Database and verification

Dashboard migrations are in `supabase/migrations/20260813110333_*` through
`20260815120000_*`. They define canonical ticket states, permissions, meetings,
attendance, corrections, scan rate limits, recruitment schemas/imports, private
form evaluations, additive operational roles, Board/admin equivalence,
public campaign controls, indexes, RLS policies, private RLS helpers, and atomic
RPCs.

Run before deployment:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The integration tests create isolated temporary Supabase users and records, test concurrent attendance and ticket scans against the real database functions, and remove their fixtures afterward.
