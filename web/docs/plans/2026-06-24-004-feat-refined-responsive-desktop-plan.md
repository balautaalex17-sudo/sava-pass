---
title: "feat: Refined responsive desktop homepage (unify on the component build, retire immersive)"
status: active
date: 2026-06-24
type: feat
origin: none (solo ce-plan invocation; continues 2026-06-24-003 — extends the mobile component homepage to a refined desktop)
depth: deep
---

# feat: Refined responsive desktop homepage

## Summary

Make the new component-based homepage (`web/app/_mobile/`, currently shown only on phones via the device split) into **one fully responsive homepage that serves a refined desktop version too**, and **retire the immersive GSAP/Lenis port** that currently owns desktop. The mobile build the user just approved becomes the homepage at every width: the same six beats (door / ticket / ribbon / thread / invitation / footer), the same ink-and-cyan identity, the same live data and CSS+IO motion — re-laid-out for wide screens with multi-column composition, a constrained max-width container, a larger type scale, a sticky desktop header, and hover affordances. The device split, the `.home-desktop`/`.home-mobile` toggle, the engine-gating, and the immersive `<style>`/markup/engine all come out; `web/app/page.tsx` renders one responsive `<Home>` at all widths. The immersive is archived (recoverable), not deleted.

"Refined" is the operative word: desktop should read as clean, composed, and premium — not the heavy cinematic scroll the immersive was. The design bar is the same Design Direction distilled into 2026-06-24-003 (impeccable / emil-design-eng / design-taste-frontend), now applied at desktop widths (anti-center composition, ≥4 distinct layout families, hover physics gated to `hover:hover`, max-width discipline).

---

## Problem Frame

After 2026-06-24-003, `web/app/page.tsx` co-renders **two** homepages in one ISR document: `.home-desktop` (the verbatim immersive v3 port + its GSAP/Lenis engine, shown >900px) and `.home-mobile` (the new `<MobileHome>` `.mh` component build, shown ≤900px). The user wants the second one to *be* the desktop too — a refined desktop version — which makes the immersive port redundant.

Current state of the component homepage (built in 003, all under `web/app/_mobile/`):
- `MobileHome.tsx` (server, data composition) → `MhHero`, `MhEventCard`, `MhStats`, `MhThread`, `MhMembership`, `MhFooter`, `MhStickyBuy`, plus `MhReveal` (IO reveal), `MhGear`, `mobile-home.css` (the `.mh` design system).
- Mobile-first: single-column, full-bleed hero/membership, vertical boarding-pass ticket, vertical thread, a sticky bottom buy dock. No top nav, no max-width container, no desktop type scale, no hover states.
- Animations are CSS + IntersectionObserver only (no framer-motion); the immersive engine is gated **off** ≤900px.

The immersive infrastructure to retire: `web/app/_immersive/content.ts`, `web/app/_immersive/ImmersiveEngine.tsx`, the `<style>`+markup render and engine preloads in `page.tsx`, `web/scripts/extract-immersive.mjs`, and the `web/public/imersiv/` assets + vendor libs. The base shell (`web/app/layout.tsx` viewport, the pre-paint `SCROLL_REVEAL_BOOT`, the `.theme-immersive` token layer) stays — it serves the whole app, not just the homepage.

So the gap is: (1) give every `.mh` section a desktop layout; (2) add the desktop-only chrome (sticky header, hover, container); (3) flip `page.tsx` to one responsive render and remove the split; (4) archive the immersive cleanly with nothing left referencing it.

---

## Requirements

- **R1** — The homepage renders **one responsive component build at every width**; the device split, `.home-desktop`/`.home-mobile` toggle, body reset, and engine-gating are gone.
- **R2** — Desktop (≥1024px, and the 901–1023px tablet band) shows a **refined** homepage: constrained max-width container, multi-column/composed section layouts, larger type scale, generous desktop rhythm — not a stretched phone layout and not the immersive scroll.
- **R3** — Mobile (≤900px) is **visually unchanged** from the 003 build (same six beats, same motion) — the desktop work is additive at desktop breakpoints.
- **R4** — Same identity and content at all widths: ink + single cyan accent, gear motif, live next-event data, the six beats; the Design Direction guardrails hold on desktop (≤1 eyebrow, ≥4 layout families, no banned patterns, real photos, locked radius/accent).
- **R5** — Desktop-native affordances: a sticky top header (logo + primary CTA), hover states on interactive elements gated behind `@media (hover: hover)`, and the mobile sticky buy dock resolved for desktop (hidden in favor of the header CTA, or kept — decided in U6).
- **R6** — The immersive port is **fully retired and archived**: nothing in the live app imports or references `_immersive/`, the engine, the extractor output, or `public/imersiv/`; the immersive is preserved under `web/app/_archive/` (and git history) for recovery.
- **R7** — Motion stays CSS+IO (no framer-motion); reveals/seats-fill/thread-draw/count-up work at all widths; nothing janks on desktop; desktop has no GSAP/Lenis network requests.
- **R8** — Verified at 1280/1440 desktop + 1024 + the 901–1023 band + mobile parity (360/390/414), build passes, and live on `sava-pass.vercel.app`.

