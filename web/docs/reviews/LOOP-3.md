# Loop 3 - Product usability and production-readiness review

Date: 2026-08-03

## Findings and severity

| Severity | Finding | Correction |
|---|---|---|
| Critical | A QR check-in must not succeed twice, including simultaneous scan attempts. | Kept the read state for clear feedback and made the write conditional on `status = valid`; only one update can move the ticket to `in`. Later attempts return already scanned. |
| High | Past events could remain marked active in data and reach checkout. | Added a shared date/status booking guard to event discovery, event detail, and checkout. |
| High | Recruitment lacked a candidate-visible state trail and end-to-end interview lifecycle. | Added campaign/department data, draft support, public status tokens, timelines, interview scheduling/rescheduling, notes, scoring, final decisions, and candidate notifications. |
| High | Interview scheduling needed conflict and workload visibility. | Added periods, slots, room/link assignment, interviewer assignment, overlap detection, calendar/table/candidate/workload views, and bulk scheduling. |
| High | Notification operations needed traceability and recovery. | Added editable templates, previews, tests, individual/bulk queueing, delivery state, attempts, failure retry, and a secret-protected due-delivery endpoint. |
| High | Media choice needed human control and provenance. | Added automatic deterministic ranking, reasons and alternatives, manual override, pin/exclude/archive, focal points, crop previews, source labels, duplicate hashes, and audit logs. |
| Medium | Staff routes needed explicit role boundaries. | Added admin/staff/interviewer helpers and RLS policies; interviewer access is limited to assigned candidate records. |
| Medium | Supabase advisors found missing foreign-key indexes and repeated auth-function evaluation in RLS. | Added targeted indexes and changed policies to evaluate auth helpers once per statement. |

## Transactional workflow test

A full SQL scenario ran inside `BEGIN`/`ROLLBACK` against the connected Supabase project. Every assertion returned true:

- first ticket scan becomes valid/in;
- duplicate scan updates zero rows;
- void and inactive tickets map to manual states;
- application follows submitted, under review, selected for interview;
- overlapping interviewer assignment is detected;
- schedule and reschedule write history;
- private notes, score 88, accepted decision, and candidate timeline persist;
- slot capacity guard blocks overflow;
- failed notification returns to queued and increments attempts;
- media automatic choice, override, pin, exclusion, crops, and duplicate hash guard work;
- important actions produce audit-log rows.

The transaction was rolled back. Post-test counts were zero for the temporary event, application, media asset, and audit rows.

## Browser and authorization checks

- Candidate status page passed status, interview, history, messages, privacy, and console checks. Evidence: `active/review/loop3-final/candidate-status-results.json` and `candidate-status-mobile.png`.
- Recruitment wizard passed client validation and draft steps through the ready-to-submit screen. Evidence: `active/review/loop3-final/recruitment-mobile-ready.png`.
- `/admin`, `/admin/media`, `/admin/interviuri`, `/admin/notificari`, and `/scanner` redirect unauthenticated users to `/login?next=...`.
- `/api/notifications/due` returns 401 without its bearer secret.
- Deterministic media-selection smoke test passed authentic-first ranking, exclusion filtering, explanation, and reuse diversity.

## Test-harness note

`scripts/product-flow-smoke.mjs` was not counted as a pass. Its first two runs failed because the harness expected a literal HTTP 404 for a streamed Next.js not-found page, then expected `/conta` instead of the app's correct `/login` authorization redirect. The expectations were corrected, but the project rule says to stop after the same command fails twice, so it was not run a third time.

## Production tests not claimed

- No live Stripe charge or refund was made.
- No real provider email was delivered and no SMS provider is integrated.
- No authenticated admin browser session was available for a camera/device scan or every staff form.
- The notification due endpoint exists, but `CRON_SECRET` and a production scheduler still need configuration.
- Capacity is checked before checkout and again on the webhook, but the final-seat check is not a database-level reservation lock for extreme simultaneous payments.

