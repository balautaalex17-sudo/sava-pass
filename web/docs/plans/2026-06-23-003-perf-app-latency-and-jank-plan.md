---
title: "perf: Cut SavaPass app latency and jank by a huge margin"
type: perf
status: active
date: 2026-06-23
scope: end-to-end performance pass (load latency + runtime smoothness), free measures only
surfaces: homepage (immersive), buyer flow, staff pages, data layer
---

# perf: Cut SavaPass app latency and jank by a huge margin

## Summary

An end-to-end performance pass over the SavaPass web app. No features or visuals change — the goal is to make first load and scrolling feel dramatically faster on phones and mid-range laptops. Two problem classes are in scope: **load latency** (oversized media, serial CDN library loads, uncached DB reads, Supabase cold hangs) and **runtime smoothness** (residual perpetual animations and any expensive paint-driven scroll effects). The single biggest lever is the homepage media: ~50 MB of unoptimized PNG/MP4 served via raw `<img>`/`<video>` tags. Fixing that alone should produce a step-change. All measures are free-tier only (no paid infra) per the scoping decision.

---

## Problem Frame

The app currently feels laggy in two ways:

1. **First load is heavy and slow.** The homepage `/` ships roughly 50 MB of media — e.g. `web/public/imersiv/step-event.png` is 5.6 MB, several stat/year/event PNGs are 2.2–3.6 MB each, and three `.mp4` loops total ~13 MB. These load through the verbatim-ported markup as raw `<img>`/`<video>` (12 images + 2 videos), so they get **no `next/image` resizing, no WebP/AVIF, and no real lazy-loading**. Multi-MB PNG decode also stalls the main thread mid-scroll, so this is both a transfer-size and a jank problem. On top of that, the scroll engine pulls `lenis`, `gsap`, and `ScrollTrigger` **serially from unpkg.com** in a post-hydration `useEffect`, and every page that reads the DB does so uncached on each request.

2. **The database goes cold.** The Supabase project is on the free tier and auto-pauses after inactivity. While paused, requests hang ~5 s before failing, and a restore takes ~2 min. This is the worst-case "the site is just stuck" experience.

The runtime-jank work on the immersive homepage is mostly done (native touch scroll, gated parallax on touch, throttled scroll handler, off-screen video pause). What remains is the heavy media (above) plus a couple of perpetual GSAP loops and a confirmation sweep for paint-driven scroll effects.

**Why now:** the app is live on `https://sava-pass.vercel.app`; the user reported it as "very laggy" on a real phone and asked to fix delay and lag "by a huge margin."

---

## Requirements

- **R1.** Cut homepage total transfer by roughly an order of magnitude (target < 5 MB initial, down from ~50 MB) without visible quality loss at display sizes.
- **R2.** Eliminate the ~5 s Supabase cold-hang as a routine user experience, using only free measures.
- **R3.** Reduce time-to-first-animation on the homepage (remove serial third-party CDN dependency from the critical path).
- **R4.** Avoid a live DB round-trip on every homepage/buyer load via caching, while keeping live data (sold counts) correct.
- **R5.** Preserve all current behavior and visuals: the homepage stays a verbatim-look v3 port; buyer/staff flows unchanged; reduce-motion is currently force-disabled by user choice and stays that way unless the user revisits it.
- **R6.** Keep the change set free-tier only — no Supabase Pro, no Vercel Pro.
- **R7.** Prove the improvement with before/after numbers, not vibes.

---

## Key Technical Decisions

### KTD1 — Fix the media at the file level, not by rewriting markup to `next/image`

The homepage markup is generated verbatim from `SavaPass Immersive v3.html` and injected via `dangerouslySetInnerHTML`, so `next/image` cannot wrap those tags without abandoning the verbatim-port model. Decision: **re-encode the actual asset files** (resize to real display dimensions, convert to WebP/AVIF with a sized fallback) and add `loading="lazy"`, `decoding="async"`, and intrinsic `width`/`height` to the non-hero `<img>` tags through a transform in `web/scripts/extract-immersive.mjs`. The hero/above-the-fold media stays eager. Videos get compressed, a `poster` frame, and `preload="metadata"`.
- *Alternative considered:* rewrite the markup to React `next/image`. Rejected — breaks the re-runnable extractor model and is large effort for the same transfer win that re-encoding delivers.

### KTD2 — Self-host and preload the engine libraries

Replace the three unpkg.com `<script>` loads with self-hosted copies under `web/public/imersiv/vendor/` (version-pinned), parallelize the independent ones (`lenis` can load alongside `gsap`; `ScrollTrigger` waits on `gsap`), and add `<link rel="preload">`/`preconnect` hints. Removes external DNS/TLS/latency and a third-party availability risk from the animation critical path.

