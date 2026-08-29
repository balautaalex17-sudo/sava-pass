---
title: "chore: Data, accounts & reliability (Phase 4)"
type: chore
status: active
date: 2026-06-28
origin: web/docs/ROADMAP.md (Phase 4 — Data, accounts & reliability)
depth: standard
---

# chore: Data, accounts & reliability (Phase 4)

## Summary

Make SavaPass operationally sound for a real event: (1) the database must be **rebuildable from the repo** — today the foundational tables live only in the live Supabase project and are absent from `supabase/migrations/`, so a reset or a fresh environment can't be reconstructed; (2) the **paid-order → ticket** path must never strand a buyer (the code review found that if ticket issuance fails after the order is marked paid, the order is stuck `paid` with no ticket and Stripe can't retry); (3) small data-integrity + reliability gaps closed; and (4) a documented runbook for the operational steps only you can do (Supabase Pro, staff accounts, real events).

Most code value is U1–U3; U4 is a [Alex] runbook.

---

## Problem Frame

- **Schema not in the repo.** `supabase/migrations/` has 5 incremental files (roles, event-status swap, membership) but the **base tables** (`events`, `orders`, `tickets`, `scans`, `profiles`, the `event_stats` view, and the enums) were applied directly via MCP/dashboard and never committed. There is also no `supabase/config.toml`. Consequence: `supabase db reset` / a fresh project cannot rebuild the DB — the incrementals reference tables that don't exist. This is a disaster-recovery and onboarding risk (per CLAUDE.md, flagged but never resolved).
- **Issuance not atomic (reliability).** In `app/api/webhooks/stripe/route.ts`: the order is marked `paid`, then `issueTicket` runs; on failure the handler returns early. The order is now `paid` with **no ticket**, AND the idempotency guard (`existing.status === "paid"` → return) means a Stripe **retry or `events resend` does nothing** — the buyer is permanently stranded (success page polls forever → error). Surfaced by the 2026-06-28 code review.
- **Free-tier pausing.** The Supabase project auto-pauses after inactivity → cold buyer pages hang ~5s / 404. A daily keep-warm cron exists (`vercel.json` → `/api/keep-warm`) but Hobby crons run at most once/day, which may not prevent the pause window.
- **Small gaps.** Membership `tracks` is client-required (≥1) but not server-enforced — a raw POST can store an application with no direction.
- **Operational unknowns.** Real events still need creating; staff (door scanners) still need inviting; the admin account needs confirming.

---

## Requirements

- **R1** — `supabase db reset` (or a fresh linked project) rebuilds the full current schema from `supabase/migrations/` alone, with no manual dashboard steps.
- **R2** — A transient ticket-issuance failure never leaves a buyer with a paid order and no ticket: the flow is recoverable via Stripe retry / `events resend`.
- **R3** — The membership action rejects a submission with zero tracks (server-side), matching the client rule.
- **R4** — The buyer-facing site stays responsive cold (no multi-second hang from a paused DB) — via Supabase Pro or a verified-sufficient keep-warm.
- **R5** — A documented, repeatable runbook exists for the [Alex] operational steps (Pro upgrade, admin/staff accounts, creating real events).

Traceability: origin `web/docs/ROADMAP.md` Phase 4 steps 1-4, plus the two reliability/data items deferred from the 2026-06-28 code review (commit 807cf87 notes).

---

## Key Technical Decisions

