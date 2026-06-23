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

The prototype is the *visual contract*. The full build plan lives in `PLAN.md`: stack is **Next.js 15 + Supabase + Stripe + Resend**, production app goes in `web/`, built in 6 phases (scaffold → public pages → purchase → scanner → admin → launch) with a ready-to-paste Claude Code prompt per phase. Follow PLAN.md §9 prompts in order, one per session, commit after each.

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
PLAN.md                     full-stack build plan: PRD, schema, flows, phases, Claude Code prompts
web/                        (future) production Next.js app — prototype at root stays as reference
.design-canvas.state.json   design tool state (preserved for re-import)
active/                     temp/scratch (gitignored)
.cloud/, .claude/           Claude tools/config
```

## Lessons learned

- `claude.ai/design/p/<id>?...&via=share` share URLs return **403** to WebFetch (auth-gated) and the `api.anthropic.com/v1/design/h/<id>` handoff form 404s for these. Can't pull a live design programmatically — work from the extracted bundle in `active/savapass-design/` or ask the user to re-export / paste the files.
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

- **Visual work follows `docs/REDESIGN-SPEC.md`, not the design skills directly.** The spec (written 2026-06-12) already resolves every PRODUCT.md-vs-skill conflict (eyebrows = data labels only, em dash/· sanctioned, Instrument Serif kept at 3 ceremonial moments, backdrop-blur removed everywhere, scanner stays dark but flat navy). Implementer agents read only the spec + their batch files.
- Audit found shipped violations of PRODUCT.md worth remembering: blurred navs (PRODUCT.md allows blur in one place), radial-gradient scanner bg (page gradients banned), emoji in AdminClient/conta-login (no emoji rule), 6px gradient side-stripe on conta ticket cards. The spec's batch C/D kill all four.
- **Batch A redesign complete (2026-06-12).** Motion system installed in globals.css (tokens, keyframes, utility classes, scroll-reveal pattern). Shared components reworked: Button (pressable/hover-dim classes, no more useState press), Chip (dot=false default, size sm), Logo (logo-gear class for hover spin), new Reveal.tsx (IntersectionObserver scroll-reveal), new GearWatermark.tsx. Landing page redesigned: blur removed, eyebrows killed above headings, hero stats strip deleted, TrustBand slimmed to inline strip, HowItWorks cards replaced with transparent columns + mono numerals, EventsGrid inner CTA block replaced with price+arrow row, AboutInteract navy stat card deleted (replaced with inline stat ledger), pillars converted from grid to pillar list.
- **Polymorphic `as` ref typing in Next.js 16 TS strict mode:** `@ts-expect-error` fails when TS can actually type-check the expression. Use `ref as React.Ref<HTMLDivElement>` cast on polymorphic component refs — cleaner and does not trigger unused-directive error.
- **Batch B redesign complete (2026-06-12).** Buyer flow redesigned per REDESIGN-SPEC.md Batch B: event page (blur removed, eyebrows replaced with sentence-case h2s, content column narrowed to 440, program/perks staggered with anim-rise-fast, poster chip updated, seats chip dot only on warning), BuyCta (blur removed, label format "Cumpără bilet · N RON" with mono price, entrance anim-rise 120ms delay), checkout (eyebrow deleted, context line added, onFocus/onBlur JS deleted replaced with .input class, field rows staggered, general error gets anim-shake anim-fade), success page (Loader2 replaced with gear SVG spinner + anim-spin-slow, ready state choreographed with serif italic h1 "Ești înăuntru." + ring-pulse + staggered anim delays, error state gets GearWatermark), ticket page (anim-pop entrance, used-state header gradient to slate ramp, void ANULAT label gets anim-shake, LiveClock inserted under QR code, footer line anim-fade delay 200ms). New component: LiveClock.tsx (client, pulsing dot + HH:MM:SS ticking clock).
- **`zIndex` with CSS var tokens in JSX:** TypeScript complains about `zIndex: "var(--z-nav)"` (string vs number). Use `"var(--z-nav)" as unknown as number` cast — the CSS var resolves at runtime, the cast satisfies the type checker without changing behavior.
- **Batch C redesign complete (2026-06-12).** Account/auth/system pages redesigned per REDESIGN-SPEC.md Batch C: conta page (eyebrow removed, greeting h1 with firstName, stat boxes quieted to mono 24/700 + sentence-case labels, TicketCard rebuilt as boarding-pass silhouette with dashed divider + stub zone + notch circles, EmptyState gets GearWatermark, SignOutButton hover shifts to danger), conta/login (emoji removed, MailCheck icon with anim-pop in sent state, anim-fade state swap, .input class, footnote · separator), staff login + invite (anim-rise card, 3px navy top border, inputs get .input class, Button variant="navy", anim-shake on errors), error.tsx (GearWatermark + anim-fade, shared Button + Link with .btn classes), not-found.tsx (GearWatermark, 72px serif 404, anim-rise, Link with .btn classes).
- **`Button` component does not support `as` prop** — when needing a link styled as a button, apply `.btn .btn--primary pressable hover-dim` classes directly on a Next.js `<Link>` component. Do not try to pass `as={Link}` to `Button`.
- **Batch D scanner redesign complete (2026-06-12).** Scanner redesigned per REDESIGN-SPEC.md Batch D: flat `--brand-navy` page bg (no gradient), solid dark aside (no blur), verdict choreography split by type (ok = anim-pop + ring-pulse green, warning = anim-pop only, error = anim-pop circle + anim-shake inner), local scale-in/fade-in keyframes deleted and replaced with global .anim-pop/.anim-fade, scan-line glow box-shadow removed and local scan-line keyframe deleted (global .anim-scanline used), all Romanian display strings fixed with correct diacritics (Deja înăuntru, Scanează, Verific…, Pornesc camera…, etc.), disabled buttons at 0.4 opacity, manual-code input gets onFocus/onBlur border-color transition for dark-mode focus ring. Other Batch D files (admin, events, team, statistici) were already spec-compliant.
- **Scanner verdict choreography pattern:** use an IIFE `{state === "result" && verdict && (() => { ... })()}` to compute animation classes inline from verdict.result without a wrapper component — keeps the JSX readable when the class set branches on 3+ conditions.
- **Fix-pass complete (2026-06-12).** All P1 items fixed (exclamation mark, diacritics, spring violations, Button loading keeps children, LiveClock hydration). All P2 items fixed except [verify] ones (font-weight 850/900/750 → 800/700, Button ghost hover uses color shift not filter, HowItWorks stagger uses data-armed transition-delay, checkout h1/context line restored, checkout fields staggered, TicketCard stagger moved to Link, hover shadow for ticket-card, SignOutButton hover via CSS, admin Live chip pulse, StatusControl 3 items, EventEditor full spec block, refresh-link CSS). P3 mechanical items fixed (strokeWidth={1.75} on scanner icons, "..." → "…", nav link hover transition, refresh-link CSS).
- **Landing v2 complete (2026-06-12).** Hero no longer uses event posters as background — the posters are only 340x465px (stretched to w=3840 they were the page's biggest visual problem). Brand surfaces now use real photography stored locally at `web/public/landing/` (hero.jpg = concert crowd, about.jpg = students planning; downloaded from Unsplash, stored locally to avoid next.config remotePatterns + broken-link risk). Posters remain on event cards only (their natural size). New motion: line-mask headline reveal (`.line-mask` + `sp-line-rise`), Ken Burns settle on hero photo (`.anim-zoom-settle`), drawing rail above HowItWorks steps, generic `.rstag` Reveal-stagger child class, scroll-driven nav shadow (`@supports (animation-timeline: scroll())`, zero JS), About photo scale-settle on reveal. New client components: `components/landing/TiltCard.tsx` (pointer tilt, CSS vars via ref + rAF, no setState) and `CountUp.tsx` (IO + rAF textContent mutation, server-renders final value).
- **Continuous-value animation pattern (landing):** pointer/scroll-driven values write CSS custom properties or textContent directly via ref inside rAF — never React state. Both TiltCard and CountUp gate themselves on `prefers-reduced-motion` and (for tilt) `(hover: hover) and (pointer: fine)` via matchMedia at mount.
- **Kill the dev server before `npm run build`** — both write to `.next/` (Turbopack). Stop via `Get-NetTCPConnection -LocalPort 3000` → `Stop-Process`, build, restart dev.
- **Chip component extended with `pulse` prop** — adds `anim-pulse-dot` class to the dot span when `pulse={true}`. Used for the admin Live chip. The `dot` prop must still be `true` for the dot to render.
- **EventEditor sticky save bar pattern:** use `position: sticky; bottom: 0` inside the form with `paddingBottom` on the form to prevent content being hidden behind the bar. The bar uses `margin: 0 -20px` to break out of the grid container's padding.
- **Manrope max weight is 800** — font-weight 850/900/750 all cause faux-bold synthesis. Any value above 800 gets silently clamped; use 800 (bold displays) or 700 (body/labels).
- **The current immersive landing is v3 in the separate `projects/Sava Pass #2` folder, NOT v2.** `web/app/imersiv/content.ts` is an orphaned verbatim port of `SavaPass Immersive v2.html` (different class system) with no `page.tsx` rendering it — dead. When wiring the immersive design to the backend, source from `Sava Pass #2/SavaPass Immersive v3.html` only. Plan: `docs/plans/2026-06-22-001-feat-immersive-v3-landing-backend-plan.md` (v3 → homepage `/`, verbatim port, route-lifetime in-page `<style>` for isolation so v3's global `body`/`:root`/`.btn` rules don't leak to other routes — same pattern the current `page.tsx` LandingStyles already uses).
- **v3 immersive landing is now LIVE on the homepage `/` (built + verified 2026-06-22).** Ported verbatim via `web/scripts/extract-immersive.mjs` (reads `Sava Pass #2/SavaPass Immersive v3.html`, splits style/markup/scripts, applies 3 mechanical edits: font tokens→next/font vars, `assets/`→`/imersiv/`, purchase CTAs→anchors with `__CTA_HREF__`). Outputs `web/app/_immersive/content.ts` (IMMERSIVE_CSS + IMMERSIVE_MARKUP as JSON-stringified strings) + `web/public/imersiv/engine.js` + `engine-motion.mjs`. `web/app/page.tsx` renders `<style>`+markup (dangerouslySetInnerHTML)+`<ImmersiveEngine/>` (client loader: sequential CDN lenis/gsap/scrolltrigger → engine.js → motion.mjs, with Lenis/ScrollTrigger teardown on remount). Old landing archived at `web/app/_archive/landing-v2.tsx`. **Extracting programmatically (not retyping ~1500 lines through the model) is the byte-faithful + token-cheap way to do a verbatim port — re-run the script to re-sync if v3 changes.**
- **Isolation verified working (R4):** route-lifetime in-page `<style>` confirmed — on `/`, `body` bg = `rgb(7,10,18)` (v3 `--ink`); on `/conta/login`, `rgb(248,250,252)` (app slate-50), `.sp-immersive-root`/`.intro` gone. The globals.css `.btn`/`body` collision is benign because the in-page `<style>` renders later in the cascade and wins every visible property. Engine runs clean (lenis/gsap/scrolltrigger true, 20/20 icons, count-up 80/180/264, QR 333 cells, **zero console errors**) via the playwright-skill script `verify-immersive.js`.
- **Supabase project `sava-pass` (ref shzyvrojbtbczqqoilip) auto-pauses to `INACTIVE` after inactivity (free tier).** When paused, `getActiveEvent()`/`getEventBySlug()` return null AND the server hangs ~5s per request before failing → homepage CTAs fall back to `#event`, `/[slug]` pages 404, every `GET /` logs `application-code: 5.0s`. This is NOT a code bug. Restore via Supabase MCP `restore_project` then poll MCP `get_project` until `ACTIVE_HEALTHY`. **Restore takes ~2 min and during `COMING_UP` the platform schemas (auth/extensions/vault) come back BEFORE the `public` app tables — an early `public_tables = 0` read is mid-restore, not data loss; re-check.** Data fully returns: active `echoes-unplugged` (4500 bani = 45 RON, cap 120) + past `cupids-hex`/`easter-egg-hunt`. After restore the homepage serves in ~0.2s.
- **The base app schema (events/orders/tickets) is NOT in `web/supabase/migrations/`** — only 3 incremental migrations are (roles_admin_tooling_a/b, event_status_swap, all 20260611). The foundational tables were applied directly via MCP/dashboard and never synced to the repo, so the schema can't be rebuilt from `web/supabase/migrations/` alone. If the DB is ever truly reset, recovery needs the original DDL (dump it now as an `00000000_init.sql` to be safe).
- **Homepage hardened against a slow/paused DB:** `web/app/page.tsx` wraps `getActiveEvent()` in a 2s `Promise.race` timeout (`activeSlug()`) so the static landing always renders fast even if Supabase hangs; only the CTA slug depends on the DB, falling back to `#event`.
- **sava-pass is NOT a git repo** — `git init` is required before any commit/PR/branch workflow (ce-work shipping, ultrareview local mode, etc.).

## Token-saving rules

- Grep for screen name before loading any large JSX file.
- Always run `generate_typescript_types` MCP tool before touching any Supabase `from()` call — stale stubs cost multiple build-fix cycles.
- Build errors in Next.js Turbopack are sequential: fix one, rebuild, fix next. Don't try to fix multiple TS errors at once without seeing the next error first.
- Start the dev server with the Bash tool (`npm run dev` + run_in_background), not PowerShell — PS 5.1 rejects the trailing `&` (ampersand reserved) and wastes a round-trip.
- In PowerShell, `npm.ps1` may be blocked by execution policy; use `npm.cmd run dev` instead to start the app.

## Never do

- Don't fetch the entire 56KB `screens-mobile.jsx` into context when only fixing one screen — `grep` for the screen name first.
- Don't render the prototype to take screenshots unless asked — per HANDOFF.md, source is authoritative.
- Don't try to open `SavaPass Prototype.html` via `file://` — CORS blocks the CDN scripts. Always serve over HTTP.
