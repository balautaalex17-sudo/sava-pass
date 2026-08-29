# SavaPass — Configuration & Setup Reference

_Last updated: 2026-08-19._ Single source for everything you must configure to run and
launch SavaPass. **No secret values live here** — this file is safe to commit. Real
values live in `web/.env.local` (gitignored) and in Vercel's env settings.

Status legend: ✅ done · ⚠️ works but test/placeholder · ❌ not set up yet.

---

## 0. TL;DR — what's left to be fully live

| Area | State | Who | Where |
|---|---|---|---|
| App built + deployed | ✅ | — | https://sava-pass.vercel.app |
| Supabase (DB/auth) | ✅ (free tier, auto-pauses) | Alex → Pro | §3.1 |
| Stripe **live** payments | ⚠️ test mode | Alex | §3.2 |
| Stripe **production webhook** | ❌ | Alex + Claude | §3.2 |
| Email delivery (Resend domain) | ❌ unverified domain | Alex | §3.3 |
| Custom domain | ❌ none (uses *.vercel.app) | Alex | §3.5 |
| Legal pages (Terms/Privacy) | ❌ | Claude | roadmap Phase 5 |

Full sequencing is in [ROADMAP.md](ROADMAP.md). This file is the *config detail* behind it.

---

## 1. Environment variables

Set in **two places**: `web/.env.local` (local dev) and **Vercel → Project → Settings →
Environment Variables → Production** (live). Changing a Vercel env var requires a **redeploy**
to take effect (§4).