---

## Key Technical Decisions

- **KTD1 — One responsive build, not a second desktop component set.** Add desktop layouts to the existing `.mh` sections via breakpoints (the chosen "unified responsive" approach), rather than authoring parallel desktop components. Less code, one source of truth, guaranteed content parity. The trade-off (one component must hold both layouts) is manageable because the sections are simple and CSS carries most of the layout.
- **KTD2 — Desktop layout lives in `mobile-home.css` under `@media (min-width: 1024px)` (+ a tablet `min-width: 901px` touch-up), mobile rules untouched.** Mobile-first is preserved; desktop is additive, so R3 (mobile unchanged) holds by construction. A `.mh-container { max-width: ~1200px; margin-inline: auto }` wrapper constrains content at desktop while full-bleed media (hero/membership photos) still bleed edge-to-edge.
- **KTD3 — Retire the immersive by archiving, not deleting.** Move `_immersive/ImmersiveEngine.tsx` + `content.ts` to `web/app/_archive/` (mirrors how `landing-v2.tsx` was archived), delete the immersive render + preloads from `page.tsx`, and remove `public/imersiv/` + `scripts/extract-immersive.mjs` (recoverable from git). Verify zero live references before removing. The base shell (`layout.tsx`, `SCROLL_REVEAL_BOOT`, `.theme-immersive`) is app-wide and stays.
- **KTD4 — Naming: keep `_mobile/` + `.mh` for now; rename is deferred.** The folder/prefix now means "the homepage," not "mobile," which is mildly misleading — but renaming every file + selector is churn with no behavior change. Defer the rename to a follow-up (a pure mechanical `_mobile/`→`_home/`, `.mh`→`.h`) so this plan stays focused on layout + retirement.
- **KTD5 — Desktop composition follows anti-center / layout-family diversity (design-taste).** Desktop hero = full-bleed photo with content constrained to a left/lower column (not centered); ticket = **horizontal** boarding-pass (poster beside the stub, vertical perforation); thread = **horizontal** 3-beat with a left-to-right drawing connector; membership = full-bleed with constrained content; footer = multi-column. Each section a distinct family — no repeated pattern, no centered stack.
- **KTD6 — Motion unchanged in mechanism (KTD from 003 holds): CSS + `MhReveal` IO.** Desktop reuses the same reveal/seats/thread/count-up; only the transformed end-states differ per layout (e.g., the thread line draws horizontally on desktop via `scaleX` instead of `scaleY`). Hover effects are new and gated behind `@media (hover: hover) and (pointer: fine)` so touch is unaffected.
- **KTD7 — Verify mobile parity + ship via CLI.** Desktop screenshots at 1280/1440 + 1024 + the 901–1023 band for the refined look; mobile screenshots at 360/390 to prove R3 (unchanged); assert no `_immersive`/`imersiv`/gsap references served. Redeploy via the Vercel CLI (token at `active/.vercel-token`). Drive screenshots via system Edge + `playwright-core` (per 003).

---

## High-Level Technical Design — section × width

| Section | Mobile (≤900px, unchanged) | Desktop (≥1024px, refined) |
|---|---|---|
| Header | none (page scrolls) | sticky top bar: gear+SavaPass left, "Cumpără bilet" CTA right (U2) |
| Hero | full-bleed photo, bottom-stacked content, full-width CTAs | full-bleed photo, content in a constrained left column, inline CTAs, larger type (U3) |
| Ticket | vertical boarding-pass, full-width | horizontal boarding-pass (poster ∥ stub, vertical perforation), centered max-width (U4) |
| Ribbon | 3-col count-up, hairline | wider 3-col, larger numerals, more rhythm (U5) |
| Thread | vertical line + 3 stacked beats | horizontal connector + 3 beats in a row (U5) |
| Invitation | full-bleed photo, stacked | full-bleed photo, constrained content column (U6) |
| Footer | 2-col links | multi-column brand + link columns + legal row (U6) |
| Sticky dock | fixed bottom buy bar | hidden on desktop (header CTA replaces it) (U6) |
| Container | edge-to-edge | `.mh-container` max-width ~1200px; media still full-bleed (U2) |

