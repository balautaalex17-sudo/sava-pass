# Interview invitation permissions

Only an active primary Super Admin (`profiles.role = 'admin'`) may select candidates for interviews or send/retry interview invitations. Board retains form evaluation, reviewer assignment, rejection, completion of already selected interviews, and final acceptance. General recruitment permissions and operational role assignments cannot delegate interview selection.

The recruitment page supplies the permission to both form results and advanced application management. Server actions check the current primary role before selecting a candidate or sending email. The database additionally guards direct writes to application stages, interview creation/reassignment/reactivation, and invitation notifications.

## Production release, 11 September 2026

- Site: https://www.interactsfsava.com
- Source commit: `38030051b1815fce7754665aa969868a862e1ab6` on `codex/super-admin-interview-invitations`.
- Deployment: `dpl_C3k2NuqqmKCKCW9FkuDQ5SRaZrpf`, https://sava-pass-dv0mznwg6-nexuswork.vercel.app, Ready and promoted.
- Previous production deployment: `dpl_6zx79LfHyPFSgtKzdtjHrVo8mEfB`.
- Based on the current production code plus its release records (`80b3074`), preserving the personal unrated filter and attendance grace period. Unrelated local immersive-site changes were excluded.
- Production Supabase project: `shzyvrojbtbczqqoilip`. Migration `20260911185035_restrict_interview_invitations_to_super_admin.sql` was applied before promotion. Its filename matches the version recorded by Supabase. Staging was not changed.
- The app was built from a clean commit with production environment settings, checked at its deployment URL, then promoted without rebuilding. Build duration reported by Vercel: 19 seconds.

## Verification

- 32 focused tests passed, covering Board denial, Super Admin selection and email, advanced status bypass attempts, UI controls, database guards, and existing recruitment/account behavior. Tests used inert adapters and disposable in-memory Postgres, with no live data changes or messages.
- Type checking, lint of changed files, and the Vercel production build passed.
- After migration, verified the three enabled database triggers and the deployed function definition. It uses invoker permissions and an empty search path.
- Live homepage and login return HTTP 200; unauthenticated recruitment access redirects to login. An authenticated browser session showed the Super Admin recruitment page, the interview action, and the personal unrated filter. Board denial was verified with automated fixtures, not a live Board account.
- The new deployment's error/fatal runtime log scan at 18:52 UTC returned no matching logs. No persistent monitor was created.
- Supabase advisors reported no findings for the new function/triggers. Separate existing findings remain: [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), and [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) on the server-only `private.member_activation_codes` table.

The database test was rerun successfully after aligning the migration filename with Supabase's recorded version. This follow-up changes migration bookkeeping and documentation only; the deployed application code remains commit `3803005`.

For a later acceptance check, sign in as Board and confirm invitation controls are absent while form evaluations remain available. No real candidates were selected or emailed during this release.

Reverting to the previous app deployment would restore its former invitation behavior through server actions. Keep the database guards unless deliberately reverting the permission policy too.