| Variable | Secret? | Purpose | Where to get it | State |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | no | Supabase project URL | Supabase dashboard → Project Settings → API | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | Browser/client DB key (RLS-gated) | same as above | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Server-only admin DB access | `npx -y supabase projects api-keys --project-ref shzyvrojbtbczqqoilip -o json` (machine is logged in) | ✅ |
| `SUPABASE_TEST_PROJECT_REF` | no | Explicit non-production ref allowed for destructive integration tests | Dedicated Supabase branch; leave blank for local Supabase | optional, never use the production ref |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | no | Stripe client key | Stripe dashboard → Developers → API keys | ⚠️ `pk_test` → needs `pk_live` |
| `STRIPE_SECRET_KEY` | **yes** | Stripe server key | Stripe dashboard (Live mode) → API keys | ⚠️ `sk_test` → needs `sk_live` |
| `STRIPE_WEBHOOK_SECRET` | **yes** | Verifies Stripe webhook signatures | **Prod:** Stripe dashboard webhook endpoint. **Local:** `stripe listen --print-secret` | ⚠️ local value only → needs prod `whsec` |
| `RESEND_API_KEY` | **yes** | Sends ticket + membership emails | Resend dashboard → API Keys | ✅ (confirm it's a live key for the verified domain) |
| `RESEND_FROM` | no | Sender address (e.g. `SavaPass <bilete@savapass.ro>`) | You choose — a mailbox on a Resend-**verified** domain | ❌ unset (code falls back to `noreply@savapass.ro`; see §3.3) |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical base URL for redirects/email links | Your production domain | ⚠️ `localhost` locally — **auto-resolves to the live domain on Vercel** via `lib/site-url.ts`; only must be set once you add a custom domain |
| `QR_SIGNING_SECRET` | **yes** | HMAC secret for ticket QR tokens | Generate once: `openssl rand -hex 32` | ✅ **never change it** — rotating invalidates every issued ticket |
| `CRON_SECRET` | **yes** | Bearer secret protecting queued notification delivery | Generate once: `openssl rand -hex 32`; use the same value in the scheduler | ❌ required for automatic reminders |
| `PSI_API_KEY` | yes (optional) | PageSpeed Insights API (perf loop only) | Google Cloud → PageSpeed Insights API | optional |

**Notes**
- `NEXT_PUBLIC_*` vars are exposed to the browser — never put a secret behind that prefix.
- `lib/site-url.ts` makes a missing/stale `NEXT_PUBLIC_SITE_URL` safe in production (derives the
  domain from Vercel's runtime env), so you do **not** need to fix it for `sava-pass.vercel.app`
  to work — only set it when moving to a custom domain.

---

## 2. Reference IDs (not secrets)

| Thing | Value |
|---|---|
| Supabase project ref | `shzyvrojbtbczqqoilip` (West EU / Ireland) |
| Stripe account | `acct_1Th7kwPBEvqABTYx` (display "Alex"), API version `2026-05-27.dahlia` |
| Vercel project | `sava-pass` · `prj_hmPJHCEbYF4vKmq0ymQjRUo8ISFB` |
| Vercel team | `alex-2027's projects` · slug `alex-2027s-projects` · `team_0qoJuwzkg8jKIm17o3pRuwB0` |
| Vercel root directory | `web` (the app is in `web/`, no root `package.json`) |
| Live URL | https://sava-pass.vercel.app |
| GitHub repo | `balautaalex17-sudo/sava-pass` (default branch `main`) |
| Deploy token | `active/.vercel-token` (gitignored — **keep, never delete**) |
| Admin account | `proiectnss@gmail.com` (password recorded in `web/PRODUCTION_STATUS.md`) |

---

## 3. External services — setup steps

### 3.1 Supabase (database, auth, realtime)
- Project `shzyvrojbtbczqqoilip` is live and seeded (active event `echoes-unplugged`).
- **Free tier auto-pauses** after inactivity → cold buyer pages hang/404. A daily keep-warm cron
  (`vercel.json` → `/api/keep-warm`) mitigates it; for launch, **upgrade to Supabase Pro** to stop pausing.
- Keys: pull non-interactively with the Supabase CLI (machine is logged in) — see §1.
- The foundational events/orders/tickets schema now lives in
  `supabase/migrations/20260610000000_initial_ticketing_schema.sql`. GitHub CI rebuilds a fresh
  local Supabase database from the complete migration chain on every change.
- On the existing live project, treat that foundational file as migration-history
  reconciliation: verify the objects already exist and record the version as applied. The
  actual new database change is `20260819143420_security_audit_remediation.sql`; test it on a
  disposable database before applying it to production.

### 3.2 Stripe (payments) — the #1 blocker for real sales
1. **Activate the account** for live payments: business details + bank account for RON payouts (dashboard.stripe.com).
2. **Live API keys** (toggle dashboard to *Live mode* → Developers → API keys): set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…` and `STRIPE_SECRET_KEY=sk_live_…` on Vercel.
3. **Production webhook** (Developers → Webhooks → Add endpoint):
   - URL: `https://sava-pass.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `charge.refunded`
   - Reveal its **Signing secret** → set `STRIPE_WEBHOOK_SECRET=whsec_…` on Vercel.
   - ⚠️ The current value is the **local `stripe listen`** secret — it will NOT verify live events.
4. Redeploy, then do one real test purchase (§5).

**Local dev webhook:** `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (separate
long-lived terminal). The signing secret is stable per device. Replay a missed event:
`stripe events list --limit 5` → `stripe events resend <evt_id>`.

### 3.3 Resend (transactional email) — Phase 2
- Code is ready: `lib/email.ts` `sendEmail()` is best-effort (never throws) and reads the sender
  from `RESEND_FROM`. Delivery is OFF until the domain is verified.
- **Verify a sending domain** in Resend: add the **DKIM + SPF (+ DMARC)** DNS records it generates,
  at your DNS host. Wait for "Verified". (Assumed `savapass.ro` — must be a domain you control.)
- Set `RESEND_FROM` (a mailbox on that domain) + confirm `RESEND_API_KEY` is a live key.
- **No-payment delivery test:** submit `/devino-membru` → the confirmation email should arrive
  (check Resend dashboard → "Delivered"). Then the ticket email via a real/replayed purchase.
- Plan: [plans/2026-06-28-001-feat-email-delivery-resend-plan.md](plans/2026-06-28-001-feat-email-delivery-resend-plan.md).

**Queued notifications and reminders:** `GET /api/notifications/due` atomically claims due messages
in batches of 50 and requires `Authorization: Bearer <CRON_SECRET>`. `vercel.json` schedules it
daily. Both cron routes return `503` when the secret is missing, so production must set it before
deployment.

### 3.4 Vercel (hosting) — already set up
- Deploys are **CLI-only** (no Git integration) — see §4. `git push` does NOT deploy.
- 9 env vars were pushed from `.env.local` for preview + production. Update them when switching to
  live Stripe / verified Resend / custom domain.

### 3.5 Custom domain (optional, for launch)
1. Buy/point a domain (e.g. `savapass.ro`) → add it in Vercel → Project → Domains.
2. Set `NEXT_PUBLIC_SITE_URL` to the domain on Vercel.
3. **Verify the same domain in Resend** (§3.3) so email + links are consistent.
4. For magic-link login (`/conta/login`), add the domain to Supabase → Auth → URL allowlist.

### 3.6 GitHub
- Repo `balautaalex17-sudo/sava-pass`. Local git identity is `Alex <Balautaalex09@gmail.com>`
  (commit author differs from the repo-owner account `balautaalex17-sudo`). `gh` CLI is not installed;
  a working token is in Windows Credential Manager (`git credential fill`).

---

## 4. Deploy runbook

```bash
# From projects/sava-pass/web/  (token kept in ../active/.vercel-token)
cd web
T=$(cat ../active/.vercel-token)
npx -y vercel deploy --prod --yes --token "$T" --scope alex-2027s-projects
```
- First-ever deploy of a new project targets production automatically; afterwards `--prod` is required.
- This uploads the **local working tree** (not git) — uncommitted changes ship.

**Set/update an env var via CLI** (alternative to the dashboard):
```bash
printf '%s' "<value>" | npx -y vercel env add <KEY> production --token "$T" --scope alex-2027s-projects
# then redeploy for it to take effect
```

**Verify a deploy without PageSpeed:** `curl -s https://sava-pass.vercel.app/ | grep <marker>`.

---

## 5. Local development

```bash
cd web
npm run dev          # http://localhost:3000
# separate terminal, for purchases end-to-end:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
- **Build:** kill the dev server first — both write `.next/` (Turbopack) and collide.
  Stale `.next` causes "missing CSS / wrong theme" symptoms; `rm -rf .next` + rebuild fixes it.
- Test scanner on a **physical phone** (camera needs HTTPS or localhost): log in on the LAN IP
  shown at server start, open `/scanner`, scan a `/bilet/[token]` QR.

---

## 6. Go-live checklist (the critical path to a real sale)

- [ ] Stripe account activated (business + bank).
- [ ] `pk_live` / `sk_live` set on Vercel.
- [ ] Production webhook endpoint created → `STRIPE_WEBHOOK_SECRET` (prod) set on Vercel.
- [ ] Resend domain verified (DKIM/SPF) → `RESEND_FROM` + live `RESEND_API_KEY` set.
- [ ] `CRON_SECRET` set and a scheduler calls `/api/notifications/due` with its bearer token.
- [ ] Security remediation migration applied and Supabase types regenerated.
- [ ] Supabase Auth leaked-password protection enabled; Security Advisor rerun.
- [ ] `docs/SECURITY-OPERATIONS.md` owners assigned; encrypted backup and non-production restore drill recorded.
- [ ] (If custom domain) domain added in Vercel + Resend + Supabase allowlist + `NEXT_PUBLIC_SITE_URL`.
- [ ] Redeploy.
- [ ] Real test purchase → ticket email arrives → QR scans at `/scanner` → re-scan = "already in".
- [ ] Terms + Privacy pages live (roadmap Phase 5).
- [ ] Supabase upgraded to Pro (reliability).

---

## 7. Config files in the repo

| File | What it controls |
|---|---|
| `web/.env.local` | Local env values (gitignored — never commit) |
| `web/vercel.json` | Protected keep-warm/maintenance and notification crons |
| `web/next.config.ts` | Security headers, 1 MB Server Action cap, `experimental.inlineCss` |
| `.github/workflows/security-ci.yml` | Fresh DB migration, audit, types, lint, tests, and build gate |
| `.github/dependabot.yml` | Reviewed weekly npm updates and monthly GitHub Action updates |
| `web/docs/SECURITY-OPERATIONS.md` | Incident, recovery, monitoring and data-rights launch runbook |
| `web/lib/site-url.ts` | Robust base-URL resolution (no silent localhost in prod) |
| `web/lib/email.ts` | Shared Resend client + `RESEND_FROM` + best-effort `sendEmail()` |
| `active/.vercel-token` | Vercel deploy token (gitignored — keep) |

> This file supersedes the env/deploy sections of the older `web/PRODUCTION_STATUS.md`
> (a 2026-06-11 snapshot). Keep `PRODUCTION_STATUS.md` only for its historical notes + the
> admin credential.