(Authoritative detail is the per-unit sections; this is the orientation map.)

---

## Scope Boundaries

**In scope:** Making the existing `.mh` homepage fully responsive with a refined desktop layout for every section; desktop chrome (sticky header, hover, max-width container); flipping `page.tsx` to one responsive render and removing the device split; archiving + fully de-referencing the immersive port; verification + redeploy.

**Out of scope (non-goals):**
- Any change to the mobile (≤900px) appearance or motion — it stays as shipped in 003 (R3).
- Buyer / account / staff pages (already native; untouched here).
- New content, copy, features, or data changes.
- Re-introducing GSAP/Lenis or any immersive-style scroll choreography on desktop ("refined", not cinematic).
- Adding framer-motion.

### Deferred to Follow-Up Work
- **Rename `_mobile/`→`_home/` and `.mh`→`.h`** (mechanical, no behavior change) — deferred to keep this plan focused (KTD4).
- **Deleting the archived immersive + `public/imersiv/` assets permanently** — kept archived this round; a later cleanup can remove them once the refined desktop is settled.
- **Desktop-specific photography** — reuse the existing `hero.jpg`/`about.jpg`; sourcing higher-res desktop art is a separate effort if they look soft at 1440px.

---

## Implementation Units

> Desktop layouts realize the same six beats at the Design Direction craft bar (2026-06-24-003), now at desktop widths: anti-center composition, ≥4 distinct layout families, hover gated to `hover:hover`, one accent, one radius, real photos.

### U1. Unify the render + archive the immersive

**Goal:** Make `page.tsx` render one responsive homepage at all widths and fully retire the immersive port.
**Requirements:** R1, R6, R7.
**Dependencies:** none (first — but desktop sections (U2–U6) can be built before flipping the switch; this unit is the switch + cleanup).
**Files:**
- `web/app/page.tsx` — remove the `.home-desktop` immersive block (`<style>`+markup+`ImmersiveEngine`+preloads), the device-split `<style>` (toggle + body reset), and the `.home-mobile` wrapper; render `<Home active stats past />` directly (keep the ISR `revalidate`, `homeData()` race-guarded fetch, metadata).
- `web/app/_immersive/ImmersiveEngine.tsx`, `web/app/_immersive/content.ts` → move to `web/app/_archive/`.
- `web/scripts/extract-immersive.mjs`, `web/public/imersiv/` → remove (recoverable from git).
- (rename within `_mobile/`) `MobileHome.tsx` export can stay named `MobileHome` or alias to `Home`; keep the folder per KTD4.
**Approach:** Flip last (after U2–U6 land the desktop layouts) so the homepage is never broken mid-flight. Grep the repo for `_immersive`, `imersiv`, `ImmersiveEngine`, `IMMERSIVE_`, `extract-immersive`, `gsap`, `lenis` and confirm only archived/removed references remain. The `keep-warm` cron + route stay (DB warmth is still wanted). Confirm `layout.tsx` (viewport, `SCROLL_REVEAL_BOOT`, `.theme-immersive`) is untouched.
**Patterns to follow:** the existing `_archive/landing-v2.tsx` archival; the existing `homeData()` race-guard in `page.tsx`.
**Test scenarios:**
- `/` at 1280px serves the component homepage (`.mh` content), NOT `.sp-immersive-root`; no `gsap`/`lenis`/`engine.js` network request at any width.
- Served HTML/JS contains no reference to `_immersive`, `imersiv`, or `IMMERSIVE_`.
- ISR still active (`revalidate` unchanged); homepage renders fast with Supabase reachable AND when the 2s `homeData` timeout fires (graceful empty state).
- Build passes with no dangling import to the moved/removed files.
**Verification:** One responsive homepage at all widths, no immersive references or engine requests, build green; `layout.tsx` base shell unchanged.

### U2. Responsive shell — container, desktop type scale, sticky header

