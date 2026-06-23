---
title: "feat: Mobile experience pass (immersive homepage + whole app)"
status: active
date: 2026-06-23
type: feat
origin: none (solo ce-plan invocation)
depth: standard
---

# feat: Mobile experience pass — immersive homepage + whole app

## Summary

Make SavaPass excellent on phones across **every** surface, at **full visual fidelity**, keeping **Lenis smooth-scroll on touch** (all three confirmed by the user). This is an audit-and-polish pass, **not** a new mobile site: the v3 immersive landing already shipped responsive breakpoints (520–920px) that were ported verbatim, and at 390px there is no horizontal overflow, no console errors, and the hero/stats/event sections already stack. The real work is (1) global mobile foundations (viewport-fit, safe areas, `svh`/`dvh`, iOS input-zoom guard), (2) touch + engine tuning for the immersive homepage so motion tracks touch scroll, (3) small-width/landscape layout polish, (4) buyer-page polish, (5) staff tables/forms reflow, (6) the scanner as a real door-staff phone tool, and (7) a cross-device verification pass on representative widths + landscape + authenticated staff.

Verification is via the Playwright skill at mobile viewports plus `npm run build` — this project has no Jest/RTL harness, so "tests" here means scripted browser checks (overflow, tap-target size, reveal/scrub firing, zero console errors).

---

## Problem Frame

The homepage `/` is the v3 immersive landing ported verbatim into `web/app/_immersive/` (`content.ts` = CSS+markup, `web/public/imersiv/engine.js` = GSAP/Lenis, `web/public/imersiv/engine-motion.mjs` = CSS-class scroll reveals) and rendered by `web/app/page.tsx`. It was authored and tuned for desktop (1280px). The rest of the app is the re-themed, mobile-first ticketing product (buyer flow + staff tooling).

Current mobile reality (measured at 390×844, iPhone UA, this session):
- Homepage: **no overflow, no errors**; intro, hero (headline → copy → CTAs → phone), and stats sections stack correctly. The responsive CSS works.
- Buyer pages (`/[slug]`, `/[slug]/checkout`, `/devino-membru`): no overflow; sticky CTAs present and sensible.
- Staff pages (`/scanner`, `/statistici`, `/admin`): redirect to the staff login, which renders fine — but the **authenticated** content (data tables, the multi-column `EventEditor` grid, the camera scanner) is unverified on mobile and is the most likely trouble spot.

So the gaps are not "it's broken," they are: touch-feel and full-fidelity performance on the homepage, iOS viewport/safe-area correctness everywhere, and the data-dense staff surfaces at narrow widths.

---

## Requirements

- **R1** — The immersive homepage `/` is visually correct and comfortable on phones (360–430px) and in landscape, with full visual fidelity retained (no effect stripping).
- **R2** — Homepage motion feels right on touch: Lenis stays active on touch, GSAP scrubs and the scroll reveals (`.rv`, `.im-rv`, `.anim-rise`) track touch scrolling, background videos autoplay, and nothing janks or blinks on touch.
- **R3** — The buyer flow (event, checkout, success, ticket `/bilet`, account `/conta`, `/devino-membru`) is comfortable on phones: ≥44px tap targets, no iOS focus-zoom, sticky bars clear of the home indicator, QR remains scannable.
- **R4** — Staff surfaces (`/admin`, events editor, team, aplicatii, statistici) are usable on phones: data tables and the editor grid do not break layout, and every control is operable.
- **R5** — The scanner works on a phone for door staff: the camera preview is usefully sized, the verdict is legible at a glance, manual-code entry is operable, and controls are reachable one-handed.
- **R6** — Global mobile foundations are correct: viewport meta with `viewport-fit=cover`, `env(safe-area-inset-*)` honored on sticky/full-bleed UI, `svh`/`dvh` for full-screen immersive sections (iOS dynamic toolbar), inputs ≥16px (no iOS zoom), and **zero** horizontal overflow on any route.
- **R7** — The result is verified across representative mobile viewports (360 / 390 / 414) + landscape + authenticated staff, with a repeatable check script and a real-device checklist, and the production build passes.

---

## Key Technical Decisions

