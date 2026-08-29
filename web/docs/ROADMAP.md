# SavaPass — Road to Functional (Production Roadmap)

_Last updated: 2026-06-28_

Goal: take real ticket money, deliver a scannable ticket, and check people in at the
door — reliably and legally. The app is **visually complete and deployed**
(https://sava-pass.vercel.app). What's left is mostly **configuration, verification, and
a few small pages** — not big new features.

Legend: **[Alex]** = only you can do it (accounts/DNS/bank/legal) · **[Claude]** = I can do it ·
**[Both]** = I set it up, you provide a secret/value. ☐ = todo · ☑ = done.

---

## Phase 0 — Already done ✅
- ☑ Full app built: public site, event, checkout, success, ticket, scanner, admin, membership.
- ☑ Buy + recruiting flows converted to the light "Desktop Flow" design (PC + mobile).
- ☑ Landing nav so every destination is reachable from `/`.
- ☑ Deployed to production on Vercel (CLI + token).
- ☑ QR signing + scanner + atomic check-in **implemented in code** (verified in Phase 3).

---

## Phase 1 — Payments go live (Stripe)  🔴 BLOCKER
Without this, a payment can succeed but **no ticket is ever issued**.

1. ☐ **[Alex]** Activate the Stripe account for live payments (business details + bank account for RON payouts).
2. ☐ **[Both]** Put **live** keys on Vercel: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…`, `STRIPE_SECRET_KEY=sk_live_…`. (Currently `pk_test`/`sk_test`.)
3. ☐ **[Both]** Create a **production webhook** in the Stripe Dashboard:
   - Endpoint: `https://sava-pass.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `charge.refunded`
   - Copy its **signing secret** → set `STRIPE_WEBHOOK_SECRET` on Vercel. (The current value is the local `stripe listen` secret and will NOT verify live events.)
4. ☐ **[Both]** Set `NEXT_PUBLIC_SITE_URL=https://sava-pass.vercel.app` on Vercel (currently `http://localhost:3000` — this breaks the post-payment redirect AND every emailed ticket/QR link).
5. ☐ **[Alex+Claude]** Redeploy, then do **one real test purchase**.

**Done when:** a real purchase → order flips to `paid` → ticket row created → success page shows the QR.

---

## Phase 2 — Email delivery (Resend)  🔴 BLOCKER
Right now the ticket email and the membership confirmation are sent from
`noreply@savapass.ro`, an **unverified** domain → silently rejected.

1. ☐ **[Alex]** In Resend, verify a sending domain (add the DKIM/SPF DNS records for `savapass.ro`, or use a domain you control).
2. ☐ **[Both]** Confirm `RESEND_API_KEY` on Vercel is a live key for that domain.
3. ☐ **[Claude]** (optional) Make the `from:` address configurable via env so it always matches the verified domain.

**Done when:** a test purchase delivers the ticket email with a working "Deschide biletul" link and the QR image renders.

---

## Phase 3 — QR ticketing & door check-in (end-to-end)  🟡 VERIFY
The code is complete: HMAC-signed token `SP1.<ticketId>.<sig>`, PNG at `/api/qr/[token]`,
staff-gated scanner with **atomic** check-in and manual-code fallback. This phase is about
proving it works on real hardware (depends on Phase 1 producing real tickets).

1. ☐ **[Alex]** Make sure at least one **staff/scanner account** exists and can log in (see Phase 4).
2. ☐ **[Alex+Claude]** On a real phone, open `https://sava-pass.vercel.app/scanner`, grant camera permission (HTTPS is required — Vercel provides it), and scan a real ticket's QR.
   - Expect verdict **"ok"** the first time.
   - Scan the **same** ticket again → **"already in"** (proves the atomic guard).
   - Test the **manual 6-char code** entry as a camera fallback.
3. ☐ **[Alex+Claude]** Verify edge verdicts: invalid/forged token → "invalid"; refunded ticket → "void"; non-staff visitor → redirected to login.
4. ☐ **[Alex]** Confirm the **scan log** + live check-in count update in `/admin` / `/statistici`.
5. ☐ **[Claude]** (only if a real device fails) debug camera/zxing or token issues.

**Done when:** buy → receive QR (email + in-app) → scan at the door → green "ok" → re-scan shows "already in", and the admin count increments.

---

## Phase 4 — Data, accounts & reliability  🟠
1. ☐ **[Alex]** Upgrade **Supabase to Pro** (free tier auto-pauses → cold buyer pages hang/404). Or accept the daily keep-warm cron as a stopgap.
2. ☐ **[Alex+Claude]** Ensure a real **admin** account exists; invite door **staff** via `/invite` (scanner + admin are role-gated).
3. ☐ **[Claude]** Dump the base schema (events/orders/tickets/etc.) to `supabase/migrations/00000000_init.sql` — it currently lives only in the live DB, so it can't be rebuilt from the repo.
4. ☐ **[Alex]** Create the **real events** in `/admin` (replace the demo `echoes-unplugged`).

**Done when:** the site is fast cold, an admin can manage events, and door staff can log into the scanner.

---

## Phase 5 — Legal & compliance (RO + GDPR)  🟠
Required before publicly taking payments and personal data.

1. ☐ **[Both]** Add **Terms** (`/termeni`) and **Privacy/GDPR** (`/confidentialitate`) pages — checkout + membership already link to them, but the pages don't exist. I can scaffold light pages; you supply/approve the legal text.
2. ☐ **[Alex]** Decide & document the **refund policy** (the `charge.refunded` webhook already voids the ticket).
3. ☐ **[Alex]** Confirm who appears as the **seller/organizer** and the payout bank account (you're 18 → can take payments in your own name).

**Done when:** the linked legal pages exist and reflect a real policy.

---

## Phase 6 — Domain & branding  🟢
1. ☐ **[Alex]** Buy/point a custom domain (e.g. `savapass.ro`) at Vercel.
2. ☐ **[Both]** Update `NEXT_PUBLIC_SITE_URL` to the custom domain and **re-verify that same domain in Resend** (keeps email + links consistent).
3. ☐ **[Claude]** Update metadata/OG tags to the final domain.

**Done when:** the app loads on the real domain and all links/emails use it.

---

## Phase 7 — Pre-launch checklist & go-live  🟢
1. ☐ Full E2E on production: browse → buy (real card) → email arrives → open ticket → scan at door → "ok" → re-scan "already in".
2. ☐ Membership E2E: submit `/devino-membru` → row in DB → appears in `/admin/aplicatii` → confirmation email arrives.
3. ☐ Mobile pass on a real phone (the flows are responsive; confirm camera + safe-area + tap targets).
4. ☐ Sold-out + capacity edge cases behave.
5. ☐ Remove/secure any test data; set Stripe to live; announce.

---

## Phase 8 — Post-launch backlog (works without these)  ⚪
- ☐ **Multi-ticket per order** (group buying). Touches checkout amount, the webhook issuance loop, the email, and the success/ticket pages. Currently exactly 1 ticket/order.
- ☐ **Recruiting CRM** from the design: applicant **status page**, **interview scheduler**, and the **4-email journey**. Needs new tables (slots, statuses, tokens). Today: apply → stored → staff reviews + manual reply (functional MVP).
- ☐ Apple Wallet / PDF ticket export (the design shows these; currently omitted).
- ☐ Convert the homepage to the light design (currently immersive dark by choice).

---

## Critical path (the shortest route to "can sell a ticket")
**Phase 1 (Stripe live + webhook + SITE_URL) → Phase 2 (Resend domain) → Phase 3 step 2 (scan a real ticket).**
Everything else improves reliability, legality, and polish but isn't required to make the first real sale work.

### What I (Claude) can start now without waiting on you
- Set `NEXT_PUBLIC_SITE_URL` to the live URL on Vercel + redeploy (Phase 1.4).
- Scaffold the Terms + Privacy pages (Phase 5.1).
- Dump the `init.sql` base schema (Phase 4.3).
- Make the email `from:` address env-configurable (Phase 2.3).