**Goal:** Establish the desktop foundation every section sits in: a max-width container, a desktop type scale, and a sticky top header.
**Requirements:** R2, R5, R4.
**Dependencies:** none (CSS/markup foundation; can precede U1).
**Files:**
- `web/app/_mobile/mobile-home.css` — add a `@media (min-width: 1024px)` layer: `.mh-container { max-width: ~1200px; margin-inline: auto; padding-inline: clamp(32px, 5vw, 64px) }`, larger `.mh-sec` vertical rhythm, a bumped type scale for headings/body, and the header styles.
- `web/app/_mobile/MhHeader.tsx` (new) — sticky top header (gear+SavaPass wordmark left, "Cumpără bilet · N RON" / "Vezi evenimentul" CTA right), desktop-only (`display:none` ≤900px). Reuse `MhGear`.
- `web/app/_mobile/MobileHome.tsx` — render `<MhHeader>` (it self-hides on mobile) and wrap constrained sections in `.mh-container`.
**Approach:** Full-bleed sections (hero/membership) keep their edge-to-edge media but constrain their inner content with `.mh-container`. The header is desktop-only chrome (mobile keeps its scroll + sticky dock). Header gets a subtle scrolled-state shadow via CSS (`@supports (animation-timeline: scroll())` or a tiny IO), optional.
**Patterns to follow:** the immersive `.chrome` nav as a reference for header content (logo + CTA); the app's `.theme-immersive` tokens; `MhGear`/`MhStickyBuy` for the CTA wiring.
**Test scenarios:**
- At 1280/1440px: content is constrained to the container max-width and centered; full-bleed photos still reach both edges; section vertical rhythm is larger than mobile.
- Sticky header visible ≥901px (logo + CTA), `display:none` ≤900px; CTA points at the live event (or `#mh-arhiva` fallback); ≥44px hit area.
- Body/heading type scale is larger on desktop; no text overflow at 1024/1280/1440.
- Mobile (≤900px): header absent, container has no effect (full-width as before) — R3.
**Verification:** Desktop content sits in a refined container with a sticky header and desktop type scale; mobile unchanged; build passes.

### U3. Hero — refined desktop layout

**Goal:** A composed, anti-centered desktop hero (not a stretched phone hero).
**Requirements:** R2, R4.
**Dependencies:** U2.
**Files:** `web/app/_mobile/MhHero.tsx` (minor markup hooks if needed), `web/app/_mobile/mobile-home.css` (desktop `@media` rules for `.mh-hero`).
**Approach:** Desktop: full-bleed `hero.jpg` with content constrained to a left/lower column inside `.mh-container` (anti-center per design-taste), vertically centered rather than bottom-pinned, headline clamp up to ~76–84px, CTAs inline (auto width, side by side) instead of full-width stacked, the gear larger/positioned as a quiet accent. Keep the clip/mask headline reveal (it scales). Scrim tuned so the headline keeps ≥4.5:1 contrast over the photo on a wide crop.
**Patterns to follow:** `MhHero`'s existing clip-mask reveal + `.mh-up` stagger; design-taste hero discipline (≤2 lines, ≤4 elements, fits one screen, top padding cap).
**Test scenarios:**
- 1280/1440px: hero fills ~one viewport; content left/lower-aligned in the container (not centered); headline ≤2 lines, no overflow; CTAs inline and visible without scroll; contrast holds over the photo.
- Headline clip reveal + stagger fire on load at desktop.
- Mobile hero unchanged (R3).
**Verification:** A refined, composed desktop hero; mobile hero identical; build passes.

### U4. Ticket — horizontal boarding-pass on desktop

**Goal:** The live next event as a refined horizontal boarding-pass on wide screens.
**Requirements:** R2, R4, R7.
**Dependencies:** U2.
**Files:** `web/app/_mobile/MhEventCard.tsx` (markup hooks for the horizontal split), `web/app/_mobile/mobile-home.css` (desktop `@media` for `.mh-ticket`, `.mh-perf`, `.mh-seats`).
**Approach:** Desktop: a centered, max-width (~860px) card laid out **horizontally** — poster on the left (~46%), stub on the right (title, meta, seats meter, buy) — with the perforation as a **vertical** dashed line + notch circles top/bottom of the seam (mobile keeps the horizontal tear). Seats meter still fills on reveal (`scaleX`). Larger title/price. Hover lift on the card (`hover:hover`).
**Patterns to follow:** the existing `.mh-ticket`/`.mh-perf`/`.mh-seats` mobile rules (override at desktop); `MhReveal` data-in seats fill.
**Test scenarios:**
- 1280px: ticket is horizontal (poster ∥ stub), centered, max-width; vertical perforation with notches; seats meter fills on scroll-in; price mono; hover lifts the card.
- No active event: the empty state renders centered/constrained, no crash.
- Mobile ticket vertical and unchanged (R3); no overflow at 1024.
**Verification:** A refined horizontal ticket on desktop; mobile vertical pass unchanged; build passes.

