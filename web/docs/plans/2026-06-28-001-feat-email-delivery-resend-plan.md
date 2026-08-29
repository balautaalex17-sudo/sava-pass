---
title: "feat: Reliable email delivery (Resend)"
type: feat
status: active
date: 2026-06-28
origin: web/docs/ROADMAP.md (Phase 2 — Email delivery)
depth: standard
---

# feat: Reliable email delivery (Resend)

## Summary

Make SavaPass actually deliver its two transactional emails — the **ticket** (after a paid order) and the **membership application confirmation** — and make the sending path resilient. Today both emails send from an **unverified** domain (`noreply@savapass.ro`), so Resend silently rejects them; and the ticket email in the Stripe webhook is **not** failure-isolated, so a Resend outage 500s the webhook. This plan centralizes sending into one helper (single from-address source, best-effort posture), makes the from-address env-configurable, and documents the domain-verification + env config + verification steps. Code can ship immediately; actual delivery turns on once the domain is verified (your setup step, done later).

---

## Problem Frame

Email is the primary delivery channel for the ticket QR and the recruiting confirmation. Two problems block it:

1. **Unverified sender domain.** Both sends use `from: "SavaPass <noreply@savapass.ro>"`. `savapass.ro` is not verified in Resend, so in production Resend rejects the send (and in test mode Resend only delivers to the account owner's own address). Net effect: buyers don't get the ticket email, applicants don't get the confirmation. (In-app ticket at `/bilet/<token>` still works — email is the gap.)
2. **Fragile webhook send.** `app/api/webhooks/stripe/route.ts` awaits `resend.emails.send(...)` with **no** try/catch (line ~101). On a Resend error the webhook throws → returns 500 → Stripe retries → the idempotency guard early-returns ("already paid") → the email is **never** re-attempted, and Stripe marks the endpoint as failing. The order + ticket are fine; the email and webhook health are not. (The membership send in `app/devino-membru/actions.ts` is already wrapped best-effort — good; this plan makes that posture uniform.)

Secondary: the from-address and Resend client are duplicated across two files, so changing the verified domain means editing multiple call sites.

---

## Requirements

- **R1** — Both transactional emails (ticket, membership confirmation) deliver successfully once a domain is verified.
- **R2** — A Resend failure (outage, rate limit, rejected recipient) must NOT fail the Stripe webhook or the membership submission. Email is best-effort; the order/application is the source of truth.
- **R3** — The sender address is configurable via env (no hardcoded domain), so swapping to a verified/custom domain needs zero code changes.
- **R4** — A single place owns the Resend client + from-address resolution (no duplication).
- **R5** — There is a documented, repeatable way to verify delivery without requiring a full live purchase.

Traceability: origin `web/docs/ROADMAP.md` Phase 2 (steps 1-3) + the "best-effort email" posture already noted in the membership action.

---

## Key Technical Decisions

- **KTD1 — Centralize in `lib/email.ts`.** One module exports a shared `Resend` client, the resolved from-address, and a `sendEmail()` wrapper. Both call sites use it. Rationale: single source for domain/posture; satisfies R4. _(Alternative: leave two call sites and just add try/catch to the webhook — rejected; leaves the duplicated hardcoded domain, fails R3/R4.)_
- **KTD2 — From-address from `RESEND_FROM` env, with a safe default.** `RESEND_FROM` (e.g., `"SavaPass <bilete@savapass.ro>"`) overrides; default stays `"SavaPass <noreply@savapass.ro>"` so dev/local behavior is unchanged. Satisfies R3.
- **KTD3 — All sends are best-effort and never throw to the caller.** `sendEmail()` internally try/catches, logs on failure, and returns a small `{ ok: boolean; id?: string; error?: string }` result. Callers may inspect it but never depend on it for control flow. Satisfies R2. This is the existing membership posture, made uniform and applied to the webhook.
- **KTD4 — Optional `replyTo` support in the helper.** Lets the ticket email reply to an Interact inbox and the membership email reply to `membri@interactsava.ro` (already referenced in copy). Wired as an optional param; not required for delivery.
- **KTD5 — Keep the existing HTML templates.** `buildEmailHtml()` in both files stays as-is; only the send plumbing (client + from + error handling) changes. Keeps the diff small and the visual output unchanged.
- **KTD6 — Domain verification is config, not code.** Code is domain-agnostic; turning delivery on is a Resend DNS step + a Vercel env value (the Configuration & Rollout section). This lets the code merge and deploy now and delivery flip on later without a redeploy-for-logic.

---

## High-Level Technical Design

```mermaid
flowchart LR
  WH[Stripe webhook\ncheckout.session.completed] -->|ticket email| H
  MB[Membership action\nsubmitApplication] -->|confirmation email| H
  H[lib/email.ts\nsendEmail()] --> RC[(shared Resend client)]
  RC --> R{Resend API}
  R -->|ok| OK[delivered]
  R -->|error| LOG[log + return ok:false\nnever throw]
  subgraph config[turns delivery on - no code]
    ENV[RESEND_FROM\nRESEND_API_KEY] -.-> H
    DNS[Verified domain\nDKIM / SPF / DMARC] -.-> R
  end
```

Directional only — the prose + per-unit fields are authoritative.

---

## Implementation Units

### U1. Shared email helper (`lib/email.ts`)

- **Goal:** One module owning the Resend client, the env-resolved from-address, and a best-effort `sendEmail()` that never throws.
- **Requirements:** R2, R3, R4, KTD1-KTD4.
- **Dependencies:** none.
- **Files:**
  - Create `web/lib/email.ts`
  - (test) `web/lib/email.test.ts` — only if a runner is added; see Execution note.
- **Approach:**
  - `import "server-only"` (same posture as `lib/site-url.ts` / `lib/membership.ts`).
  - Export `EMAIL_FROM` = `process.env.RESEND_FROM?.trim() || "SavaPass <noreply@savapass.ro>"`.
  - Export a single `Resend` client built from `process.env.RESEND_API_KEY`.
  - Export `async function sendEmail({ to, subject, html, replyTo? }): Promise<{ ok: boolean; id?: string; error?: string }>` that wraps `resend.emails.send` in try/catch, applies `EMAIL_FROM`, passes `reply_to` when provided, `console.error`s on failure, and returns the result. Never re-throws.
- **Patterns to follow:** `web/lib/site-url.ts` (server-only env helper shape), the existing try/catch in `app/devino-membru/actions.ts:83-92`.
- **Test scenarios:**
  - From resolution: `RESEND_FROM` set → used verbatim; unset/blank → default `noreply@savapass.ro`.
  - Best-effort: when the underlying send throws, `sendEmail` resolves `{ ok: false, error }` and does NOT throw.
  - Happy path: a successful send resolves `{ ok: true, id }`.
  - `replyTo` passed → forwarded as `reply_to`; omitted → field absent.
- **Execution note:** The repo currently has **no test runner**. Enumerate the scenarios above; verify via a one-off `node` script (mock the send) or defer to a future test-harness unit. Do not add a test framework as part of this plan.
- **Verification:** `npm run build` clean; both call sites (U2, U3) compile against the new exports.

### U2. Route the ticket email through the helper (best-effort)

- **Goal:** The Stripe webhook sends the ticket email via `sendEmail()` so a Resend failure can't 500 the webhook or break idempotent retries.
- **Requirements:** R1, R2.
- **Dependencies:** U1.
- **Files:** Modify `web/app/api/webhooks/stripe/route.ts`
- **Approach:**
  - Remove the local `const resend = new Resend(...)` and the hardcoded `from`.
  - Replace the bare `await resend.emails.send({...})` (line ~101) with `await sendEmail({ to, subject, html, replyTo? })`.
  - Keep `buildEmailHtml(...)` unchanged (KTD5).
  - The send sits AFTER the ticket insert + order-paid update, so a failed/none result leaves a valid issued ticket (buyer still gets it via the success page + `/bilet/<token>`). Optionally log when `ok:false` for observability.
- **Patterns to follow:** existing webhook structure; the idempotency guard stays as-is.
- **Test scenarios:**
  - Covers R2. Resend send fails → webhook still returns 200, order stays `paid`, ticket row exists (no throw, no Stripe retry storm).
  - Happy path: send succeeds → ticket email dispatched with the verified from-address.
  - Integration: `checkout.session.completed` → ticket created → `sendEmail` invoked once with the buyer's email + the 6-char code subject.
- **Execution note:** No runner in repo — verify by reasoning + a manual webhook replay (`stripe events resend <evt_id>`) against a deploy, per the webhook-replay note in CLAUDE.md.
- **Verification:** Build clean; a forced Resend error (bad key locally) does not 500 the route.

### U3. Route the membership confirmation through the helper

- **Goal:** The membership action uses the shared helper; drop its local client + hardcoded from. Posture is already best-effort — this de-duplicates.
- **Requirements:** R1, R3, R4.
- **Dependencies:** U1.
- **Files:** Modify `web/app/devino-membru/actions.ts`
- **Approach:** Remove `const resend = new Resend(...)` (line 6) and the hardcoded `from` (line 91); call `sendEmail({ to, subject, html, replyTo: "membri@interactsava.ro"? })`. Keep `buildEmailHtml(firstName)` and the surrounding best-effort try (the helper now owns the try, so the outer one becomes optional — keep or simplify, no behavior change).
- **Patterns to follow:** U1 helper; existing action flow.
- **Test scenarios:**
  - Happy path: valid application → row inserted → confirmation email dispatched from the verified address.
  - Covers R2. Resend down → application still returns `{ ok: true }` (storage is source of truth), no throw.
  - Reply-to (if wired): membership email carries `reply_to: membri@interactsava.ro`.
- **Execution note:** No runner — verify by submitting `/devino-membru` against a deploy with a verified domain and confirming the email arrives (this is the no-payment delivery test, R5).
- **Verification:** Build clean; submitting the form still succeeds even with a bad Resend key.

---

## Configuration & Rollout (turns delivery on — your setup, no code)

These are **[Alex]** account/DNS/env steps. The code (U1-U3) ships independently; delivery starts working once these are done.

1. **Verify a sending domain in Resend.** In the Resend dashboard, add the domain you'll send from (assumed `savapass.ro` — see Open Questions) and add the **DKIM + SPF (+ DMARC)** DNS records it generates at your DNS host. Wait for "Verified".
2. **Set env on Vercel (Production):**
   - `RESEND_FROM` = e.g. `SavaPass <bilete@savapass.ro>` (a mailbox on the verified domain).
   - `RESEND_API_KEY` = a live key scoped to that domain (confirm the current one is live, not a sandbox/test key).
3. **Redeploy** (Vercel CLI + kept token) so the new env applies.
4. **Verify delivery (R5):**
   - **No-payment path:** submit `/devino-membru` → confirm the confirmation email arrives (and check Resend's dashboard "Delivered" status).
   - **Ticket path:** after Phase 1 (live Stripe + webhook) — do a real purchase, OR `stripe events resend <checkout.session.completed evt_id>` against the deploy, and confirm the ticket email with QR arrives.

---

## Scope Boundaries

**In scope:** shared email helper, best-effort sends everywhere, env-configurable from + optional reply-to, the domain/DNS + env runbook, and a verification path.

### Deferred to Follow-Up Work
- A general templating/layout system for emails (current inline HTML stays).
- New transactional emails (refund notice, event reminders, "you're checked in").
- The recruiting CRM email journey (4-stage applicant emails) — that's roadmap **Phase 8**, needs new tables.
- Adding a test runner / `lib/email.test.ts` execution (enumerated here, but standing up Jest/Vitest is its own task).
- Bounce/complaint webhook handling from Resend.

---

## Risks & Dependencies

- **Deliverability:** without correct DKIM/SPF/DMARC the mail lands in spam or bounces. Mitigation: complete all DNS records Resend lists; check the domain shows "Verified" and the first sends show "Delivered".
- **Resend sandbox limitation:** an unverified domain / test key only delivers to the account owner's own email. Mitigation: verify the domain before expecting buyer delivery (this is exactly the gate this plan documents).
- **Domain ownership:** the code is domain-agnostic, but you must control the DNS of whatever domain `RESEND_FROM` uses (see Open Questions).
- **Dependency on Phase 1 for the ticket-email E2E:** there's no real ticket to email until live payments + webhook work. The membership email is verifiable now (no dependency).
- **Low risk to existing flows:** U2/U3 are plumbing swaps with unchanged HTML; the main behavioral change is the webhook no longer throwing on send failure (strictly an improvement).

---

## Open Questions

- **Which domain sends the mail?** Plan assumes `savapass.ro`. If you don't own/control its DNS yet, pick a domain you do (or buy `savapass.ro`), set `RESEND_FROM` accordingly — no code change needed. _(This is the only choice that blocks actual delivery; it does not block merging U1-U3.)_
- **Reply-to addresses?** Use `membri@interactsava.ro` for membership (already in copy) and an Interact inbox for tickets? Confirm the addresses exist, or omit `replyTo`.