- **KTD1 — Keep Lenis active on touch, then tune touch behavior (honors user choice).** Lenis is already instantiated unconditionally in `engine.js` and driven by `gsap.ticker` with `ScrollTrigger.update` wired. By default Lenis 1.x does not smooth *touch* (only wheel), so touch is currently near-native. Honor "keep Lenis on touch" by explicitly opting touch in (`syncTouch: true` + a tuned `touchMultiplier`) and **verifying scrubs/reveals track touch scroll**, with `touchMultiplier`/`lerp` as the comfort knobs. Risk: smoothed touch can feel floaty — tune on a real device (see Risks).
- **KTD2 — Full fidelity on mobile (honors user choice); make it smooth rather than smaller.** No reduction of bokeh, equalizer, videos, blur, or parallax on phones. Instead: enforce GPU hygiene already in place (compositor-only transforms, `will-change` on reveals), confirm `muted playsinline` autoplay on iOS, and gate acceptance on a throttled-device framerate check. Effect-reduction is explicitly a deferred fallback only if real devices can't hold up.
- **KTD3 — Extend the existing breakpoint system; never restructure desktop.** Immersive CSS already cascades 520→920px; add/adjust only at the small-phone end (≤390/≤360) and landscape where gaps exist. App-page tweaks use Tailwind utilities + the existing inline styles. Desktop rendering must be untouched (verify desktop unchanged in U7).
- **KTD4 — Immersive CSS/engine edits flow through the extractor.** Mobile tweaks to the immersive layout/engine are made as `web/scripts/extract-immersive.mjs` patches (or in the v3 source `Sava Pass #2/SavaPass Immersive v3.html` then re-extract), then `node scripts/extract-immersive.mjs` regenerates `content.ts` / `engine.js` / `engine-motion.mjs` — consistent with every prior immersive change this session. Do **not** hand-edit the generated files as the source of truth.
- **KTD5 — Staff tables: horizontal-scroll wrapper, not card reflow.** Wrap data-dense tables (statistici, admin events list, team, aplicatii) in an `overflow-x:auto` container at ≤640px to preserve the columnar staff UX with minimal change; stack the `EventEditor` multi-column grid rows vertically on mobile. Card-reflow is the heavier alternative, deferred unless a table proves unusable scrolled.
- **KTD6 — Verification = Playwright mobile viewports + build (no unit-test harness exists).** Each unit is checked with scripted browser runs at 360/390/414 + landscape (overflow, tap-target geometry, reveal/scrub behavior, console errors) and `npm run build`. Staff units additionally require an authenticated session.

---

## High-Level Technical Design — surface × mobile concern matrix

| Surface | Primary mobile concerns | Mechanism |
|---|---|---|
| Global (all routes) | viewport-fit, safe-area insets, `svh`/`dvh`, 16px inputs, overscroll | `web/app/layout.tsx` viewport metadata + `web/app/globals.css` utilities (U1) |
| Immersive `/` — engine | Lenis on touch, scrub/reveal on touch, video autoplay, dots/rail tap targets, lightbox touch, snap-lock stays desktop-only | `engine.js` via extractor patches (U2) |
| Immersive `/` — layout | small-width spacing/type, landscape, intro/hero `svh`, phone-mockup scale, hero CTAs, telemetry labels | immersive CSS via extractor/v3 source (U3) |
| Buyer pages | tap targets, sticky bars vs safe-area, QR plate size, form/keyboard, no iOS zoom | per-page JSX + Tailwind + globals (U4) |
| Staff tables/forms | table overflow, `EventEditor` grid, admin header | overflow wrapper + grid stacking (U5) |
| Scanner | camera preview size, verdict legibility, manual entry, one-handed controls, full-height | `ScannerClient.tsx` + globals (U6) |

(Authoritative content lives in the per-unit sections below; this matrix is the orientation map.)

---

## Scope Boundaries

**In scope:** Mobile correctness, feel, and performance for **all** routes — immersive homepage, the full buyer flow, and **all staff surfaces including the scanner** — at full visual fidelity, with Lenis kept on touch. Global mobile foundations. A cross-device verification pass.

**Out of scope (non-goals):**
- Redesigning any mobile layout or changing the desktop experience.
- A native app, PWA install/offline, or push notifications.
- Stripping or simplifying the immersive effects (the user chose full fidelity).
- New product features or copy changes.

### Deferred to Follow-Up Work
- **Effect-reduction fallback** (fewer bokeh, capped equalizer, offscreen-video pause) — only if U7 finds real devices can't hold framerate at full fidelity. Captured as a contingency, not planned work.
- **Staff table card-reflow** — only if the horizontal-scroll wrapper (KTD5) proves unusable in U5/U7.
- **PWA / add-to-home-screen** polish (manifest, icons, theme-color) — valuable for door staff but a separate effort.