### U5. Ribbon + thread — desktop layouts

**Goal:** Stats and how-it-works composed for wide screens (the thread goes horizontal).
**Requirements:** R2, R4, R7.
**Dependencies:** U2.
**Files:** `web/app/_mobile/MhStats.tsx`, `web/app/_mobile/MhThread.tsx` (markup hooks), `web/app/_mobile/mobile-home.css` (desktop `@media`).
**Approach:** Ribbon: keep the 3-up count-up but widen, enlarge numerals, add desktop rhythm on the cyan hairline. Thread: switch from a vertical drawn line to a **horizontal** 3-beat row joined by a left-to-right drawing connector (`scaleX` on reveal, `transform-origin:left`), beats evenly spaced; the `01/02/03` numbering stays (earned sequence). Both reveal once via `MhReveal`.
**Patterns to follow:** `CountUp`; the existing `.mh-thread__line` `scaleY` reveal (mirror to `scaleX` at desktop); `MhReveal`.
**Test scenarios:**
- 1280px: ribbon figures larger and spaced; count-up fires once on scroll-in; thread is a horizontal row with the connector drawing left→right and beats revealing in sequence.
- No horizontal overflow at 1024/1280/1440.
- Mobile ribbon/thread vertical and unchanged (R3).
**Verification:** Refined desktop ribbon + horizontal thread; mobile unchanged; build passes.

### U6. Membership + footer + dock — desktop layouts

**Goal:** Close the desktop page: composed membership, multi-column footer, and the sticky dock resolved for desktop.
**Requirements:** R2, R4, R5.
**Dependencies:** U2.
**Files:** `web/app/_mobile/MhMembership.tsx`, `web/app/_mobile/MhFooter.tsx`, `web/app/_mobile/MhStickyBuy.tsx` (desktop-hide), `web/app/_mobile/mobile-home.css` (desktop `@media`).
**Approach:** Membership: full-bleed `about.jpg` with content constrained to a column in `.mh-container` (a different family from the hero's column side, e.g. lower-left vs hero's mid-left), larger heading, inline CTA. Footer: multi-column on desktop — brand+tagline block beside link columns, legal row across the bottom, hairline dividers (not cards). Sticky dock: `display:none` ≥901px (the U2 header CTA replaces it on desktop); mobile keeps the dock.
**Patterns to follow:** `MhMembership`/`MhFooter` mobile rules (override at desktop); `BuyCta`-style desktop-hide media query; `MhStickyBuy`'s existing IO behavior (mobile only now).
**Test scenarios:**
- 1280px: membership content constrained + composed (not centered-stacked); footer multi-column with hairline dividers; sticky dock hidden (header CTA present instead).
- Mobile: membership stacked, footer 2-col, sticky dock present and yielding — unchanged (R3).
- No overflow; footer bottom clears nothing it shouldn't (no dock on desktop).
**Verification:** Desktop page closes refined; mobile closing unchanged; build passes.

### U7. Verify (desktop refined + mobile parity) + redeploy

**Goal:** Prove the refined desktop, mobile parity, and full immersive retirement, then ship.
**Requirements:** R8, R3, R6.
**Dependencies:** U1–U6.
**Files:** `web/scripts/verify-home.mjs` (new or evolve `active/shot.mjs`) — `playwright-core` + system Edge: screenshot `/` at 1440/1280/1024 + the 901–1023 band + 390/360; assert no horizontal overflow at any width, no `gsap`/`lenis`/`engine` requests, no `_immersive`/`imersiv` in served output, reveals/seats/thread/count-up fire, header present ≥901 / absent ≤900, sticky dock absent ≥901 / present ≤900.
**Approach:** Run a **design self-review** of the desktop against the Design Direction guardrails (one accent, ≤1 eyebrow, ≥4 layout families, anti-center hero, no banned patterns, real photos, hover gated). Spot-check mobile screenshots match the 003 build (parity). Then redeploy and confirm production serves the refined homepage at desktop and the unchanged build at mobile.
**Patterns to follow:** `active/shot.mjs` / `active/shot-desktop.mjs` from 003; the served-HTML + Vercel CLI deploy sequence.
**Test scenarios:**
- 1440/1280/1024 + 901–1023: refined composed layout, no overflow, no engine requests, no immersive refs; header + container + hover present.
- 390/360: byte-for-byte the 003 mobile build (parity), dock present.
- After deploy: production serves the component homepage at all widths; no immersive served.
**Verification:** Desktop reads refined + on-brand, mobile unchanged, immersive fully gone, build green, live on `sava-pass.vercel.app`.

