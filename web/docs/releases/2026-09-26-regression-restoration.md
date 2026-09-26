# Approved regression restoration, 26 September 2026

## Source and scope

The user approved restoration after the numbered regression audit. Branch:
`codex/restore-regressions`.

Baseline commit `883f7b2` captures the actual production runtime source from
`active/releases/instagram-map-20260926/web`, deployed as
`dpl_HVVut4SQ4DgeB2PNykjcY5ibRtVe`. Git alone was behind that deployed source.
Restorations were integrated into this baseline, rather than replacing it with
an older release. Historical implementations were recovered primarily from
`active/releases/indefinite-reservations-20260925/web` and the original commits.

## Restored audit items

1. **Personal evaluation filter:** Board's “Neevaluate de mine” excludes only
   candidates evaluated by the current viewer. Global “Neevaluate”, search,
   evaluator-only visibility, and the compact candidate rows are preserved.
2. **Attendance after three hours:** no runtime restoration was needed. Tests
   confirm the boundary is `ends_at + 3 hours`, not the start or confirmation
   deadline. Active members and recruits are included; draft/cancelled meetings
   are excluded, presence wins, approved requests excuse absence, and pending
   or rejected requests do not. Results are derived when requested, not written
   by a new scheduler. Read-only checks on a finished live meeting found the
   expected derived present/absent/excused results.
3. **Recruitment dates:** the five stages appear on membership, home and campaign
   management. The deadline remains dynamic in Bucharest time; following stages
   retain 1 October, 2–4 October, 6–7 October and 8 October.
4. **Description formatting:** preserved newlines and paragraph spacing on both
   event presentations.
5. **Session renewal:** renewed cookies reach both the browser and server page,
   including redirects; login destinations retain their query strings and fresh
   login replaces stale authenticated navigation state.
6. **Interview invitations:** primary Super Admin restriction restored in both
   UI and server actions. Board keeps permitted evaluation and rejection work.
7. **HR/PR selection:** required selection for eligible active members, the
   original labels, and the strict greater-than-75% rule. Unassigned eligible
   members count in the denominator; Board/Admin operational roles, recruits
   and inactive accounts are excluded.
8. **Department transfers:** member requests, Board review, history, fresh
   imbalance confirmation, stale/duplicate checks and no self-review.
9. **Member lists:** department badges, filters, sorting and responsive spacing.
10. **Event registrations:** permission-guarded list, filters and XLSX export.
11. **Reservation lifetime:** new public reservations have the legacy deadline
    cleared before delivery, admin-issued tickets have no deadline, and signed
    event QR tokens rely on database ticket status. Member attendance QR expiry
    and signature/type checks remain enforced. Existing expired ticket rows
    were not reactivated or backfilled.
12. **Checkout page:** standalone checkout with selected-ticket links, form-state
    preservation between steps and legacy `?checkout=1` redirects.
13. **Public availability:** exact remaining counts and the capacity bar hidden;
    genuine sold-out and unavailable states remain enforced.
14. **Attendance filters:** selection automatically navigates with the latest
    values; other shared filters keep explicit submission.
15. **Public navigation:** unwanted loading placeholders removed, retaining the
    current screen while the destination loads. Newer dashboard loading
    boundaries remain.
16. **Intentional changes retained:** compact candidate layout and removal of
    redundant decision badges/recruitment preview were not reversed.

The Instagram map fallback, explicit charitable cause, normalized personal-ticket
email filter, password recovery, activation/invitation safeguards, event lifecycle,
scan permissions, newer gallery/Board visuals and upload fixes are preserved.

## Database and deployment safeguards

Five historical migration files were recovered into version control for source
completeness. **No migration was applied**, and no scheduled job was changed.
Read-only Data API inspection confirmed the department column, requests table,
required RPCs and their expected response shape already exist. Management access
did not permit fresh type generation or inspection of every deployed function
definition; the relevant previously generated definitions were merged into the
current types without removing newer fields.

No real reservation, email, interview invitation, department assignment,
attendance correction or historical backfill was submitted during verification.
Sensitive environment values remain ignored and excluded from deployment uploads.

## Verification

- Production build and TypeScript check passed; changed JavaScript/TypeScript
  files passed ESLint; the diff passed whitespace checks.
- **104 targeted tests passed, zero failures or skips.** These include the real
  action modules with inert adapters, session/cookie transitions, role checks,
  recruitment account protection, attendance timing, spreadsheet output,
  reservation deadline clearing/failure/retry behavior, and QR validation.
- The database subset used disposable local PGlite databases, with the historical
  SQL functions and policies. It did not connect to the production database.
- `node scripts/verify-restored-ui.mjs` passed at 390 and 1440 pixels using actual
  React components and inert actions: personal filter/search, evaluator scope,
  invitation visibility, member filters/sort, attendance navigation, selection
  and transfer-warning confirmation. This is an interaction fixture, not a full
  authenticated production session.
- `node scripts/verify-restored-public.mjs http://localhost:3407` passed at 390 and
  1440 pixels: dates, whitespace, counts, checkout, retained form values, legacy
  redirects, export authentication and Board login destinations. A held checkout
  response verified retained content during navigation. An Android Instagram
  user-agent check verified no Google Maps iframe and an available Maps link.

Remaining manual checks: actual Samsung S23 Instagram behavior, authenticated
production roles with their real sessions, and real delivery/scanning during
normal operations. Browser checks did not make purchases or send messages.

## Release

- Status: **READY, promoted to production** on 26 September 2026.
- Runtime commit: `7e693048352edd86349854675d26d29fafba78c1`, pushed to
  `origin/codex/restore-regressions`.
- Framework: Next.js 16.3.1; remote build duration: 59 seconds.
- Deployment: `dpl_H7nH9TgWjkVvo7B6rxDLHX381HS7`.
- Immutable URL: https://sava-pass-1v2x9tksv-nexuswork.vercel.app
- Main site: https://interactsfsava.com
- Built with the existing production environment and `--skip-domain`. The public
  browser verification passed on the immutable candidate before promotion,
  then passed again on the main domain after promotion. Both runs included phone
  and desktop widths, held-response navigation and the Instagram fallback.
- Read-only zero-row queries for the registrations joins, profile departments
  and department requests returned HTTP 200 against the existing database.
- Post-release error-log query for this deployment returned no error entries in
  the ten-minute verification window. Drains and ongoing monitoring configuration
  were not inspected or changed; this is a release smoke check, not monitoring.
- Rollback target: `dpl_HVVut4SQ4DgeB2PNykjcY5ibRtVe`, the prior map-fixed release.

The older partial dates/spacing candidate was not promoted. A documentation-only
commit records these release results after the runtime commit above.
