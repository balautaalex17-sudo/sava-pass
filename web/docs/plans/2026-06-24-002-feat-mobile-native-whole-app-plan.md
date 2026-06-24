---
title: "feat: Mobile-native polish across the whole app (desktop intact)"
status: active
date: 2026-06-24
type: feat
origin: none (solo ce-plan invocation; grounded in device screenshots of sava-pass.vercel.app + this session's immersive/mobile work)
depth: deep
---

# feat: Mobile-native polish across the whole app

## Summary

Make SavaPass **feel mobile-native on phones across every surface** — conservative approach: keep the v3 design language and motion, but subtract desktop-only clutter, tighten spacing and type for 360–430px, enforce ≥44px tap targets and ≥16px inputs, give primary actions full-width thumb-zone CTAs, honor safe-area insets, and remove every overlap. **Desktop stays byte-for-byte identical** — all changes are mobile-only (media-query / coarse-pointer) overrides; no desktop selector is edited.

This is a real polish pass, not a redesign and not a rebuild. The diagnosis that motivates it: the immersive homepage is a verbatim desktop-authored port, and its phone-range CSS was barely tuned — the `@media(max-width:520px)` block currently overrides almost nothing (just the past-events grid + event CTAs); all real responsive work lives at 760–920px. So phones inherit desktop positioning, which is why decoratives overlap content (the `01–05` dots — already fixed in 001 — and the hero marquee landing on the eyebrow) and spacing feels desktop-y. The buyer/staff pages are already mobile-first (prior pass [web/docs/plans/2026-06-23-002-feat-mobile-experience-pass-plan.md](docs/plans/2026-06-23-002-feat-mobile-experience-pass-plan.md), commit `9cb707c`) but get a genuine native-feel polish here, not just verification.

Already shipped this session and folded in: 001 hid the `.dots` section-nav on mobile; a staged extractor patch additionally hides the `.strip` hero marquee (U2 below). Verification is Playwright at mobile viewports + served-HTML grep + `npm run build` (no unit-test harness exists).

---

## Problem Frame

Three layers, by surface:

1. **Immersive homepage `/`** (`web/app/_immersive/content.ts` = CSS+markup via `web/scripts/extract-immersive.mjs`; `web/public/imersiv/engine.js` GSAP/Lenis; `engine-motion.mjs` reveals; rendered by `web/app/page.tsx`). Authored at 1280px. Sections: `#intro`, `#hero`, `#event` (`.sec`), `#stats`, `#join` (`.sec join`), `#foot`. **Phone-range CSS is thin** — desktop positioning leaks through, so viewport-level decoratives overlap content and spacing/type read as desktop. This is the bulk of the work.
2. **Buyer + account pages** (`/[slug]`, `/[slug]/checkout`, `/succes`, `/bilet/[token]`, `/conta`, `/conta/login`, `/devino-membru`). Real data-driven React, already mobile-first; needs native-feel polish: full-width thumb CTAs, ≥44px targets, ≥16px inputs, safe-area sticky bars, comfortable spacing.
3. **Staff tooling** (`/admin`, `/admin/events/[id]`, `/admin/team`, `/admin/aplicatii`, `/statistici`, `/scanner`). Data-dense; tables already scroll and the editor grid already stacks (002), but tap-target sizing, header wrapping, and the scanner-as-a-phone-tool feel still need a pass.

Confirmed non-bugs (do not chase): the right-edge dark pill with a scissors icon in device screenshots is the **Samsung "Smart Select" / edge-panel OS overlay**, not a site element; the intro `.engine-*` ticket chips bleeding off-edge are decorative, clipped by `.intro{overflow:hidden}`, by design.

---

## Requirements

- **R1** — Desktop is unchanged at every breakpoint ≥ the mobile cutoff (assert a 1280px baseline is identical pre/post).
- **R2** — No viewport-level decorative overlaps content on phones: the hero marquee (`.strip`), section-nav dots (`.dots`, done), side rails (`.lrail`, done), and telemetry corners (`.tele`) are hidden or contained at ≤760px.
- **R3** — The immersive homepage reads cleanly top-to-bottom on 360–430px and landscape: each section stacks single-column with mobile-appropriate vertical rhythm and type scale; zero horizontal overflow.
- **R4** — Primary actions are mobile-native: CTAs are full-width (or thumb-reachable) and ≥44px tall; all interactive controls meet ≥44px; this holds on homepage, buyer flow, account, and staff.
- **R5** — No iOS focus-zoom: every `<input>/<textarea>/<select>` computes ≥16px on coarse pointers.
- **R6** — Sticky/fixed bars and full-bleed UI honor `env(safe-area-inset-*)`; full-screen sections use `svh`/`dvh`; the QR ticket stays on its white plate at a scannable size.
- **R7** — Staff surfaces are operable one-handed on a phone: tables scroll without breaking the page, the event editor is usable, and the scanner is a legible door tool.
- **R8** — The result is verified across 360/390/414 + landscape (+ authenticated staff) with a repeatable script, desktop baseline asserted unchanged, build passes, and it is **live on `sava-pass.vercel.app`**.

---

## Key Technical Decisions

- **KTD1 — Mobile-only overrides; desktop selectors are never edited.** Every change is inside `@media(max-width:760px)` / `@media(max-width:520px)` / `@media(pointer:coarse)` or a mobile-scoped utility class. Desktop CSS is untouched, so PC is byte-for-byte identical (R1 asserts it). This is the contract that makes "keep PC intact" safe.
- **KTD2 — Conservative = subtract + tighten, not restructure.** Keep the v3 visual language and motion. On mobile: hide desktop-only decoratives, reduce section padding, scale type via `clamp()`/overrides, enforce tap-target/input sizing, make CTAs full-width. Do **not** rebuild section layouts, add a new mobile IA, or cut effects (motion stays, GPU-tuned). A sticky bottom CTA bar and effect-cutting are explicitly the *opinionated* path the user did not choose — deferred.
- **KTD3 — Two edit channels, by surface.** Homepage = `web/scripts/extract-immersive.mjs` `cssOut` patches (or the v3 source `Sava Pass #2/SavaPass Immersive v3.html`), then `node scripts/extract-immersive.mjs` regenerates `content.ts` — never hand-edit the generated file. App pages = Tailwind utilities + existing inline styles + `web/app/globals.css` helpers.
- **KTD4 — Reuse the 002 foundations; add only what's missing.** `app/layout.tsx` viewport (`viewportFit:"cover"`, `themeColor`), and globals helpers `.safe-pb/.safe-pt/.safe-px`, `.min-h-screen-dyn`, `@media(pointer:coarse){input…{font-size:16px}}`, `.table-scroll`, `.ee-prog-row` already exist. Add a shared `≥44px` tap-target helper if one isn't present; otherwise consume what's there.
- **KTD5 — Breakpoint `≤760px` primary, `≤520px` for fine phone tuning.** `≤760px` matches the existing dots/lrail hides and the immersive cascade; the existing `@media(max-width:520px)` block is where finest phone-only layout tweaks go. Verify the 760–920px tablet-portrait band doesn't regress.
- **KTD6 — Verify three ways, then ship.** (1) Playwright mobile contexts (overflow, tap-target geometry, input size, no-overlap, console errors); (2) served-HTML grep for homepage rules (immersive CSS is inlined — ground truth, guards the stale-`.next` cache); (3) a 1280px desktop baseline diff (R1). Then redeploy via the Vercel CLI (token kept available this round; the MCP deploys stale git, not local files).

---

## High-Level Technical Design — surface × treatment matrix

| Surface | Subtract (hide on mobile) | Tighten | Native-feel | Channel |
|---|---|---|---|---|
| Homepage `#intro/#hero` | marquee `.strip`, dots `.dots`✓, rails `.lrail`✓, `.tele` corners | intro/hero padding, headline `clamp`, eyebrow spacing | hero CTAs full-width ≥44px, `svh`/`dvh` intro | extractor (U2–U4) |
| Homepage `#event/#stats/#join/#foot` | any stray positioned label that overlaps | section vertical rhythm, type scale, single-col stacking | event "Cumpără bilet" full-width ≥44px, footer spacing | extractor (U3–U4) |
| Buyer (`/[slug]`, checkout, succes, bilet) | — | field/section spacing | sticky CTA full-width + safe-area, 16px inputs, QR plate size | Tailwind+inline (U5) |
| Account + membership (`/conta`, login, devino-membru) | — | card/form spacing | 16px inputs, ≥44px controls, full-width submit | Tailwind+inline (U6) |
| Staff (admin/editor/team/aplicatii/statistici) | — | header wrap, row density | ≥44px controls, `.table-scroll`✓, editor grid stack✓, safe-area save bar | Tailwind+inline (U7) |
| Scanner | — | — | camera fills portrait, verdict legible, one-handed controls, safe-area | Tailwind+inline (U7) |
| Global foundations | — | — | viewport✓, safe-area helpers✓, 16px rule✓, `dvh`✓, tap-target helper (add) | layout.tsx + globals (U1) |

(✓ = already shipped in 002/001; this plan verifies and builds on it. Authoritative detail is in the per-unit sections.)

---

## Output / ordering

```
U1  Global foundations (verify + add tap-target helper)      ──┐ dependency for U5–U7
U2  Homepage: hide desktop-only decoratives (extractor)        │ (homepage U2–U4 independent of U1)
U3  Homepage: per-section mobile layout/spacing/type           │
U4  Homepage: mobile CTAs + tap targets + no overflow          │
U5  Buyer flow native polish            ◀── depends on U1 ─────┤
U6  Account + membership native polish  ◀── depends on U1 ─────┤
U7  Staff + scanner native polish       ◀── depends on U1 ─────┘
U8  Cross-device verification + redeploy ◀── depends on U1–U7
```

---

## Scope Boundaries

**In scope:** A conservative mobile-native polish of **every** surface — immersive homepage, buyer flow, account/membership, all staff tooling including the scanner — plus global foundation verification and a cross-device pass, then a production redeploy. Desktop untouched.

**Out of scope (non-goals):**
- Any desktop change, or a homepage redesign / new mobile information architecture.
- Cutting or simplifying immersive effects (motion stays; conservative path).
- A sticky bottom global nav/CTA bar and other *opinionated-native* restructuring (the user chose conservative).
- New product features, copy changes, or backend/data changes.
- Native app / PWA / offline / push.
- The Samsung edge-panel OS overlay (not a site element).

### Deferred to Follow-Up Work
- **Opinionated-native upgrades** (sticky bottom buy bar, per-section restructured stacking, effect cuts) — only if the conservative pass still doesn't feel native enough after U8.
- **Effect-reduction fallback** for low-end devices — only if U8's device check finds framerate problems at full fidelity.
- A committed all-route mobile script as a permanent CI-style guard beyond U8's verification script.

---

## Implementation Units

### U1. Global foundations — verify and complete

**Goal:** Confirm the 002 mobile foundations are all present and add the one missing primitive (a shared ≥44px tap-target helper) that U5–U7 consume.
**Requirements:** R4, R5, R6.
**Dependencies:** none (first).
**Files:**
- `web/app/globals.css` — verify `.safe-pb/.safe-pt/.safe-px`, `.min-h-screen-dyn`, `@media(pointer:coarse){input,textarea,select{font-size:16px}}`, `.table-scroll`, `.ee-prog-row` exist; add a `.tap{min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center;}` helper (or equivalent) if absent.
- `web/app/layout.tsx` — confirm the `viewport` export (`width:device-width`, `viewportFit:"cover"`, `themeColor`) is present (it is) — no change expected.
**Approach:** Pure audit + a small additive helper. Do not restyle anything. This unit exists so later units reference one tap-target primitive instead of ad-hoc sizes.
**Patterns to follow:** the existing helper block in `web/app/globals.css` (002's U1 additions).
**Test scenarios:**
- All six helpers are present in `globals.css`; the served globals CSS chunk contains `.tap` after the edit (guards stale `.next`).
- A representative coarse-pointer `<input>` computes `font-size ≥ 16px`.
- `Test expectation: foundation/CSS — verified by presence + computed-style assertions; no behavioral change.`
**Verification:** Helpers present (incl. `.tap`); served chunk carries `.tap`; `npm run build` passes.

### U2. Homepage — hide desktop-only decoratives on mobile

**Goal:** Remove every viewport-level desktop decorative that overlaps content on phones.
**Requirements:** R2 (advances R3).
**Dependencies:** none.
**Files:**
- `web/scripts/extract-immersive.mjs` — extend the existing `@media(max-width:760px){.lrail{display:none;}.dots{display:none;}}` patch to also hide `.strip` (hero marquee) — **already staged this session** — and any other confirmed-overlapping viewport decorative (audit `.tele` corners at 360px; hide only if they overlap hero/event text).
- `web/app/_immersive/content.ts` — regenerated via `node scripts/extract-immersive.mjs`.
**Approach:** Mirror the dots/lrail treatment. `.strip` is `position:absolute;top:23px` and lands on `.eyebrow`; `.dots` (done) was `position:fixed`. Audit `.tele tl/tr/bl/br` (absolute, `backdrop-filter:blur`) — keep if contained, hide if it lands on text. All targets are `aria-hidden` decoration, so hiding loses no function.
**Patterns to follow:** the `cssOut.replace()` mobile-hide block already in `extract-immersive.mjs` (dots fix from 001 + staged marquee edit).
**Test scenarios:**
- Covers R2. On `/` at 360/390px: `.strip`, `.dots`, `.lrail` compute `display:none`; no `.strip`/`.dots`/`.tele` rect intersects `.eyebrow`/`.hline`/`.ev-poster`/`.ev-prog-bar`.
- Covers R1. At 1280px: `.strip` and `.dots` compute `display !== none` (decoratives intact on desktop).
- Served `/` HTML contains `.strip{display:none}` inside the `max-width:760px` block.
- Zero console errors, mobile + desktop.
**Verification:** No decorative overlaps any hero/event content on phones; desktop decoratives unchanged; served HTML carries the rules; build passes.

### U3. Homepage — per-section mobile layout, spacing & type

**Goal:** Make each homepage section read with mobile-native rhythm and type scale at 360–430px and landscape (the phone range that's currently barely tuned).
**Requirements:** R3 (advances R1).
**Dependencies:** U2 (clutter gone first so spacing is judged on real content).
**Files:**
- `web/scripts/extract-immersive.mjs` (`cssOut` patches adding/extending `@media(max-width:520px)` and `@media(max-width:760px)` rules) and/or the v3 source media blocks → regenerates `content.ts`.
**Approach:** Per section (`#intro`, `#hero`, `#event`, `#stats`, `#join`, `#foot`): reduce desktop vertical padding to mobile rhythm; scale headlines/eyebrows/body via `clamp()` or mobile overrides so nothing is oversized or clipped; ensure single-column stacking and no horizontal overflow; apply `100svh`/`100dvh` to the full-screen `.intro`/hero so the iOS toolbar doesn't clip. Conservative — adjust values, don't restructure. The existing `≤520px` block (currently only `.ev-past` + `.ev-cta`) is the anchor to extend.
**Patterns to follow:** the existing immersive `@media` cascade and `clamp()` sizing already in the v3 CSS; the lone `@media(max-width:520px)` block as the extension point.
**Test scenarios:**
- At 360×780 and 390×844: every section stacks single-column; headline, eyebrow, body, and media are fully visible, none clipped; no horizontal overflow on `document.documentElement`.
- Landscape (740×360): `.intro`/hero fit the viewport height via `svh`; no toolbar clipping.
- Covers R1. 1280px baseline markers unchanged vs pre-change.
- `Test expectation: visual/responsive — Playwright viewport screenshots + overflow/visibility assertions.`
**Verification:** Clean, well-spaced render across `#intro→#foot` at 360/390 + landscape; desktop baseline identical; build passes.

### U4. Homepage — mobile CTAs & tap targets

**Goal:** Make the homepage's primary actions thumb-native: full-width, ≥44px, reachable.
**Requirements:** R4 (advances R3).
**Dependencies:** U2.
**Files:**
- `web/scripts/extract-immersive.mjs` (`cssOut` patches for `.btn`/`.ev-cta`/hero CTA at mobile widths) → regenerates `content.ts`.
**Approach:** Hero CTAs (`VEZI EVENIMENTUL` / `VEZI ARHIVA`) and the event `Cumpără bilet · 45 RON` go full-width (or comfortably wide) and ≥44px on phones, with adequate spacing between stacked buttons. Confirm anchor CTAs (the extractor rewires `<button>`→`<a href>`) keep ≥44px hit area. No desktop button change.
**Patterns to follow:** the existing `≤520px` `.ev-cta .btn{flex:1 1 100%}` rule (already full-width for event CTAs) — extend the same treatment to hero CTAs.
**Test scenarios:**
- Covers R4. At 360/390px: hero CTAs and the event buy CTA have height ≥44px and span (near) full content width; stacked buttons have ≥8px gap; tappable.
- Covers R1. At 1280px: CTA widths/heights unchanged.
- No horizontal overflow introduced by full-width CTAs.
**Verification:** Primary CTAs are full-width ≥44px on phones, unchanged on desktop; build passes.

### U5. Buyer flow — mobile-native polish

**Goal:** Make the purchase path feel native on phones.
**Requirements:** R4, R5, R6.
**Dependencies:** U1.
**Files:**
- `web/app/[slug]/page.tsx`, `web/app/[slug]/BuyCta.tsx` — sticky buy CTA full-width, ≥44px, `safe-pb`; poster/section spacing.
- `web/app/[slug]/checkout/CheckoutClient.tsx` — inputs ≥16px, sticky pay bar above safe-area, full-width submit, comfortable field spacing, keyboard-open layout.
- `web/app/succes/page.tsx`, `web/app/bilet/[token]/page.tsx` — centered on `100dvh`; QR on its white plate at scannable size (≥~180px on 360px).
- consume `.tap`/`.safe-pb` from U1.
**Approach:** Already mobile-first; this is native-feel polish. Apply U1 helpers to sticky/fixed bars; full-width primary buttons; ≥44px controls; verify QR plate size; ensure no sub-16px inputs.
**Patterns to follow:** existing `.btn`/`.input`/`pressable` classes; the QR white-plate pattern in `bilet/[token]/page.tsx`; 002's safe-area usage.
**Test scenarios:**
- `/[slug]`: sticky CTA full-width, ≥44px, bottom edge clears `env(safe-area-inset-bottom)`.
- `/[slug]/checkout`: every input ≥16px; full-width submit; pay bar not under the home indicator; no overflow with a simulated keyboard.
- `/bilet/[token]`: QR plate ≥~180px wide on a 360px screen.
- `/succes`: card centers in the `100dvh` visible area; no overflow.
- All buyer routes: no horizontal overflow at 360/390/414.
**Verification:** Native-feel buyer flow — full-width CTAs, 16px inputs, safe-area bars, scannable QR — at mobile widths; build passes.

### U6. Account + membership — mobile-native polish

**Goal:** Comfortable, thumb-native account and application screens.
**Requirements:** R4, R5.
**Dependencies:** U1.
**Files:**
- `web/app/conta/page.tsx`, `web/app/conta/ProfileCard.tsx`, `web/app/conta/login/page.tsx` — boarding-pass ticket cards, stat boxes, form inputs ≥16px, ≥44px controls, full-width submit, card spacing at small widths.
- `web/app/devino-membru/page.tsx`, `web/app/devino-membru/MembershipForm.tsx` — step/timeline list stacks; form inputs ≥16px; full-width submit; success state fully visible.
**Approach:** Polish only. Apply U1 helpers; full-width primary actions; ≥44px; ≥16px inputs; tighten card/form spacing for phones.
**Patterns to follow:** existing `.btn`/`.input` classes; the boarding-pass `TicketCard` pattern; 002's account work.
**Test scenarios:**
- `/conta` + `/conta/login`: inputs ≥16px; submit full-width ≥44px; cards no overflow at 360/390.
- `/devino-membru`: step list stacks; form submits; `anim-pop` success state fully visible; inputs ≥16px.
- No horizontal overflow on any of these routes at 360/390/414.
**Verification:** Account/membership screens read natively and submit cleanly on phones; build passes.

### U7. Staff + scanner — mobile-native polish

**Goal:** Make staff tooling and the scanner genuinely usable one-handed on a phone.
**Requirements:** R4, R7, R6.
**Dependencies:** U1.
**Files:**
- `web/app/(staff)/admin/AdminClient.tsx`, `web/app/(staff)/statistici/page.tsx`, `web/app/(staff)/admin/team/TeamClient.tsx`, `web/app/(staff)/admin/aplicatii/page.tsx` — confirm `.table-scroll` wrappers; header/nav wraps; status/edit controls ≥44px.
- `web/app/(staff)/admin/events/EventEditor.tsx` — confirm `.ee-prog-row` stacking; sticky save bar honors `safe-pb`; controls ≥44px.
- `web/app/(staff)/scanner/ScannerClient.tsx` — camera preview fills a usable portrait area; verdict block legible at a glance; manual-code input ≥16px; start/manual controls in thumb reach; full-height via `dvh` minus safe-area.
**Approach:** Tables already scroll and the editor grid already stacks (002) — this is tap-target sizing, header wrapping, save-bar safe-area, and making the scanner a calm, legible door tool (no added glow). Authenticated; needs a staff session to verify (see Risks).
**Patterns to follow:** `.table-scroll`/`.ee-prog-row` (002); scanner verdict choreography + dark instrument styling already in `ScannerClient.tsx`.
**Test scenarios:**
- Authenticated staff at 390px on `/statistici`, `/admin`, `/admin/team`, `/admin/aplicatii`: document has no horizontal overflow (tables scroll internally); table controls ≥44px; header wraps not overflows.
- `/admin/events/[id]`: editor rows stack; save bar clears safe-area; controls ≥44px.
- `/scanner`: camera region ≥~40% viewport height; verdict states (ok/already-in/error) legible and on-screen; manual input ≥16px; bottom controls clear safe-area.
- `Covers R7.` A simulated manual code drives the verdict UI to the valid state.
**Verification:** Staff routes operable one-handed with no page overflow; scanner legible and thumb-reachable; build passes. (Requires staff login — see Risks.)

### U8. Cross-device verification + redeploy

**Goal:** Prove the whole app on representative phones + landscape + authenticated staff, assert desktop unchanged, and ship to production.
**Requirements:** R8, R1.
**Dependencies:** U1–U7.
**Files:**
- `web/scripts/verify-mobile.mjs` (new) — Playwright iterating routes × {360, 390, 414, landscape}: no horizontal overflow; decoratives (`.strip/.dots/.lrail`) absent; no positioned-overlay rect over text; tap-target geometry; input ≥16px; zero console errors; logs in for staff routes; plus a **1280px desktop baseline** assertion (R1). (Closes the long-open 002 U7.)
- (deploy) Vercel CLI prod deploy of `web/` (link at `web/.vercel/project.json`), token kept available this round for fast iteration.
**Approach:** Codify the per-unit checks into one script so regressions are catchable; include the desktop-unchanged assertion so the mobile work provably didn't alter PC. Drive Lenis via `window.__lenis.scrollTo` / incremental `mouse.wheel`. Then redeploy and confirm production serves the homepage rules.
**Patterns to follow:** the Playwright + served-HTML + Vercel CLI sequence used in 001; mobile context (`isMobile:true,hasTouch:true`).
**Test scenarios:**
- Every public route at 360/390/414/landscape: no overflow, no console errors, decoratives absent, tap targets/inputs sized.
- Staff routes (authenticated): no document overflow; tables scroll; scanner operable.
- 1280px desktop: layout markers identical to the pre-change baseline (R1).
- After redeploy: production `sava-pass.vercel.app` HTML carries the homepage mobile rules.
**Verification:** Script passes for all route×viewport combos; desktop baseline unchanged; build passes; production serves the fix; real-device spot check (iOS Safari + Android Chrome) done.

---

## Risks & Dependencies

- **"Keep PC intact" depends on discipline (KTD1).** Any edit to a non-media-query selector risks desktop. Mitigation: every change is mobile-scoped, and U8 asserts a 1280px baseline. Treat a desktop-baseline diff as a failure.
- **Homepage edits must flow through the extractor (KTD3).** Hand-editing `content.ts`/`engine.js` is lost on the next extract. All homepage changes are `extract-immersive.mjs` patches (or v3 source) + regenerate.
- **Stale Turbopack `.next` cache** has bitten CSS edits repeatedly — verify served chunk/HTML carries new rules (or `rm -rf web/.next` + rebuild) before concluding.
- **Staff verification needs an authenticated session** (U7/U8) and the scanner needs camera permission. Prerequisite: a staff test account (Supabase is logged in, but a staff *user* credential is separate); stub the camera in Playwright where possible.
- **Live vs local + redeploy needs the token.** Fix is invisible on `sava-pass.vercel.app` until U8's redeploy; hard-refresh on device. The Vercel CLI path uploads local files (the MCP would deploy stale git). Token kept available this round per user request.
- **Conservative may not feel "native enough."** If, after U8, it still feels desktop-y, the opinionated-native upgrades (sticky bottom buy bar, restructured stacking) are the deferred next step — a new decision, not silent scope creep.

---

## System-Wide Impact

- **Affected users:** phone visitors (homepage + buyer flow) and door staff (scanner on a phone) — the majority of real usage.
- **Desktop unchanged:** every change is a mobile-scoped override; U8 asserts the desktop baseline.
- **Shared surfaces:** `web/app/globals.css` (helpers) and `web/app/layout.tsx` (viewport) are app-wide — U1 lands first so U5–U7 build on it; homepage is isolated in its in-page `<style>` so U2–U4 don't affect app pages.
- **Build/tooling:** no new dependencies; verification adds one Playwright script under `web/scripts/`.

---

## Open Questions (deferred to implementation)

- Exact mobile padding/type values per section (U3) — tuned by eye on a real viewport, not assumed now.
- Whether any `.tele` corner actually overlaps on mobile or is already contained (U2) — decided by looking.
- Final breakpoint per surface: `≤760px` vs `≤520px` for specific tweaks (KTD5) — by inspection.
- Staff test-account availability for U7/U8 verification (prerequisite to confirm).
- Whether conservative is sufficient or the deferred opinionated-native pass is wanted (answered after U8).

---

## Sources & Research

- Device screenshots from `sava-pass.vercel.app` (Android, ~360px): dots fixed (001), hero marquee overlapping the eyebrow, OS edge-panel pill (not ours).
- `web/app/_immersive/content.ts`: sections `#intro/#hero/#event(.sec)/#stats/#join(.sec join)/#foot`; the `@media(max-width:520px)` block currently overrides only `.ev-past` + `.ev-cta` (phone range under-tuned); `.strip{position:absolute;top:23px}`, `.dots`/`.lrail` mobile-hides; immersive breakpoints 520/560/760/820/900/920px.
- Positioned-element inventory: only `.strip/.dots/.lrail/.tele` are viewport/hero-top level; the rest (`.engine-*`, phone, `.bokeh/.eq`, `.route/.pin`, `.gen-*`) are section-scoped and contained.
- Prior mobile + foundations work: [web/docs/plans/2026-06-23-002-feat-mobile-experience-pass-plan.md](docs/plans/2026-06-23-002-feat-mobile-experience-pass-plan.md) (foundations, tables, scanner scoped; U7 verification never landed), [web/docs/plans/2026-06-24-001-fix-mobile-dots-overlap-plan.md](docs/plans/2026-06-24-001-fix-mobile-dots-overlap-plan.md) (dots hide, shipped).
- `projects/sava-pass/CLAUDE.md` lessons: extractor-as-source-of-truth, inline-`<style>` served-HTML verification, four fixed-overlay audit rule, stale-`.next`-cache, Vercel CLI deploy needs token / MCP deploys stale git, mobile foundations (`viewport`/safe-area/`dvh`/16px), `.table-scroll`/`.ee-prog-row`.