### KTD3 — Cache DB reads with tag-based on-demand revalidation

Wrap `getActiveEvent`/`getEventBySlug`/`getPastEvents` in `unstable_cache` with cache tags (e.g. `events`, `event:<slug>`) and let the homepage and buyer event pages render as ISR/static. Invalidate via `revalidateTag` inside the event upsert/status server actions, so edits show immediately. **Stats (`getEventStats`, live sold counts) stay uncached** so availability is always current. This both speeds up loads and reduces how often a request has to wake a cold DB.

### KTD4 — Keep the database warm with a free scheduled ping

Add a lightweight `web/app/api/keep-warm/route.ts` that runs one trivial indexed query, triggered by a free scheduler (Vercel Cron via `web/vercel.json`, with an external uptime pinger noted as fallback). Prevents the free-tier inactivity pause that causes the 5 s cold-hang. Residual Vercel function cold-starts on Hobby cannot be fully removed for free — caching (KTD3) minimizes their frequency; documented as a known residual, not a regression.

---

## Implementation Units

### U1. Establish performance baseline and budget

**Goal:** Capture current numbers so the "huge margin" is measurable, and set targets.
**Requirements:** R7.
**Dependencies:** none.
**Files:**
- `web/docs/perf/baseline-2026-06-23.md` (create — recorded metrics)
- `web/scripts/perf-measure.mjs` (create — repeatable Playwright/Lighthouse capture script, lives alongside the existing `extract-immersive.mjs`)
**Approach:** Measure the live/local homepage and one buyer page on a throttled mobile profile: total transfer bytes, request count, LCP, TBT/long-tasks, CLS, and time-to-first-animation (hero reveal). Reuse the Playwright pattern already used this session (per-element timing, `window.__lenis`-driven scroll). Record a cold-DB sample (first hit after idle) separately. Write targets: homepage transfer < 5 MB, mobile LCP < 2.5 s, no 5 s cold-hang on a warm DB.
**Patterns to follow:** the session's ad-hoc Playwright diagnostics (`active/diag-*.mjs`); promote into a kept script under `web/scripts/`.
**Test scenarios:** `Test expectation: none -- measurement tooling. Verification is that the script runs and emits a baseline file with all listed metrics.`
**Verification:** `node scripts/perf-measure.mjs` outputs the metric set; baseline file committed.

### U2. Optimize homepage media (the ~50 MB → target < 5 MB lever)

**Goal:** Slash transfer and decode cost of homepage images/videos with no visible quality loss.
**Requirements:** R1, R5, R7.
**Dependencies:** U1 (baseline to measure against).
**Files:**
- `web/public/imersiv/*.png` → re-encoded to sized `.webp`/`.avif` (+ keep a sized fallback where needed)
- `web/public/imersiv/*.mp4` → recompressed, with a generated poster image
- `web/scripts/extract-immersive.mjs` (add a transform: rewrite media references to optimized files; add `loading="lazy"` + `decoding="async"` + intrinsic `width`/`height` on below-the-fold `<img>`; add `poster` + `preload="metadata"` on `<video>`; keep hero media eager)
- `web/app/_immersive/content.ts` (regenerated by the extractor)
- the source asset folder `Sava Pass #2/assets/` if the extractor reads originals from there (verify before re-encoding which copy is canonical)
**Approach:** Determine each image's real max display size from the v3 CSS, resize to ~2x that, encode WebP (AVIF where it wins) at visually-lossless quality. For videos, re-encode to a lower bitrate suitable for muted background loops and add a poster so first paint isn't blocked on video. Drive all rewiring through the extractor so a re-run stays reproducible (do not hand-edit `content.ts`).
**Patterns to follow:** the extractor's existing `repoint()` (`assets/` → `/imersiv/`) and the `.replace()` transform style; the CLAUDE.md rule "patch the extractor, then re-run."
**Test scenarios:**
- Happy path: every homepage image and video still renders at the same on-screen size/crop (visual diff vs baseline screenshots at 390px and 1280px).
- Edge: hero/above-the-fold media is NOT lazy (loads eagerly) so LCP doesn't regress.
- Integration: re-running `extract-immersive.mjs` reproduces the optimized references (no manual `content.ts` edits required).
- `Covers R1.` total homepage transfer drops below the budget set in U1.
**Verification:** perf script shows transfer < 5 MB and improved LCP/TBT; visual screenshots match baseline; zero console errors.

### U3. Self-host + preload the scroll-engine libraries

