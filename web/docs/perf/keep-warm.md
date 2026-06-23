# Keep-warm (Supabase free-tier anti-pause) — U4

The Supabase project is on the free tier and pauses after ~1 week of inactivity.
While paused, requests hang ~5 s before failing and a restore takes ~2 min. A small
scheduled ping prevents the project from ever reaching that threshold.

## How it works

- **Route:** `web/app/api/keep-warm/route.ts` — `GET /api/keep-warm` runs `select id from events limit 1` and returns `{ ok: true }` (or 503 if the DB is unreachable). Exposes no data.
- **Schedule:** `web/vercel.json` Vercel Cron, `0 6 * * *` (daily 06:00 UTC). Daily is well inside the 7-day pause window and within Vercel **Hobby** limits (Hobby allows cron at most once per day).
- **Optional lock-down:** set `CRON_SECRET` in Vercel env and the route requires `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this automatically). Left open by default since it leaks nothing.

## If daily isn't enough / Hobby cron is unavailable

Free fallback: an external uptime monitor (e.g. UptimeRobot free) pinging
`https://sava-pass.vercel.app/api/keep-warm` every 15-30 min. This also covers the
case where you want a tighter warm interval than Hobby cron allows. No code change
needed — same endpoint.

## Residual

Vercel **function cold-starts** (serverless spin-up) are separate from the Supabase
pause and cannot be removed on the free tier. The U5 caching work minimizes how
often a request invokes a function at all, which is the free mitigation. Removing
cold-starts entirely would require a paid plan (out of scope per the free-only
scoping decision).
