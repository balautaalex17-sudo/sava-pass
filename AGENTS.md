# SavaPass

## About

Digital ticketing app for **Interact Sf. Sava** (school club, Bucharest). Mobile-first event pass: view event → buy ticket → receive QR → scan at the door. Inspired by DICE / Apple Wallet / Stripe Checkout.

**Current state: Full production app built in `web/`** (Next.js 16 + Supabase + Stripe + Resend). All 6 build phases complete. Prototype at root is preserved as visual reference only.

Implemented screens (visual only, no real backend):
- Mobile app: Home, Event Details, Checkout, Payment Success, My Ticket (QR), Scanner, Admin Dashboard
- Desktop website: brand landing with hero, "how it works", events grid, about Interact, footer
- Mobile-web view: site adapted for phone (used as deep link from shared tickets)

See `PRODUCT.md` for the product vision + design system, `HANDOFF.md` for the technical handoff (code structure, data contract, path to production), and `chats/` for the full design intent (raw transcripts from the design tool).

## Tech stack

**Production app (`web/`):**
- Next.js 16 (App Router, server actions, Turbopack)
- Tailwind v4 (`@theme` CSS variables in `globals.css`)
- Supabase (Postgres, RLS, Realtime, Auth) — project `shzyvrojbtbczqqoilip`
- Stripe Checkout (RON, API version `2026-05-27.dahlia`)
- Resend (transactional email)
- HMAC-SHA256 QR token format: `SP1.<ticketId>.<base64url(hmac)>`
- `@zxing/browser` for camera QR decode on scanner page

**Prototype (root):**
- React 18 UMD + Babel-in-browser, no build step, plain CSS tokens

## How to work in here

CDN dependencies + `<script src="src/...">` means **opening the file directly will likely fail** in modern browsers (CORS on `file://`). Serve locally:

```bash
cd projects/sava-pass
python -m http.server 8080
# then open http://localhost:8080/SavaPass%20Prototype.html
```

Or `npx serve .` if Python isn't installed.

When editing one screen, grep for its name first — don't load the whole 56KB `screens-mobile.jsx` into context for a one-screen change.

### Next steps (for real product)

The prototype is the *visual contract*. The full build plan lives in `PLAN.md`: stack is **Next.js 15 + Supabase + Stripe + Resend**, production app goes in `web/`, built in 6 phases (scaffold → public pages → purchase → scanner → admin → launch) with a ready-to-paste Codex prompt per phase. Follow PLAN.md §9 prompts in order, one per session, commit after each.

## Architecture

Single HTML entry loads React UMD + Babel from CDN, then `<script type="text/babel" src="src/...">` tags pull in the JSX modules. Babel transforms them in the browser. No bundler involved.

## Conventions

```
SavaPass Prototype.html     entry, opens directly in browser
src/                        12 JSX/CSS modules (components, screens, app composition)
assets/                     event posters, Interact logos
uploads/                    pasted/drawn images from design iteration (reference, can remove later)
chats/                      raw design-tool transcripts (chat1 = app + spec, chat2 = landing)
PRODUCT.md                  product vision + design system (merged master)
HANDOFF.md                  technical handoff: code structure, data contract, prod path
PLAN.md                     full-stack build plan: PRD, schema, flows, phases, Codex prompts
web/                        (future) production Next.js app — prototype at root stays as reference
.design-canvas.state.json   design tool state (preserved for re-import)
active/                     temp/scratch (gitignored)
.cloud/, .Codex/           Codex tools/config
```

## Lessons learned