**Goal:** Remove the serial external-CDN chain from the animation critical path.
**Requirements:** R3, R5.
**Dependencies:** none (independent of U2).
**Files:**
- `web/public/imersiv/vendor/lenis.min.js`, `gsap.min.js`, `ScrollTrigger.min.js` (vendored, version-pinned to the current `lenis@1.3.21`, `gsap@3.12.5`)
- `web/app/_immersive/ImmersiveEngine.tsx` (load from local paths; load `lenis` and `gsap` in parallel, then `ScrollTrigger`, then `engine.js`, then the motion module; keep the teardown-on-remount logic)
- `web/app/page.tsx` or `web/app/layout.tsx` (add `<link rel="preload" as="script">` for the vendored libs + engine so they fetch early)
**Approach:** Mirror the current load order/teardown exactly, only changing source URLs and parallelizing the two independent libs. Preload hints let the browser fetch during HTML parse instead of after hydration.
**Patterns to follow:** existing `ImmersiveEngine.tsx` loader and its `cancelled`/teardown guards.
**Test scenarios:**
- Happy path: engine boots with `window.Lenis`/`gsap`/`ScrollTrigger` all defined, hero reveal + reveals fire, zero console errors (reuse the session's `verify-immersive`-style check).
- Edge: back-navigation into `/` re-arms cleanly (no duplicate Lenis/ScrollTriggers) — the teardown still works.
- Error path: if a local lib 404s, the page still renders (progressive-enhancement catch preserved).
- `Covers R3.` time-to-first-animation improves vs baseline.
**Verification:** Playwright shows libs loaded, 9 ScrollTriggers on desktop / native scroll on touch, 0 errors; network panel shows no unpkg.com requests.

### U4. Keep the Supabase DB warm (free)

**Goal:** Prevent the free-tier inactivity pause that causes ~5 s cold-hangs.
**Requirements:** R2, R6.
**Dependencies:** none.
**Files:**
- `web/app/api/keep-warm/route.ts` (create — one trivial indexed query, returns 200/`{ok:true}`, no secrets, cheap)
- `web/vercel.json` (create — Vercel Cron schedule hitting `/api/keep-warm`)
- `web/docs/perf/keep-warm.md` (create — documents the schedule + the free external-pinger fallback if Vercel Cron limits bite)
**Approach:** A GET route that runs e.g. `select id from events limit 1` via the server client and returns quickly. Schedule it a few times per day (well inside free Cron limits) so the project never reaches the inactivity threshold. Document an external uptime-monitor fallback (also free) in case Hobby Cron frequency is insufficient.
**Patterns to follow:** existing route handlers under `web/app/api/`; `web/lib/supabase/server` client.
**Test scenarios:**
- Happy path: `GET /api/keep-warm` returns 200 and performs exactly one lightweight query.
- Error path: if the DB is paused/unreachable, the route fails fast (short timeout) and returns a non-200 without throwing an unhandled error (so the cron log shows the miss).
- Security: route exposes no event/PII data and is safe to call publicly (or is guarded by a cron secret header if Vercel provides one).
- Integration: with the cron active, the DB stays `ACTIVE_HEALTHY` across an idle window (manual/over-time check, noted as observational).
**Verification:** route returns 200 locally; `vercel.json` cron validated; documented fallback present.

### U5. Cache event reads + render homepage/buyer as ISR

**Goal:** Stop doing a live DB round-trip on every load while keeping live data correct.
**Requirements:** R4, R5.
**Dependencies:** U4 (warm DB makes the occasional cache-miss revalidation cheap).
**Files:**
- `web/lib/events.ts` (wrap `getActiveEvent`/`getEventBySlug`/`getPastEvents` in `unstable_cache` with tags; leave `getEventStats` uncached)
- `web/app/page.tsx` (allow static/ISR now that the slug read is cached; keep the 2 s fail-fast as a safety net)
- `web/app/[slug]/page.tsx` (cached event read; parallelize the event + stats awaits with `Promise.all`; keep stats live)
- the event upsert/status server actions (likely `web/app/(staff)/admin/events/actions.ts`) — call `revalidateTag` on save/status-change
**Approach:** Cache the slow-changing event records under tags; invalidate precisely when staff edit an event so changes are immediate. Stats stay uncached so availability/sold counts are always current. Homepage becomes effectively static between revalidations, removing the per-load DB dependency for most visitors.
**Patterns to follow:** Next 16 `unstable_cache` + `revalidateTag` (read `node_modules/next/dist/docs/` per `web/AGENTS.md` before coding — Next 16 APIs differ); existing server-action structure.
**Test scenarios:**
- Happy path: homepage CTA and buyer page render from cache without a DB round-trip on a warm second load.
- Integration: editing an event (title/status) and saving makes the change appear on the next load (tag revalidation fires).
- Edge: a draft→active or active→past transition updates which event the homepage links to.
- Edge: `getEventStats` still reflects a just-purchased ticket immediately (not cached).
- `Covers R4.` confirms no per-request `events` query on repeat warm loads.
**Verification:** network/log shows cached renders; event edit reflects within one navigation; stats remain live.

### U6. Trim residual runtime jank + re-measure

**Goal:** Remove the remaining perpetual/expensive animations on weak devices and confirm the whole pass against the baseline.
**Requirements:** R5, R7.
**Dependencies:** U1 (baseline), and ideally after U2 (media decode was a jank source too).
**Files:**
- `web/scripts/extract-immersive.mjs` + regenerated `web/public/imersiv/engine.js` (gate the perpetual QR box-shadow loop / 18-rect opacity flicker to non-touch, or reduce their cost; box-shadow animation is the expensive one)
- `web/app/globals.css` (audit: no `filter`/`box-shadow` transitions running on many elements during scroll — the documented "never animate blur/box-shadow on many elements" rule)
**Approach:** Keep the phone showpiece visually intact on desktop; on touch, drop the perpetual box-shadow pulse (cheap opacity-only or none). Sweep globals + page `<style>` blocks for any `transition`/`animation` touching `filter` or `box-shadow` on repeated elements and convert to opacity/transform. Then re-run the U1 perf script and record after-numbers.
**Patterns to follow:** the session's mobile-perf gating (`__noTouch` matchMedia pattern in `engine.js`); CLAUDE.md jank lessons (blur/box-shadow GPU cost).
**Test scenarios:**
- Happy path: desktop homepage visually unchanged; reveals + showpiece still animate; 0 console errors.
- Edge: on a touch context, no perpetual box-shadow animation runs (verify via computed style / no continuous repaint).
- `Covers R7.` after-metrics recorded next to the U1 baseline showing the improvement.
**Verification:** before/after table in `web/docs/perf/` shows transfer, LCP, TBT, and cold-hang all improved; no visual regressions at 390px/1280px.

---

## Success Metrics

| Metric | Baseline (to capture in U1) | Target |
| --- | --- | --- |
| Homepage total transfer (mobile) | ~50 MB (est.) | < 5 MB |
| Homepage requests / largest asset | `step-event.png` 5.6 MB | largest asset < 0.5 MB |
| Mobile LCP | TBD | < 2.5 s |
| Time-to-first-animation | TBD | meaningfully lower; no external CDN hop |
| Cold-DB user experience | ~5 s hang / pause | no routine cold-hang (warm DB) |
| Repeat warm-load DB queries (homepage) | 1 per load | 0 (served from cache) |

---

## Scope Boundaries

**In scope:** homepage media + script-load + caching; buyer event-read caching; a free keep-warm cron; residual homepage animation trims; a repeatable perf-measurement script + baseline.

**Out of scope (non-goals):**
- Any paid infra (Supabase Pro, Vercel Pro). Free-tier only per the scoping decision.
- Feature or visual redesign of any surface.
- Re-enabling `prefers-reduced-motion` (currently force-disabled by explicit user choice).
- Rewriting the verbatim homepage markup into React components / `next/image`.

### Deferred to Follow-Up Work
- Converting homepage media to a true responsive `next/image` pipeline (only if the file-level re-encode proves insufficient).
- Paid-tier evaluation (Supabase Pro to remove auto-pause, Vercel Pro to cut function cold-starts) — documented as the durable option if free measures fall short of the targets.
- Bundle-level work (the ~65 KB inline immersive CSS) if it shows up as material after the media win.

---

## Risks & Dependencies

- **Re-encoding changes perceived quality.** Mitigation: encode at visually-lossless settings sized to real display dimensions; visual-diff at 390px and 1280px before/after (U2 test scenarios).
- **Caching serves stale event data.** Mitigation: tag-based `revalidateTag` on every event mutation; stats deliberately uncached (KTD3). Verified by the U5 edit-reflects-immediately scenario.
- **Vercel Hobby Cron frequency limits** may be too low to fully prevent the pause. Mitigation: document a free external uptime-pinger fallback (U4).
- **Next 16 API drift** (`unstable_cache`/`revalidateTag` semantics differ from older docs). Mitigation: read `node_modules/next/dist/docs/` first per `web/AGENTS.md`.
- **Residual Vercel function cold-starts** can't be removed for free. Accepted; minimized via caching and flagged as a known residual, not a regression.
- **Self-hosted libs must stay version-pinned** to match what `engine.js` expects (`lenis@1.3.21`, `gsap@3.12.5`).

---

## Verification Strategy

The `web/scripts/perf-measure.mjs` script (U1) is the spine: run it before (baseline) and after the pass (U6), on a throttled mobile profile, capturing transfer/LCP/TBT/CLS/time-to-first-animation plus a cold-DB sample. Each unit also has a local verification (visual parity, engine boot, route 200, cache behavior). Ship is gated on: homepage transfer under budget, no visual regressions, engine + reveals intact, event edits reflecting immediately, and the keep-warm cron live.