---

## Implementation Units

### U1. Global mobile foundations

**Goal:** Establish the viewport, safe-area, full-height, and input-zoom baseline every other unit relies on.
**Requirements:** R6.
**Dependencies:** none (first).
**Files:**
- `web/app/layout.tsx` — add a Next `viewport` export with `width=device-width, initialScale=1, viewportFit="cover"` (Next 16 `export const viewport: Viewport`), and `themeColor` matching the immersive ink (`#070A12`).
- `web/app/globals.css` — add: `env(safe-area-inset-*)` helper utilities for sticky/full-bleed bars; an `--app-vh` strategy using `100svh`/`100dvh` where full-screen height is needed; a base rule ensuring form controls are ≥16px on coarse pointers to prevent iOS focus-zoom; `overscroll-behavior-y: contain` consideration on scroll containers.
**Approach:** Pure foundation. Define utilities/tokens (e.g., `.safe-b { padding-bottom: max(<n>, env(safe-area-inset-bottom)); }`) that U4/U6 consume for sticky bars and the scanner. Decide `svh` vs `dvh` for the immersive intro/hero (used in U3). Do not restyle anything yet.
**Patterns to follow:** existing `:root` token block and utility classes in `web/app/globals.css`; Next 16 `Viewport` export (see `node_modules/next/dist/docs/` per `web/AGENTS.md`).
**Test scenarios:**
- Across `/`, `/[slug]`, `/[slug]/checkout`, `/devino-membru`, `/conta/login`, `/login` at 360/390/414: `document.documentElement.scrollWidth <= innerWidth + 2` (no horizontal overflow).
- Rendered `<meta name="viewport">` contains `viewport-fit=cover`.
- A representative `<input>` computes `font-size >= 16px` on a mobile context.
**Verification:** All listed routes report no overflow at all three widths; viewport meta present; `npm run build` passes.

### U2. Immersive homepage — touch & engine tuning

**Goal:** Make the homepage's motion engine feel right under touch with Lenis kept on (scrubs + reveals track touch, videos autoplay, chrome controls are tappable).
**Requirements:** R2 (advances R1).
**Dependencies:** U1.
**Files:**
- `web/scripts/extract-immersive.mjs` — extend the `engineOut` patch chain: opt Lenis into touch (`syncTouch: true`, tuned `touchMultiplier`); confirm/repair video autoplay path for iOS (`muted` + `playsinline` present in markup; `kickVideos` covers `touchstart`); ensure the dots/rail/progress chrome and the lightbox open/close work on `touch` (not hover-only).
- `web/public/imersiv/engine.js` — regenerated output (do not hand-edit as source).
- (If markup attrs are missing) `web/app/_immersive/content.ts` via extractor for `playsinline`/`muted` on `<video>`.
**Approach:** Honor KTD1. Verify the desktop-only interactions (pointer-tilt, magnetic buttons, snap-lock) remain gated behind `matchMedia('(hover:hover) and (pointer:fine)')` / `(hover:none)` so they stay off on touch (no wasted listeners, no broken behavior). Confirm the reveal systems shipped this session (`.rv` reveal-once, `.im-rv` CSS-class reveals, `.anim-rise` ScrollReveal) fire on touch-driven IntersectionObserver — IO is input-agnostic, so the risk is only Lenis/scroll-position sync, which KTD1 covers.
**Patterns to follow:** the existing `gsap.ticker`→`lenis.raf` integration and `lenis.on('scroll', ScrollTrigger.update)` wiring in `engine.js`; the existing `matchMedia('(hover:none)')` gates; the `kickVideos()` autoplay-resume pattern.
**Test scenarios:**
- On a touch context at 390px, after a sequence of `page.touchscreen`/`mouse.wheel`-driven scrolls into the event + stats sections: a scrubbed element (e.g., `.ev-poster img` scale, `.gen-ghost` drift) changes value with scroll position (scrub tracks touch).
- Hero headline `.hline>span` reaches `translateY(0)` after the hero enters view via touch scroll (reveal fires).
- Background `<video>` elements report `paused === false` shortly after load/first interaction.
- Desktop-only: at a touch/coarse-pointer context, pointer-tilt and snap-lock handlers are not active (no transform jitter on the phone mockup from tilt).
- Zero console errors through a full touch scroll of `/`.
**Verification:** Scrubs + reveals track touch scroll, videos play, no console errors; desktop wheel behavior unchanged; `npm run build` passes.