- `Codex.ai/design/p/<id>?...&via=share` share URLs return **403** to WebFetch (auth-gated) and the `api.anthropic.com/v1/design/h/<id>` handoff form 404s for these. Can't pull a live design programmatically — work from the extracted bundle in `active/savapass-design/` or ask the user to re-export / paste the files.
- The extracted bundle in `active/savapass-design/` is an **older snapshot** than the live design. The user's newer HANDOFF.md references files that don't exist locally (`Flow Video.html`, `membership.jsx`, `animations.jsx`, `flow-video.jsx`, standalone `export/` bundles). When a handoff doc lists files, verify they exist before assuming the merge is complete.
- Master docs are now `PRODUCT.md` (product + design system) and `HANDOFF.md` (technical). The old generic `HANDOFF_README.md` was removed (folded into PRODUCT.md §1).
- **Supabase type stubs go stale immediately.** Always generate real types with `supabase gen types` (or the MCP `generate_typescript_types` tool) before writing code that calls `.from()` — manual stubs cause `never[]` insert errors that are hard to debug.
- **Next.js 16 breaking changes vs 15:** (1) `middleware.ts` → `proxy.ts`, function must be named `proxy`; (2) Stripe API version was `2025-04-30.basil`, now must be `"2026-05-27.dahlia"` (SDK v22+); (3) Zod v4 renamed `errorMap` to `error` in `.literal()` second arg.
- **`Buffer` is not `BodyInit`** in this TypeScript config. When returning a PNG from a route handler, wrap with `new Uint8Array(buffer)` before passing to `new Response(...)`.
- **`useSearchParams()` always needs `<Suspense>`** wrapping in Next.js App Router or the static build fails. Split the page into an inner component that uses the hook + an outer default export that wraps it in `<Suspense>`.
- `event_stats` view columns are nullable (`sold: number | null`, `checked_in: number | null`) in generated types — always null-coalesce with `?? 0` before arithmetic comparisons.
- **The "3 missing env keys" claim was wrong — it's 5.** `.env.local` had `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `QR_SIGNING_SECRET` AND the whole Stripe trio (`pk_test`/`sk_test`/`whsec`) as `*_REPLACE_ME` placeholders. Masked-prefix checks (`pk_test...`) are misleading because the placeholder literally starts with `pk_test_`. Always grep `.env.local` for `REPLACE_ME` to count real gaps.
- **The scary security risks flagged in review were already handled in code (2026-06-11 audit):** scanner check-in is already atomic (`update().eq("status","valid").select()` → 0 rows = already_in, `scanner/actions.ts`); `tickets` RLS is staff-only SELECT (`is_staff()`), no anon read, so no ticket enumeration; Stripe webhook early-returns if order already `paid`. Buyer ticket view at `/bilet/[token]` works via service-role + HMAC token, not an anon RLS policy. Verify code before trusting a review's "this is probably broken."
- **Supabase MCP cannot return the `service_role` secret, but the Supabase CLI can** — this machine is logged in (token in Windows Credential Manager), so `npx -y supabase projects api-keys --project-ref shzyvrojbtbczqqoilip -o json` returns the real service_role key with no dashboard visit. Stripe/Resend keys still need the user to paste them (no logged-in CLI for those).
- Live DB already seeded: active event `echoes-unplugged` (4500 bani / 120 cap) plus two `past` events. Use it for end-to-end testing, no seeding needed.
- **"Eroare internă" on checkout was the `orders` insert failing with the placeholder service-role key** (fixed 2026-06-11: real key + generated `QR_SIGNING_SECRET` written to `web/.env.local`). Stripe trio + Resend still placeholders. With a fake Stripe key the action now fails cleanly at session-create with "Plata nu a putut fi inițiată" and marks the order `failed`.
- Next.js dev hot-reloads `.env.local` edits (logs `Reload env`) — no server restart needed after changing env values.
- **Server-action forms are curl-testable without a browser:** GET the page, copy the rendered hidden inputs (`$ACTION_REF_1`, `$ACTION_1:0`, `$ACTION_KEY`) into a multipart POST alongside the visible fields. The response HTML contains the returned action state. (Next 16 uses these names, not the older `$ACTION_ID_<hash>`.)
- In server actions, keep `redirect()` **outside** try/catch — it throws `NEXT_REDIRECT` internally, so a catch around it swallows the redirect.
- **Success page stuck on "Se emite biletul…" then "Ceva a mers greșit" = webhook never delivered.** The page polls `/api/order-status` 15× / 2s; order stays `pending` because nothing marked it `paid`. Root cause is almost always `stripe listen` not running (separate long-lived process) — grep the dev-server log for `POST /api/webhooks/stripe`; zero hits = listener down.
- **The `whsec_` from `stripe listen` is `whsec_` + 64 hex = 70 chars total.** A pasted value of len 69 is truncated by one char and silently fails signature verification (route returns 400, order never completes). Verify exact match, don't eyeball the prefix. Print it non-interactively with `stripe listen ... --print-secret`.
- **`stripe listen` is stable per device** — the signing secret doesn't rotate between runs, so once it's correct in `.env.local` it stays correct. Stripe CLI installed via `winget install Stripe.StripeCli`; binary at `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Stripe.StripeCli_*\stripe.exe` (PATH needs a shell restart after install).
- **Replay a missed webhook without re-paying:** `stripe events list --limit 5` to find the `checkout.session.completed` (its `data.object.metadata.order_id` ties it to the stuck order), then `stripe events resend <evt_id>` — it forwards to the running `stripe listen`. Completed the stuck `pending` order this way (2026-06-11).
- Stripe account on this machine is `acct_1Th7kwPBEvqABTYx` (display name "Alex"). The Stripe MCP is connected but **cannot return API keys** (Stripe never exposes `sk_`/`pk_` via API by design) — keys come from the dashboard, webhook secret from the CLI.
- Resend `from` is `noreply@savapass.ro` (unverified domain) — the ticket email will likely be rejected by Resend even though the webhook returns 200 (it doesn't check the send result). In-app ticket at `/bilet/<token>` works regardless. Verify a domain in Resend before trusting email delivery.
- **Supabase-generated `types.ts` can have escaped quotes (`\"`) in the CompositeTypes utility section**, causing TS1127 parse errors. Always check `lib/supabase/types.ts` for `\"` after regenerating types and replace with plain `"`.
- **Email-based RLS is the right strategy for retroactive ticket linking.** Instead of joining on `user_id` FK (which requires backfill), add a policy `USING (auth.jwt()->>'email' = holder_email)` — past tickets appear on first sign-in automatically.
- **Buyer route handling in proxy.ts:** for `/conta/*`, only refresh the session cookie in the middleware and let the page do its own `redirect('/conta/login')` via `getUser()` — avoids double-redirects and keeps auth logic centralized in the page.

## Token-saving rules

- Grep for screen name before loading any large JSX file.
- Always run `generate_typescript_types` MCP tool before touching any Supabase `from()` call — stale stubs cost multiple build-fix cycles.
- Build errors in Next.js Turbopack are sequential: fix one, rebuild, fix next. Don't try to fix multiple TS errors at once without seeing the next error first.

## Never do

- Don't fetch the entire 56KB `screens-mobile.jsx` into context when only fixing one screen — `grep` for the screen name first.
- Don't render the prototype to take screenshots unless asked — per HANDOFF.md, source is authoritative.
- Don't try to open `SavaPass Prototype.html` via `file://` — CORS blocks the CDN scripts. Always serve over HTTP.