- **KTD1 — Canonical schema = a single full-schema dump committed as the first migration; reconcile the 5 incrementals so a fresh reset succeeds.** Generate the current `public` schema from the linked remote with the Supabase CLI (`supabase db dump`, machine is logged in) rather than hand-writing DDL. The hard part is ordering: a full dump already contains everything the 5 incrementals add, so running init + incrementals on a fresh DB would error ("already exists"). Recommended resolution: make the dump the canonical `00000000000000_init.sql` (full current schema) and **neutralize the 5 incrementals as historical** — either fold them into the init and remove them, or guard them so a fresh reset is clean. Decide the exact mechanism at execution against a real `supabase db reset` (see Execution note on U1). Also add a minimal `supabase/config.toml` so the CLI has a project to reset against. _(Alternative: reconstruct a base-only pre-incremental init so init + the 5 incrementals = current — rejected: reproducing the exact pre-incremental state by hand is error-prone; a full dump is the ground truth.)_
- **KTD2 — Idempotency keys on ticket existence, not order status; issuance failure returns non-2xx so Stripe retries.** Change the webhook guard from "skip if `status === 'paid'`" to "skip if a `valid` ticket already exists for this order". Keep the capacity recheck. If `issueTicket` returns null, return a 5xx from the route so Stripe redelivers; on redelivery the guard finds no ticket and re-issues. Marking the order `paid` may stay before issuance (it's idempotent under the new ticket-existence guard) — the key change is the guard + the non-2xx-on-failure. This makes the paid→ticket step effectively at-least-once. _(Email send stays best-effort and never blocks the 2xx once a ticket exists.)_
- **KTD3 — Enforce `tracks ≥ 1` in the membership Zod schema**, mirroring the client `canNext` rule, so storage can't hold a direction-less application regardless of how the POST arrives.
- **KTD4 — Reliability is config-first.** The cold-start fix is primarily Supabase Pro (no pausing). Keep the keep-warm cron as defense-in-depth; do not over-engineer a second pinger. Document the trade-off rather than coding around the free tier.

---

## High-Level Technical Design

Webhook issuance, made at-least-once (KTD2):

```mermaid
flowchart TD
  E[checkout.session.completed] --> G{valid ticket already\nexists for order?}
  G -- yes --> OK2[return 200 — idempotent]
  G -- no --> CAP{capacity ok?}
  CAP -- no --> F[mark order failed -> 200]
  CAP -- yes --> P[mark order paid] --> ISS[issueTicket]
  ISS -- ok --> EM[send email best-effort] --> OK[return 200]
  ISS -- null/failure --> R5[return 5xx -> Stripe retries\n(next delivery re-enters, no ticket -> re-issues)]
```

---

## Implementation Units

### U1. Commit a rebuildable schema (`supabase/migrations` + config)

- **Goal:** The repo alone can recreate the full current DB. `supabase db reset` succeeds end-to-end.
- **Requirements:** R1.
- **Dependencies:** none.
- **Files:**
  - Create `web/supabase/migrations/00000000000000_init.sql` (full current `public` schema: tables `events`, `orders`, `tickets`, `scans`, `profiles`, `membership_applications`, the orphan `applicants` if kept, the `event_stats` view, all enums, RLS policies, functions like `is_staff()`/`is_admin()`, triggers, grants)
  - Create `web/supabase/config.toml` (minimal project config for the CLI)
  - Reconcile/neutralize the 5 existing `web/supabase/migrations/2026*.sql` per KTD1
- **Approach:** Use `supabase db dump` against the linked remote (project ref `shzyvrojbtbczqqoilip`) to capture the live schema; place as the canonical init; reconcile the incrementals so a fresh reset doesn't double-apply. Keep RLS policies + the `is_staff`/`is_admin` helpers (security-critical — they gate every table).
- **Execution note:** This is the one unit that needs runtime verification — **dump, then actually run `supabase db reset` against a throwaway/branch DB and confirm it rebuilds cleanly** before committing. Do not commit an init that hasn't been reset-tested. Use a Supabase **branch** (MCP `create_branch`) or a local stack as the throwaway target so the production DB is never reset.
- **Patterns to follow:** existing migration file naming/format under `web/supabase/migrations/`.
- **Test scenarios:**
  - `supabase db reset` on a fresh/branch DB completes without error and produces every table, view, enum, RLS policy, and function present in production.
  - Post-reset, a smoke check: an anon client cannot SELECT `tickets` (RLS), `is_staff()` exists, `event_stats` returns rows for a seeded event.
  - The 5 former incrementals do not error on a fresh reset (folded or guarded).
- **Verification:** A fresh `supabase db reset` yields a schema diff of zero against the production `public` schema (`supabase db diff` clean).

### U2. Make ticket issuance at-least-once in the Stripe webhook

- **Goal:** A paid order always converges to an issued ticket; no permanent paid-no-ticket state.
- **Requirements:** R2. (KTD2)
- **Dependencies:** none (independent of U1).
- **Files:** Modify `web/app/api/webhooks/stripe/route.ts`
- **Approach:** Replace the `existing.status === "paid"` early-return with a check for an existing `valid` ticket on the order (skip + 200 when present). Keep the capacity guard. On `issueTicket` returning null, return a 5xx response so Stripe redelivers (redelivery re-enters, finds no ticket, re-issues). Email stays best-effort after a ticket exists. Confirm the signature-verification path and the `charge.refunded` path are unchanged.
- **Patterns to follow:** the existing handler structure; `lib/tickets.ts` `issueTicket`; the idempotency comment already in the file.
- **Test scenarios:**
  - Covers R2. Simulated `issueTicket` failure → route returns 5xx, order is not left in a terminal success state without a ticket; a redelivery (`stripe events resend`) then issues the ticket and returns 200.
  - Idempotency: delivering `checkout.session.completed` twice for an order that already has a valid ticket issues exactly one ticket and returns 200 both times.
  - Happy path unchanged: first delivery → order paid + one ticket + email attempted.
  - Refund path (`charge.refunded`) still voids the ticket + marks order refunded.
- **Execution note:** No test runner in repo — verify by reasoning + a real `stripe events resend` against a deploy (per the webhook-replay note in CLAUDE.md), including forcing an issuance failure (e.g., temporarily bad service-role) to confirm the 5xx-then-recover path.
- **Verification:** A forced issuance failure leaves the order recoverable (redelivery issues the ticket); normal purchases unchanged.

### U3. Server-enforce membership `tracks ≥ 1`

- **Goal:** Storage never holds a membership application with no direction.
- **Requirements:** R3. (KTD3)
- **Dependencies:** none.
- **Files:** Modify `web/app/devino-membru/actions.ts`
- **Approach:** Add a server check: after reading `form.getAll("tracks")`, reject with a field error when the list is empty (mirror the client `canNext` step-1 rule). Keep the honeypot + storage-first posture.
- **Patterns to follow:** the existing Zod parse + `MembershipState.errors` shape in the same file.
- **Test scenarios:**
  - A POST with zero `tracks` inputs returns an error and writes nothing.
  - A POST with ≥1 track inserts normally (`strength` = joined tracks).
  - Honeypot filled → silent `ok:true`, no write (unchanged).
- **Execution note:** No runner — verify via a crafted multipart POST (per the server-action curl note in CLAUDE.md) or by reasoning.
- **Verification:** Build clean; a zero-track POST is rejected; the normal wizard still submits.

---

## Configuration & Rollout (operational — [Alex], no code)

1. **Supabase Pro (R4).** Upgrade the `shzyvrojbtbczqqoilip` project to Pro so it stops auto-pausing (the real cold-start fix). Keep the keep-warm cron as backup. If staying on free for now, accept that the first request after idle is slow and the homepage's 2s `Promise.race` guard already prevents a hard hang.
2. **Admin + staff accounts.** Confirm the admin account exists (`proiectnss@gmail.com` per `web/PRODUCTION_STATUS.md`). Invite door staff via `/invite` (the flow exists; scanner + admin are role-gated). No code needed.
3. **Real events.** Create the real event(s) in `/admin` (event editor exists), replacing/retiring the demo `echoes-unplugged`. Comp/test tickets can be minted via `/admin/emite-bilet`.
4. **Disaster-recovery note.** Once U1 lands, document in `web/docs/CONFIG.md` that the schema is now rebuildable via `supabase db reset`, and remove the stale "schema not in repo" caveat.

---

## Scope Boundaries

**In scope:** repo-rebuildable schema + config, webhook issuance atomicity, server-side tracks validation, and the operational runbook.

### Deferred to Follow-Up Work
- A staff-management UI (list/remove staff, change roles) — the `/invite` flow + role gating already cover the need; a management surface is a separate feature.
- A local Supabase dev stack / Docker workflow — `config.toml` is added for `db reset`, but standing up a full local stack is out of scope.
- Automated DB backups beyond what the Supabase plan provides.
- A second keep-warm mechanism / external uptime pinger — Pro makes it moot.
- Squashing the membership migrations or other historical-migration cleanup beyond what U1 needs for a clean reset.

---

## Risks & Dependencies

- **U1 is the riskiest unit — never reset production.** A `supabase db reset` is destructive; run it ONLY against a throwaway/branch DB. Mitigation: use an MCP `create_branch` target (auto-discarded) for the reset test; commit the init only after a clean reset there.
- **Schema dump fidelity:** `supabase db dump` may miss/mis-order grants, RLS, or extension setup. Mitigation: `supabase db diff` against production after the reset test must be empty before committing.
- **U2 retry semantics:** returning 5xx makes Stripe retry — ensure the new guard (ticket-existence) is correct so retries are truly idempotent (no double issuance). The capacity guard must run before issuance on every delivery.
- **Pro upgrade is a paid, account-level action** ([Alex]) — the code can't do it; U4 documents it. R4 is only fully met once it's done.
- Low coupling between units — U1/U2/U3 are independent and can land/verify separately.

---

## Open Questions

- **Squash vs guard the 5 incrementals?** Folding them into the init (and deleting them) is cleanest for a solo repo, but loses migration history; guarding them preserves history but is fiddlier. Decide at execution from what `db dump` + a reset test show. _(Does not block U2/U3.)_
- **Keep or drop the orphan `applicants` table?** (Empty, unreferenced, from the v2/v3 exploration per CLAUDE.md.) Include it in the init for fidelity, or drop it as cleanup? Recommend: include as-is in the dump (fidelity first); a separate cleanup migration can drop it later.
- **Pro now or defer?** If launch is imminent, Pro is worth it; if not, the keep-warm + 2s guard may suffice short-term. Product/cost call.