### U3. Immersive homepage — small-width & landscape layout polish

**Goal:** Tighten the immersive layout at the small-phone end and in landscape, using `svh`/`dvh` for full-screen sections.
**Requirements:** R1 (advances R6).
**Dependencies:** U1.
**Files:**
- `web/scripts/extract-immersive.mjs` (immersive CSS patches) and/or `Sava Pass #2/SavaPass Immersive v3.html` (source media queries) → regenerates `web/app/_immersive/content.ts`.
- `web/app/globals.css` only if a token is needed that the in-page style should inherit.
**Approach:** Audit the existing `@media(max-width: 520/560/760/820/900/920px)` blocks at **360px** and **landscape** specifically (the existing breakpoints target ≥520). Apply `100svh`/`100dvh` to the sticky `.intro` and the hero so the iOS address bar doesn't clip them. Verify phone-mockup scale, hero CTA sizing/stacking, section vertical rhythm, the `2024/2025` ghost numerals, and the intro telemetry labels (some are `display:none` at breakpoints — confirm the right ones hide). Do not introduce new desktop rules.
**Patterns to follow:** existing immersive `@media` cascade and the `clamp()`/`vw` sizing already in the v3 CSS.
**Test scenarios:**
- At 360×780 and 390×844: no overflow; hero headline, both CTAs, and the phone mockup are fully visible without clipping.
- Landscape (e.g., 740×360): intro and hero fit within the viewport height (use `svh`); no content is cut by the toolbar.
- The intro full-screen section height tracks `svh` (compare scrollHeight of `.intro` to `innerHeight` within tolerance).
- `Test expectation: visual/responsive — verified via Playwright viewport screenshots + overflow assertions (no behavioral unit tests in this project).`
**Verification:** Clean render at 360/390 + landscape; desktop (1280px) screenshot unchanged vs baseline; build passes.

### U4. Buyer pages — mobile polish

**Goal:** Make the buyer flow comfortable and safe-area-correct on phones.
**Requirements:** R3 (advances R6).
**Dependencies:** U1.
**Files:**
- `web/app/[slug]/page.tsx`, `web/app/[slug]/BuyCta.tsx` — sticky buy CTA clears the home indicator (`safe-b`), poster sizing, tap target ≥44px.
- `web/app/[slug]/checkout/CheckoutClient.tsx` — inputs ≥16px, sticky pay bar above safe-area, keyboard-open layout, field spacing.
- `web/app/succes/page.tsx`, `web/app/bilet/[token]/page.tsx` — QR sits on its white plate at a scannable size on small screens; confirm the plate isn't shrunk below a usable size.
- `web/app/conta/page.tsx`, `web/app/conta/ProfileCard.tsx`, `web/app/conta/login/page.tsx`, `web/app/devino-membru/page.tsx`, `web/app/devino-membru/MembershipForm.tsx` — boarding-pass ticket cards, form inputs, step list at small widths.
- `web/app/globals.css` — shared `.safe-b`/tap-target helpers (from U1).
**Approach:** These pages already pass overflow checks; this is polish. Apply the U1 safe-area helpers to every sticky/fixed bar; bump any sub-16px inputs; ensure interactive controls meet 44px; verify the QR plate dimensions on a 360px screen.
**Patterns to follow:** existing `.btn`/`.input`/`pressable` classes; the QR white-plate pattern in `web/app/bilet/[token]/page.tsx` (`background:#fff;padding:14px`).
**Test scenarios:**
- `/[slug]`: sticky "Cumpără bilet" CTA bottom edge sits above `env(safe-area-inset-bottom)`; CTA height ≥44px.
- `/[slug]/checkout`: every `<input>` font-size ≥16px; pay bar not obscured by the home indicator; no overflow with the virtual keyboard simulated (reduced height).
- `/bilet/[token]`: QR plate rendered width ≥ ~180px on a 360px screen (scannable).
- `/devino-membru`: form submits and the success/`anim-pop` state is fully visible; step list stacks.
- All buyer routes: no horizontal overflow at 360/390/414.
**Verification:** Tap targets, input sizes, sticky-bar insets, and QR size all pass at mobile widths; build passes.

### U5. Staff tables & forms — mobile reflow

