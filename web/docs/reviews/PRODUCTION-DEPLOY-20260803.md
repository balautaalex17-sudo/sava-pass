# Production deployment - 2026-08-03

## Current production state

- The release below was rolled back at the user's request.
- Current public target: `sava-pass-g1z05gas7-alex-2027s-projects.vercel.app`
- Current deployment ID: `dpl_DgsTjRVrZWFhxV5VDC329LnjeW4L`
- Original deployment date: 2026-06-29 13:42 EEST
- Verification: public alias HTTP 200; Vercel inspection resolves `sava-pass.vercel.app` to this deployment.
- Recovery: the 2026-08-03 deployment remains Ready as `dpl_4tL6Tp7wTr8ftXZtdbxHG1wRgxGb` and can be promoted again.

## Superseded deploy result

- Public alias while active: `https://sava-pass.vercel.app`
- Deployment URL: `https://sava-pass-i41gzxs6e-alex-2027s-projects.vercel.app`
- Deployment ID: `dpl_4tL6Tp7wTr8ftXZtdbxHG1wRgxGb`
- Inspector: `https://vercel.com/alex-2027s-projects/sava-pass/4tL6Tp7wTr8ftXZtdbxHG1wRgxGb`
- Target/status: production / Ready
- Framework: Next.js 16.2.12
- Remote build: passed in 56 seconds in `iad1`
- Local branch/base commit: `perf/pagespeed-mobile-green` / `9c00135`

The deployment uploaded the current uncommitted local worktree. The base commit identifies the branch position, not the complete deployed diff.

## Live smoke tests

- Landing: HTTP 200 and contains the photography upgrade.
- Recruitment: HTTP 200.
- Next image optimizer: HTTP 200.
- `/admin/media`: HTTP 307 to `/login?next=%2Fadmin%2Fmedia`.
- `/api/notifications/due` without bearer secret: HTTP 401.
- Landing cache state: `PRERENDER`.

## Production visual regression

Tested 375x812, 430x932, 768x1024, 1366x768, 1440x900, and 1920x1080.

- Horizontal overflow: none.
- Broken images: none.
- Console errors: none.
- Synthetic videos: zero.
- CLS range: 0 to 0.0056.
- Reduced motion: reveal visible, transform none, gear animation none, scroll behavior auto.
- Evidence: `active/review/production-20260803/`.

## Post-deploy observability

- Vercel error-log scan after smoke traffic: no logs found, with no error entries observed.
- Deployment inspection: Ready and aliased correctly.
- Drains: not queryable through the installed Vercel CLI command set.

## Known production configuration gaps

- `CRON_SECRET` is absent, so scheduled notification delivery remains disabled.
- `RESEND_FROM` is absent, so the current email fallback sender remains in use.
- Live payment, provider email delivery, and physical scanner acceptance are still separate go-live tests.