---

## Risks & Dependencies

- **Mobile regression (R3) is the top risk.** Desktop rules live in `min-width` media queries only; never edit a mobile rule. U7 asserts mobile parity against the 003 screenshots — treat any mobile diff as a failure.
- **Stale dangling references after archiving the immersive (R6).** A missed import of `content.ts`/`ImmersiveEngine` breaks the build. Mitigation: grep `_immersive`/`imersiv`/`IMMERSIVE_`/`gsap`/`lenis` before and after U1; the build catches dangling imports.
- **Photo resolution at 1440px.** `hero.jpg`/`about.jpg` were sized/encoded for mobile-hero use (perf pass); full-bleed at 1440 may look soft. Acceptable for now (deferred: desktop art); verify in U3/U6 and note if a re-encode is needed.
- **One component holding two layouts (KTD1).** Markup must serve both; favor CSS-only layout switches (grid/flex direction, ordering) over branching on width in JS to avoid hydration issues. Where a layout truly needs different DOM (e.g., perforation orientation), use CSS that adapts the same nodes.
- **`.mh`/`_mobile` naming now misleading (KTD4).** Deferred rename; leave a comment in `mobile-home.css`/`MobileHome.tsx` noting `.mh` is now the homepage at all widths so future maintainers aren't confused.
- **Stale Turbopack `.next` cache** has bitten CSS edits repeatedly — verify served CSS contains the new desktop rules before concluding.
- **Redeploy needs the token** (`active/.vercel-token`); CLI uploads local files (the MCP would deploy stale git). Production has no git integration — CLI `--prod` is the only path live.

---

## System-Wide Impact

- **Affected users:** desktop visitors get a refined component homepage instead of the immersive scroll; mobile visitors are unaffected (R3). Buyer/account/staff untouched.
- **Perf:** desktop drops the ~150KB GSAP/Lenis engine + the immersive CSS/markup payload entirely — a net win; LCP on desktop should improve.
- **Retired surface:** `_immersive/`, `public/imersiv/`, `scripts/extract-immersive.mjs` leave the live path (archived). The `_archive/landing-v2.tsx` precedent applies. The base shell (`layout.tsx`, motion boot, theme tokens) is app-wide and stays.
- **Maintenance:** one responsive homepage replaces two layouts + an extractor pipeline — simpler going forward.

---

## Open Questions (deferred to implementation)

- Exact desktop type scale + container max-width (~1200px) — tuned by eye in U2.
- Whether the desktop hero content sits lower-left vs mid-left, and the membership column position — composed by eye in U3/U6 to keep the layout families distinct.
- Header scrolled-state treatment (shadow/condense) — minor, decided in U2.
- Whether `hero.jpg`/`about.jpg` need a higher-res desktop re-encode — answered by the U3/U6 1440px check.
- Whether to permanently delete (vs keep archived) the immersive + `public/imersiv/` — deferred to a later cleanup.

---

## Sources & Research

- 2026-06-24-003 (the mobile component homepage — the build this extends): `web/app/_mobile/*` (`MobileHome`, `MhHero`, `MhEventCard`, `MhStats`, `MhThread`, `MhMembership`, `MhFooter`, `MhStickyBuy`, `MhReveal`, `MhGear`, `mobile-home.css`) and its Design Direction (the six beats + locked system, distilled from `impeccable`/`emil-design-eng`/`design-taste-frontend`).
- Current split + immersive to retire: `web/app/page.tsx` (co-render + toggle), `web/app/_immersive/ImmersiveEngine.tsx` + `content.ts`, `web/scripts/extract-immersive.mjs`, `web/public/imersiv/`.
- Data: `lib/events.ts` (`getActiveEvent`/`getEventStats`/`getPastEvents`/`seatsLeft`/`priceRon`), `Event`/`EventStats` types — already wired in `MobileHome`.
- Base shell that stays: `web/app/layout.tsx` (viewport, `SCROLL_REVEAL_BOOT`, `.theme-immersive`).
- `projects/sava-pass/CLAUDE.md`: immersive-isolation + retirement notes, `_archive/landing-v2.tsx` precedent, served-output verification, `playwright-core`+Edge screenshots, Vercel CLI-deploy-needs-token / no-git-integration, stale-`.next` cache.