**Goal:** Make the data-dense staff surfaces usable at narrow widths without breaking layout.
**Requirements:** R4.
**Dependencies:** U1.
**Files:**
- `web/app/(staff)/statistici/page.tsx` — events table → horizontal-scroll wrapper at ≤640px.
- `web/app/(staff)/admin/AdminClient.tsx` — admin table/list wrapper; header/nav wraps on mobile.
- `web/app/(staff)/admin/events/EventEditor.tsx` — the `gridTemplateColumns: "96px 1fr auto auto auto"` program/perk rows stack vertically on mobile; the sticky save bar honors safe-area.
- `web/app/(staff)/admin/team/TeamClient.tsx`, `web/app/(staff)/admin/aplicatii/page.tsx` — table wrappers.
- `web/app/globals.css` — a reusable `.table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }` helper (KTD5).
**Approach:** Wrap each table in `.table-scroll` so columns are preserved and pannable; the `EventEditor` editor grid is the one place that should reflow to stacked rows (a horizontally-scrolling *form* is bad UX). Ensure the admin header (links to events/team/aplicatii/statistici) wraps rather than overflows.
**Patterns to follow:** existing `row-hover`/table markup in `statistici/page.tsx` and `TeamClient.tsx`; the `EventEditor` sticky save-bar pattern.
**Test scenarios:**
- Authenticated staff at 390px on `/statistici`, `/admin`, `/admin/team`, `/admin/aplicatii`: page (document) has no horizontal overflow even though the table scroll container does (`.table-scroll` overflows internally, body does not).
- `/admin/events/[id]` (EventEditor): program/perk rows stack to full-width fields at ≤640px; all inputs reachable; save bar clears safe-area.
- Admin header links wrap to a second line rather than overflowing at 360px.
- Tap targets in tables (status controls, edit links) ≥44px.
**Verification:** No document overflow on any staff route at mobile widths; editor form fully operable; build passes. (Requires a staff login — see Risks/Open Questions.)

### U6. Scanner — mobile door-staff tool

**Goal:** Make `/scanner` genuinely usable on a phone at the door: camera preview sized well, verdict legible, manual entry operable, controls one-handed.
**Requirements:** R5.
**Dependencies:** U1.
**Files:**
- `web/app/(staff)/scanner/ScannerClient.tsx` — camera/video preview sizing for portrait phones; verdict block (`anim-pop` ok/warning/error) large and legible; manual-code input ≥16px; "start camera"/manual controls within thumb reach; full-height layout using `svh`/`dvh` minus safe-area.
- `web/app/globals.css` — scanner-specific mobile helpers if needed.
**Approach:** The scanner is already a flat dark instrument (`@zxing/browser` camera decode). On mobile, the camera preview should fill a usable portrait area, the verdict must read at a glance in low light, and the manual fallback (typed code) must be easy. Honor safe-area for the bottom controls. Keep it calm (no added glow), per the scanner design intent.
**Patterns to follow:** existing scanner verdict choreography (`anim.circle`/`anim.inner` IIFE) and the dark instrument styling already in `ScannerClient.tsx`; `@zxing/browser` camera lifecycle already implemented.
**Test scenarios:**
- Authenticated staff at 390×844 on `/scanner`: camera preview region occupies a usable portrait area (e.g., ≥40% of viewport height); no overflow.
- Verdict states (ok / already-in / error) render with legible type and the colored circle, fully on-screen.
- Manual-code `<input>` font-size ≥16px and reachable; submit control ≥44px.
- Bottom controls clear `env(safe-area-inset-bottom)`.
- `Covers R5.` A simulated successful manual code drives the verdict UI to the "ok"/valid state.
**Verification:** Scanner is operable one-handed at mobile size with legible verdicts; no overflow; build passes. (Requires staff login + camera permission; camera can be stubbed where needed — see Risks.)

### U7. Cross-device verification pass

