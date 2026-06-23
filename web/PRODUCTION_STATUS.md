# SavaPass — Production Status (2026-06-11)

Status snapshot of the `web/` Next.js app. What works, what's built but untested, what's missing.

---

## How to run locally

```bash
# 1 — dev server (from projects/sava-pass/web/)
npm run dev          # http://localhost:3000

# 2 — webhook listener (separate terminal, must stay open)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Both must be running for end-to-end purchases to work.

---

## Environment (`web/.env.local`)

All 9 keys are set and real as of 2026-06-11:

| Key | Status | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ real | project `shzyvrojbtbczqqoilip` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ real | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ real | pulled via Supabase CLI |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ real | test mode |
| `STRIPE_SECRET_KEY` | ✅ real | test mode |
| `STRIPE_WEBHOOK_SECRET` | ✅ real | `whsec_8c91...6372` (70 chars) |
| `RESEND_API_KEY` | ✅ real | domain unverified — see below |
| `NEXT_PUBLIC_SITE_URL` | ✅ `http://localhost:3000` | change for deploy |
| `QR_SIGNING_SECRET` | ✅ real | 64-char random |

---

## Staff credentials (local DB)

| Email | Password | Role |
|---|---|---|
| `proiectnss@gmail.com` | `SavaPass2026!` | admin |

Access `/admin` and `/scanner` with these. No other users exist.

---

## What is fully working (tested end-to-end)

### Buyer flow
- **`/`** — landing page with events grid. Active event shows "Cumpără bilet".
- **`/echoes-unplugged`** — event detail page: poster, date/venue/price, program, perks, seats remaining (live from DB).
- **`/echoes-unplugged/checkout`** — name + email + GDPR form. Server action validates, creates a `pending` order, creates a Stripe Checkout session, redirects.
- **Stripe Checkout** — test card `4242 4242 4242 4242`, any future date, any CVC.
- **`/api/webhooks/stripe`** — receives `checkout.session.completed`, marks order `paid`, issues ticket with HMAC-signed QR token and 6-char code, sends email via Resend.
- **`/succes?session_id=...`** — polls order status every 2s, shows "Se emite biletul…" then "Ești înăuntru." + link to ticket.
- **`/bilet/[token]`** — wallet-style ticket: gradient header, QR, 6-char code, holder name, event facts. Token-verified server-side.
- **`/api/qr/[token]`** — returns a real QR PNG (used in the email and on the ticket page).

### Staff auth
- **`/login`** — Supabase email+password. Organizers go to `/scanner`, admins to `/admin`.
- Auth gating — unauthenticated access to `/scanner` and `/admin` redirects to `/login`. Non-admin staff redirected from `/admin` to `/scanner`.

### Admin
- **`/admin`** — stat cards (sold/capacity, check-ins, seats remaining, revenue), attendees table, recent scan log, inline CSV download (pre-built rows, client-side download).
- **Realtime scan log** — `AdminClient.tsx` subscribes to Supabase Realtime on `scans` table; scan log and check-in count update live without refresh.

---

## What is built but needs live testing

### Scanner (`/scanner`)
Built with full camera integration (`@zxing/browser`), back-camera selection, cyan reticle overlay, and all 5 verdict states (ok / already_in / already_used / void_ticket / invalid). Atomic check-in action in `scanner/actions.ts`.

**Needs testing on a physical phone with a camera** — cannot be verified in desktop browser. To test:
1. Log in at `http://192.168.1.136:3000/login` (local network IP shown on server start)
2. Go to `/scanner`
3. Point at a ticket QR from `/bilet/[token]`
4. First scan → green "Intrat!", second scan → orange "Deja înăuntru"

---

## What is NOT built

| Missing | PLAN.md reference | Impact |
|---|---|---|
| **Event editor** (`/admin/event`) | Phase 4, §3.3 | Can't edit event from the app — must use Supabase Studio |
| **`/api/admin/export`** as a dedicated route | Phase 4 | CSV download exists inline in admin page (client-side) — no auth-gated server route |
| **OG/SEO meta tags** | Phase 5 | No social share previews |
| **a11y pass** | Phase 5 | Focus states, contrast, tap targets not audited |
| **Vercel deploy** | Phase 5 | No production URL yet |
| **Stripe live keys** | Phase 5 | Real money not possible yet |
| **Membership module** (`/aplica`, pipeline) | Phase 6 / v2 | Not started |
| **Past events archive in admin** | Phase 4 | Admin only shows the active event |
| **Day-of reminder email** | v2 | Not started |

---

## Known issues / gotchas

### Email delivery
Resend `from` is `noreply@savapass.ro` — an unverified domain. Resend will reject the send silently (webhook still returns 200). The in-app ticket at `/bilet/[token]` works regardless of email. To fix: verify `savapass.ro` in the Resend dashboard (add DNS records), or change `from` to a verified domain.

### `stripe listen` must be running
The webhook listener is a separate long-lived process, not daemonized. If it's not running when a purchase happens, the order stays `pending` forever and the success page errors. To recover a stuck order: `stripe events resend <evt_id>` while the listener is running (find the event with `stripe events list --limit 5`).

### Webhook secret is exactly 70 chars
`whsec_` + 64 hex = 70 chars. If you ever need to reset it: run `stripe listen --print-secret`, paste the full value into `.env.local`. A truncated secret breaks signature verification silently (handler returns 400, order never completes).

### Server action IDs change after env reload
After saving `.env.local` while the dev server is running, Next.js hot-reloads the env but can desync server action registration. If you see "Failed to find Server Action" errors in the logs, restart the dev server (`Ctrl+C`, `npm run dev`).

---

## Database state

- **Supabase project:** `shzyvrojbtbczqqoilip` (West EU / Ireland)
- **Active event:** `echoes-unplugged` — "Echoes Unplugged", 45 RON, 120 capacity
- **Past events:** 2 seeded (visible on landing page past grid)
- **Tickets sold:** whatever was purchased during testing (check Supabase Studio → tickets)
- **Staff:** 1 admin user (`proiectnss@gmail.com`)

To reset test data: delete rows from `tickets` and `orders` in Supabase Studio (or via the service role API). Don't delete the events.

---

## Next steps (priority order)

1. **Test scanner on phone** — log in on mobile at the local network IP, scan a real ticket QR.
2. **Verify Resend domain** — add DNS records for `savapass.ro` in Resend dashboard so ticket emails actually deliver.
3. **Build event editor** (`/admin/event`) — currently the only way to change event details is Supabase Studio. PLAN.md §9 Prompt 4 has the exact spec.
4. **Phase 5 — deploy** — swap to Stripe live keys, register a production webhook endpoint in the Stripe dashboard (get a real `whsec_`), set `NEXT_PUBLIC_SITE_URL` to the real domain, deploy to Vercel.
5. **Phase 6 — membership** — `/aplica` form + pipeline board. PLAN.md §9 Prompt 6.