**Goal:** Prove the whole app at representative mobile widths + landscape + authenticated staff, and lock a repeatable check.
**Requirements:** R7.
**Dependencies:** U1–U6.
**Files:**
- `web/scripts/verify-mobile.mjs` (new) — a Playwright script iterating routes × {360, 390, 414, landscape} asserting no overflow, tap-target geometry, reveal/scrub firing, and zero console errors; logs in as staff for the staff routes.
- `web/docs/` — a short real-device checklist (iOS Safari + Android Chrome): notch/safe-area, address-bar height change, video autoplay, scroll feel, scanner camera.
**Approach:** Codify the ad-hoc checks used during U1–U6 into one script so regressions are catchable. Include a **desktop baseline** assertion (1280px screenshot/markers unchanged) so the mobile work provably did not alter desktop. Flag any framerate/jank concern at full fidelity here; if a real device can't hold up, open the deferred effect-reduction fallback.
**Patterns to follow:** the Playwright skill scripts used this session (`mouse.wheel` to drive Lenis, computed-style assertions, `pageerror` capture).
**Test scenarios:**
- Every public route at 360/390/414/landscape: no overflow, no console errors.
- Staff routes (authenticated): no document overflow; tables scroll internally; scanner operable.
- Desktop 1280px: key layout markers match the pre-change baseline (no desktop regression).
- Homepage touch scroll: reveals fire once (no blink), scrubs track, videos play.
**Verification:** The script passes for all route×viewport combinations; desktop baseline unchanged; `npm run build` passes; real-device checklist completed.

---

## Risks & Dependencies

- **Lenis smooth-touch can feel floaty (KTD1).** Smoothed touch is the user's explicit choice; mitigation is tuning `touchMultiplier`/`lerp` and a real-device feel check in U7. If it feels wrong on device, the fallback (native momentum on touch) is a one-line gate — but only with user sign-off, since they chose to keep Lenis on touch.
- **Full fidelity on mid-range phones (KTD2).** Bokeh blur + looping videos + equalizer + parallax simultaneously can drop frames or heat the device. U7 gates on a throttled-device check; effect-reduction is the deferred fallback.
- **Staff verification needs an authenticated session.** U5/U6/U7 require a staff login; the scanner also needs camera permission (stub the camera in Playwright where possible, but a real-device check is needed for the actual camera). **Prerequisite:** confirm a staff test account is available (the machine is logged into Supabase, but a staff *user* credential is separate).
- **iOS dynamic toolbar + `svh`/`dvh` support.** `svh`/`dvh` are well-supported in current iOS/Android but must be verified on a real device; the `100vh` fallback should remain for very old browsers.
- **Immersive edits must go through the extractor (KTD4).** Hand-editing `content.ts`/`engine.js` as source will be lost on the next `extract-immersive.mjs` run; all immersive mobile changes are extractor patches.
- **Stale Turbopack `.next` cache** has bitten CSS changes twice this session — after globals.css edits, verify the served chunk contains the new rule (or `rm -rf web/.next` + rebuild) before concluding a fix didn't work.

---

## System-Wide Impact

- **Affected users:** phone visitors (homepage + buyer flow) and door staff (scanner on a phone) — the majority of real-world usage for a ticketing app.
- **Desktop must be unchanged:** every immersive and app-page change is additive at mobile breakpoints; U7 asserts the desktop baseline.
- **Shared surfaces:** `web/app/globals.css` (safe-area/tap-target/table-scroll helpers) and `web/app/layout.tsx` (viewport) are consumed app-wide — U1 lands first so U4/U5/U6 build on it.
- **Build/tooling:** no new dependencies expected; verification adds one Playwright script under `web/scripts/`.

---

## Open Questions (deferred to implementation)

- Exact `touchMultiplier`/`lerp` values for Lenis on touch — tune against a real device in U2/U7 (execution-time, not knowable now).
- Whether `EventEditor` rows are better as stacked fields or a scrollable grid — decide when looking at the authenticated editor on a real phone (U5).
- Whether any single full-fidelity effect must be throttled on mobile — answered by the U7 device check, not assumed now.
- Staff test-account availability for U5/U6/U7 verification (prerequisite to confirm).

---

## Sources & Research

- This session's direct measurements: homepage + buyer + staff-login renders at 390×844 (no overflow, no errors; staff content auth-gated).
- Immersive CSS breakpoint inventory: `@media` at 520/560/760/820/900/920px present in `web/app/_immersive/content.ts`; `prefers-reduced-motion` block present.
- Engine desktop-gating: `matchMedia('(hover:none)' / '(hover:hover) and (pointer:fine)')` gates in `web/public/imersiv/engine.js` (pointer-tilt, magnetic, snap-lock).
- Prior immersive lessons (this session, recorded in `projects/sava-pass/CLAUDE.md`): extractor-as-source-of-truth, Lenis↔gsap.ticker sync, reveal-once/`.im-rv` CSS-class reveals, stale-`.next`-cache gotcha.
- `web/AGENTS.md`: Next 16 has breaking changes — read `node_modules/next/dist/docs/` before writing (applies to the `viewport` export in U1).
