---
title: "feat: Dedicated mobile-native homepage (desktop immersive intact)"
status: active
date: 2026-06-24
type: feat
origin: none (solo ce-plan invocation; supersedes the conservative-polish approach in 2026-06-24-002 for the homepage)
depth: deep
---

# feat: Dedicated mobile-native homepage

## Summary

Build a **purpose-built mobile homepage** in React — same brand identity (ink/cyan, gear motif, type), same content (hero → next event → stats → how it works → membership → footer), with the app's existing animation system (CSS `anim-*` + `Reveal`/`ScrollReveal` IntersectionObserver + `CountUp`) — and show it on phones while the **desktop immersive port stays exactly as-is**. This replaces the failed "conservative subtract" approach (2026-06-24-002): hiding the desktop decoratives left each `100dvh` immersive section sparse and empty on phones, which read as "very bad." The fix is to stop bending a 1280px-authored scroll experience onto a phone and instead render a real mobile-first layout for the same content.

Two hard constraints drive the design: (1) the immersive CSS is **fully global and unscoped** (`body{display:flex;padding-left:clamp()}`, bare `.btn{min-width:210px}`, `:root{}`) and lives in a route-level `<style>`, so the mobile layout must be isolated from it; (2) the page is **ISR** (`revalidate=300`) with a keep-warm cron, so the device split cannot make the page per-request dynamic. The chosen mechanism co-renders both layouts, toggles visibility by viewport, gates the heavy GSAP/Lenis engine off mobile, and namespaces the mobile layout so the global immersive rules can't bleed into it.

Live data is wired for the next-event card (the verbatim port shows hardcoded 84/120 · 45 RON · 264 bilete). Animations use the existing system — `framer-motion` is **not** a dependency and won't be added (the whole app animates via CSS + IntersectionObserver).

---

## Design Direction (grounded in `impeccable` · `emil-design-eng` · `design-taste-frontend`)

**Design Read:** a premium event-ticketing **brand** homepage (mobile) for Gen-Z concertgoers in Bucharest — a dark, cinematic "door to the show" language: ink + a single electric-cyan accent, kinetic type, real concert photography, restrained-but-cinematic CSS motion. The page *is* the product (brand register), so design carries it, not chrome.

**Dials (design-taste-frontend):** `VARIANCE 7 · MOTION 7 · DENSITY 3` — premium-brand, airy, alive (not chaotic, not static).

**Locked system — one of each, audited before ship (no drift):**
- **Color:** ink `#070A12` background, `#00A7E8` cyan as the *only* accent (already non-AI-default — locked page-wide, no second accent in any section), paper `#F8FAFC` text, hairlines at low-alpha cyan/white. Dark theme **locked** — no section inverts (design-taste 4.11). Body/large text contrast ≥4.5/3:1 (impeccable).
- **Type:** Manrope (sans) carries everything; the existing **Instrument Serif** is kept for exactly **one** ceremonial word (*"intri"*) — an established brand element used once, never as scaffolding. JetBrains Mono for numerals (price, seats, stats). Emphasis = italic of the same family, never a random serif drop (design-taste 4.1). Headline ≤2 lines, letter-spacing ≥ -0.04em, `text-wrap: balance` (impeccable).
- **Radius:** one scale — ticket/cards 20px, buttons 14px — locked (design-taste 4.4 shape lock).
- **Motion (emil):** custom ease-out `cubic-bezier(0.23,1,0.32,1)`; entrances 500–700ms (marketing tier — reveals are allowed to be longer than UI), stagger 50–60ms; `:active{transform:scale(.97)}` on every tappable (instant feedback); never `scale(0)` (start `.95`+opacity); `clip-path: inset()` reveals for headline + poster; count-up on scroll; **all CSS + IntersectionObserver** — off the main thread, so it stays smooth under load (emil: "CSS animations beat JS under load"), which is *why* we don't add framer-motion. Force-on per the app's existing posture.

**Anti-slop guardrails (impeccable bans + design-taste pre-flight — enforced, audited before ship):**
- Hero fits one screen: ≤2 headline lines, ≤4 text elements total, CTAs visible without scroll, top padding ≤ `pt-24`.
- **≤1 eyebrow on the entire page** (hero only — or none). No eyebrow-per-section. No `01·About / 02·Process` scaffolding.
- The `01/02/03` step numbers appear in **one** place (the how-it-works thread) and only because those steps are a *real ordered sequence* — earned, not reflex.
- Banned: hero-metric template, identical card grids, glassmorphism-as-default, AI-purple/gradient glows, gradient text, side-stripe borders, div-fake screenshots, text-only hero.
- **≥4 distinct section layout families** — no two sections share a pattern (design-taste 4.7).
- Real photography only: existing `public/landing/hero.jpg`, `public/landing/about.jpg`, and the live event poster.
- CTAs: ≤3 words, one line, no duplicate intent across the page; every button passes contrast.

## Signature Moments — the "breathtaking" beats

1. **The door (hero).** Full-bleed concert photo (`hero.jpg`) under an ink scrim; the headline *"Biletul tău, digital. Scanezi, intri."* reveals line-by-line via `clip-path` mask with the cyan accent on one word and the serif *"intri"*; the Interact gear rotates slowly behind. Two full-width CTAs. One screen. It should feel like a door opening into the show.
2. **The ticket (next event).** The live next event rendered as a real **boarding-pass silhouette** — poster + perforation notch + dashed tear line + a **seats meter that fills on reveal** (clip-path/scaleX). Mono price. The whole card is the buy affordance. The product made tangible, not a generic card.
3. **The ribbon (stats).** `3 ediții · 264 bilete · ~13.500 RON pentru cultură` as an inline **count-up on a cyan hairline** — not a 3-metric card grid (banned). Numbers tick up as it scrolls in.
4. **The thread (how it works).** `Alegi → Plătești → Scanezi` joined by a **cyan line that draws** as you scroll (the desktop "thread" motif, mobile-native). The one place `01/02/03` is earned.
5. **The invitation (membership).** Full-bleed students photo (`about.jpg`), one line, one CTA → `/devino-membru`. A deliberately different layout family from everything above.
6. **The sticky door (buy bar).** An always-present `Cumpără bilet · N RON` that **yields** (fades out) when the ticket card's CTA is on screen and returns after — the door is always one thumb-tap away, with no duplicate-intent clutter.

---

## Problem Frame

The homepage `/` is the v3 immersive port (`web/app/page.tsx` renders `IMMERSIVE_CSS` + `IMMERSIVE_MARKUP` + `<ImmersiveEngine/>`, ISR `revalidate=300`). It was authored for 1280px as a full-bleed, scrubbed, section-per-screen (`100dvh`) GSAP/Lenis experience. On phones:
- Sections are `100dvh` with content centered in a sea of empty space.
- The richness came from desktop decoratives (marquee, dots, telemetry corners, side rails, parallax). 2026-06-24-002 hid those for mobile, which removed the clutter **and** the visual interest, leaving empty sections — "looks very bad."
- The GSAP/Lenis engine (scrub, snap, parallax) is desktop-scroll choreography that adds little on a touch phone but ships ~150KB JS.

The buyer/account/staff pages are real mobile-first React and already native (verified in 2026-06-24-002); this plan rechecks them on a real phone but expects little change. The work is the homepage.

**Available to build on** (no new dependencies):
- Data: `getActiveEvent()`, `getPastEvents()`, `getEventStats(id)`, `seatsLeft(event, sold)`, `priceRon(bani)` in `lib/events.ts`. `Event = Tables<"events">`, `EventStats` view row.
- Components: `Button`, `Chip`, `Eyebrow`, `GearWatermark`, `Logo`, `LiveClock`, `Reveal`, `ScrollReveal` (`components/ui/`); `CountUp`, `TiltCard` (`components/landing/`).
- Theme: `layout.tsx` puts `.theme-immersive` on `<body>`, remapping semantic tokens to the dark `--im-*` palette app-wide — so a normal app page already wears the immersive identity.
- Animation system: CSS `anim-rise/anim-rise-fast/anim-pop/anim-fade` keyframes, the global `ScrollReveal` (mounted in `layout.tsx`, reveals `.anim-rise` on scroll), `Reveal`, `CountUp`.

---

## Requirements

- **R1** — Desktop `/` is unchanged: same immersive experience, same SSR, same ISR/perf. Verified by a 1280px baseline.
- **R2** — On phones, `/` shows a dedicated mobile homepage that looks intentional and full (no empty `100dvh` voids), in the same ink/cyan/gear identity.
- **R3** — The mobile homepage carries the same content: hero (brand + headline + primary/secondary CTA), next live event (poster, date, venue, seats progress, price, buy), aggregate stats, how-it-works, membership CTA, footer.
- **R4** — It feels native: full-width ≥44px CTAs, a sticky bottom buy bar, ≥16px inputs (n/a here, no inputs), safe-area insets, thumb-reachable controls, no horizontal overflow at 360–430px + landscape.
- **R5** — It is animated with the existing system: entrance stagger, scroll reveals, stats count-up, gear motion, tap feedback — smooth (compositor-only), respecting the app's force-on motion posture.
- **R6** — The heavy immersive engine (GSAP/Lenis/ScrollTrigger + `engine.js`) does **not** run or block on mobile; the immersive global CSS does not bleed into the mobile layout.
- **R7** — The next-event card uses **live** data (active event + stats), not the port's hardcoded numbers; it fails gracefully (the 2s `activeSlug` timeout pattern) if Supabase is slow/paused.
- **R8** — Buyer/account/staff pages are rechecked on a real mobile viewport and any genuine gaps fixed.
- **R9** — Verified at 360/390/414 + landscape, desktop baseline unchanged, build passes, and live on `sava-pass.vercel.app`.

---

## Key Technical Decisions

- **KTD1 — Device split = co-render + viewport CSS toggle + engine gating + namespacing (NOT a UA rewrite, NOT a route change).** `page.tsx` renders the immersive block (wrapped, hidden ≤900px) and `<MobileHome/>` (hidden ≥901px) in one ISR document. `ImmersiveEngine` bails before loading any CDN/engine script when `matchMedia('(max-width:900px)').matches` (so phones never run GSAP/Lenis). MobileHome is fully namespaced under a `.mh` root with its own styles, and a small mobile reset neutralizes the immersive global `body`/`.btn` rules at ≤900px. **Rejected alternatives:** (a) a `proxy.ts` UA rewrite to a `/m` route — cleaner CSS separation but adds UA sniffing, per-route cache warming, and middleware complexity; (b) client-only swap that injects the immersive on desktop — loses desktop SSR (the showcase). Co-render keeps both layouts SSR'd and avoids UA sniffing; its cost is shipping the (display:none) immersive CSS/markup to phones, which is small gzipped and far cheaper than the gated-off engine JS.
- **KTD2 — Namespace everything mobile under `.mh`; do not use the global `.btn`.** The immersive `.btn{min-width:210px;flex:1}` would break mobile buttons, so MobileHome uses its own `.mh-btn` (full-width, ≥44px) and reuses only non-`.btn` components (`Chip`, `Reveal`, `CountUp`, `GearWatermark`, `Logo`, `LiveClock`). A `@media(max-width:900px){ body{display:block;padding-left:0} }` reset undoes the immersive body rule for the mobile layout.
- **KTD3 — Reuse the app's animation system; add no animation dependency.** Entrance = `anim-rise`/`anim-rise-fast` stagger; scroll reveal = the global `ScrollReveal` (`.anim-rise` enters as it scrolls in) and/or `Reveal`; numbers = `CountUp`; gear = a CSS rotation; tap = `pressable`/active-scale. `framer-motion` stays absent. Motion is forced-on consistent with the rest of the app (the `matchMedia` reduce-motion shim in `layout.tsx` already applies).
- **KTD4 — Live data via the existing fetchers, same fail-fast posture.** MobileHome (server component) reads `getActiveEvent()` + `getEventStats(active.id)` for the card and `getPastEvents()` for the archive/stats, wrapped in the same 2s `Promise.race` timeout the page already uses, so a paused Supabase never blocks the static shell. Aggregate stats (X ediții · Y bilete · ~Z RON) computed from real past events where cheap; otherwise the design's illustrative copy with a `// TODO live` note (decided in U4, see Open Questions).
- **KTD5 — Mobile breakpoint = 900px** (matches the immersive cascade's mobile boundary and the existing `BuyCta` desktop-hide at ≥901px), so the split aligns with where the immersive layout already collapses.
- **KTD6 — Verify mobile by render, desktop by baseline, ship via CLI.** Mobile: Playwright mobile contexts (looks full, no overflow, reveals/count-up fire, tap targets, zero console errors) — install Playwright for this run (not currently in `web/node_modules`) or use the headless-Chrome screenshot path. Desktop: 1280px baseline unchanged + immersive engine still loads on desktop only. Then redeploy via the Vercel CLI (token kept at `active/.vercel-token`).

---

## High-Level Technical Design

### Device split (one ISR document, two layouts)

```
GET /  (ISR, revalidate 300)
  page.tsx (server)
    ├─ <div class="home-desktop">          ← @media(max-width:900px){display:none}
    │    <style>{IMMERSIVE_CSS}</style>     (global, route-lifetime — desktop only visually)
    │    <div class="sp-immersive-root" dangerouslySetInnerHTML={markup}/>
    │    <ImmersiveEngine/>                 ← client; bails if matchMedia(max-width:900px)
    │
    └─ <MobileHome event stats past>        ← @media(min-width:901px){display:none}
         <div class="mh">                   (namespaced; own styles; .mh-btn not .btn)
           <MhHero/> <MhEventCard/> <MhStats/> <MhHowItWorks/> <MhMembership/> <MhFooter/>
           <MhStickyBuy/>                    (fixed bottom, safe-area)
```

- Desktop: immersive renders + engine runs (unchanged). `.mh` is `display:none`.
- Mobile: `.home-desktop` is `display:none`; engine bails (no GSAP/Lenis fetch); `.mh` renders and animates via CSS/IntersectionObserver.
- Isolation: `.mh-*` namespacing + a ≤900px `body` reset keep the global immersive rules from styling the mobile layout.

### Mobile homepage section flow (top → bottom)

```
[ sticky mini top: gear + SavaPass wordmark ]
MhHero        brand · "Biletul tău, digital. Scanezi, intri." · sub · [Vezi evenimentul] [Vezi arhiva] · gear accent
MhEventCard   poster · "URMĂTORUL EVENIMENT" · title · Vin·14 Nov·19:00 · Curtea Veche · seats bar (live) · 45 RON · [Cumpără]
MhStats       countup: 3 ediții · 264 bilete · ~13.500 RON donați
MhHowItWorks  3 steps: Alegi → Plătești · Scanezi (icon + label)
MhMembership  "Devino membru" pitch + [Aplică acum] → /devino-membru
MhFooter      Interact Sf. Sava · links · social
MhStickyBuy   fixed bottom: "Cumpără bilet · 45 RON" (hides when MhEventCard CTA in view)
```

(Authoritative content is the per-unit sections; this is the orientation map.)

---

## Output Structure

```
web/app/
├─ page.tsx                      (modified: co-render + CSS toggle)
└─ _mobile/
   ├─ MobileHome.tsx             (server: data fetch + section composition)
   ├─ mobile-home.css            (or scoped <style>: the .mh namespace + .mh-btn + body reset)
   ├─ MhHero.tsx
   ├─ MhEventCard.tsx            (client if it needs live clock / interaction; else server)
   ├─ MhStats.tsx                (uses CountUp)
   ├─ MhHowItWorks.tsx
   ├─ MhMembership.tsx
   ├─ MhFooter.tsx
   └─ MhStickyBuy.tsx            (client: IntersectionObserver to hide near the card CTA)
web/app/_immersive/ImmersiveEngine.tsx   (modified: matchMedia mobile bail)
```

(Layout is a scope declaration; the implementer may merge small sections.)

---

## Scope Boundaries

**In scope:** A dedicated, animated, mobile-first homepage for phones (≤900px) with the same identity and content, wired to live event data, isolated from the desktop immersive CSS/engine; a recheck + gap-fix of buyer/account/staff on mobile; verification and a production redeploy.

**Out of scope (non-goals):**
- Any change to the desktop immersive experience (CSS, markup, engine, ISR).
- A native app / PWA / offline.
- New product features, copy rewrites, or backend/data changes (only reads of existing data).
- Replacing the app's animation system or adding `framer-motion`.
- A `proxy.ts` UA-rewrite architecture (rejected, KTD1).

### Deferred to Follow-Up Work
- Conditionally **not shipping** the immersive CSS/markup to phones (saves the display:none payload) — needs per-request rendering, which conflicts with ISR; revisit only if the mobile payload proves heavy.
- Tablet-specific (601–900px) layout tuning beyond "mobile layout scales up acceptably."
- Reusing the new mobile sections to also simplify the desktop archive page, if it ever helps.

---

## Implementation Units

> Each section unit **realizes its Signature Moment** (above) at the craft bar in **Design Direction** — the locked color/type/radius/motion system and the anti-slop guardrails are binding, not aspirational. U2 → moment 1 (the door), U3 → moment 2 (the ticket), U4 → moments 3+4 (ribbon + thread), U5 → moments 5+6 (invitation + sticky door).

### U1. Device split, engine gating & mobile shell

**Goal:** Render both layouts in one ISR doc, show the right one per viewport, keep the immersive engine and global CSS off mobile, and stand up the namespaced `.mh` shell with live data wired.
**Requirements:** R1, R6, R7 (foundation for R2–R5).
**Dependencies:** none (first).
**Files:**
- `web/app/page.tsx` — wrap the immersive block in `.home-desktop`; render `<MobileHome .../>` in `.home-mobile`; add the visibility CSS (`@media(max-width:900px){.home-desktop{display:none}} @media(min-width:901px){.home-mobile{display:none}}`) and the `body` reset for ≤900px. Keep the existing `activeSlug()` + extend to fetch event + stats (same 2s race) to pass into MobileHome.
- `web/app/_immersive/ImmersiveEngine.tsx` — early-return before any script load when `window.matchMedia('(max-width:900px)').matches` (re-check on resize is unnecessary; a phone won't cross 900px mid-session).
- `web/app/_mobile/MobileHome.tsx` — server component: fetch `getActiveEvent()`, `getEventStats(active.id)`, `getPastEvents()` (race-guarded); render the `.mh` root + section placeholders.
- `web/app/_mobile/mobile-home.css` (or scoped `<style>`) — the `.mh` base (background ink, type, spacing scale), `.mh-btn` (full-width, ≥44px, gradient/ghost variants), and the ≤900px `body{display:block;padding-left:0}` reset.
**Approach:** Honor KTD1/KTD2. Verify on desktop the immersive still SSRs + engine runs and `.mh` is hidden; on mobile the engine bails (no `gsap`/`lenis` network requests) and `.mh` shows. Data is read-once server-side and passed down.
**Patterns to follow:** the existing `activeSlug()` race in `page.tsx`; `ImmersiveEngine`'s existing client structure; `BuyCta`'s `@media(min-width:901px){display:none}` desktop-hide.
**Test scenarios:**
- Covers R6. Mobile context (390px): no network request to `/imersiv/vendor/gsap.min.js` or `engine.js`; `.sp-immersive-root` is `display:none`; `.mh` is visible.
- Covers R1. Desktop (1280px): immersive SSRs, engine loads (gsap/lenis requested), `.mh` is `display:none`.
- Covers R7. With Supabase reachable, MobileHome receives the live active event; with the 2s timeout firing (simulated), MobileHome still renders with a graceful empty/fallback event state (no crash, no hang).
- No hydration mismatch warning in console on either viewport.
**Verification:** Desktop unchanged + engine runs; mobile shows `.mh` with no engine fetch and no global-CSS bleed (mobile buttons are `.mh-btn`, not 210px-min `.btn`); build passes.

### U2. Mobile hero

**Goal:** A full, on-brand hero that fills the first screen with intent (not emptiness) and animates in.
**Requirements:** R2, R3, R5.
**Dependencies:** U1.
**Files:** `web/app/_mobile/MhHero.tsx`, styles in `mobile-home.css`.
**Approach (Signature Moment 1 — the door):** full-bleed `public/landing/hero.jpg` under an ink scrim (contrast for the headline); the **single** page eyebrow "Interact Sf. Sava · Curtea Veche" (or drop it); headline "Biletul tău, digital. Scanezi, intri." with the cyan accent on one word and the serif italic *"intri"* (one ceremonial word, descender clearance `leading-[1.1]`); ≤20-word sub; primary `.mh-btn` "Vezi evenimentul" → `ctaHref`, secondary ghost "Vezi arhiva". The Interact gear rotates slowly behind (CSS `rotate`, `linear`, contained — no overflow). **Entrance = `clip-path: inset()` line-by-line headline reveal** (emil image/text reveal) staggered 50–60ms, photo settles with a subtle scale, CTAs rise last; custom ease-out. ≤4 text elements, fits one screen, `:active{scale(.97)}` on CTAs.
**Patterns to follow:** the app display/serif type usage; `GearWatermark`; `anim-rise` stagger via `style={{animationDelay}}` as used across the app.
**Test scenarios:**
- At 360/390px: hero fills ~one screen with no empty void; headline, sub, both CTAs visible; gear accent does not cause horizontal overflow.
- Entrance animation plays on load (elements start hidden, settle in staggered).
- Primary CTA href = the live active event (or `#evenimente` fallback when no active event); both CTAs ≥44px, full-width.
- Covers R5. With the app's force-on motion, the stagger runs (not suppressed).
**Verification:** Hero reads as a deliberate mobile first-screen, animates in, no overflow; build passes.

### U3. Mobile next-event card (live)

**Goal:** A native event card driven by live data — the core conversion surface.
**Requirements:** R3, R4, R7.
**Dependencies:** U1.
**Files:** `web/app/_mobile/MhEventCard.tsx`, styles in `mobile-home.css`.
**Approach (Signature Moment 2 — the ticket):** render the live event as a real **boarding-pass silhouette**, not a generic card (impeccable: "cards are the lazy answer") — poster (`photo_url`, lazy `<img>`) up top, a **dashed perforation/tear line** with notch circles cut into the sides, then the stub: "Următorul eveniment" chip, title, date (`date_label`/`date_long`) + venue, and a **seats meter that fills on reveal** (`clip-path`/`scaleX` from 0 → sold/capacity with the page ease) showing `seatsLeft` + % full; mono `priceRon`. The whole pass is the buy affordance → `/[slug]`. Reveal on scroll (`.anim-rise`). One radius scale, one accent. Empty state when no active event (calm "Niciun eveniment activ acum" + archive link).
**Patterns to follow:** the buyer event page's seats/price rendering; `seatsLeft`/`priceRon`; `Chip`; `Reveal`.
**Test scenarios:**
- Covers R7. Renders the live active event (title, date, venue, poster) and live seats (sold/cap) — not the port's hardcoded 84/120.
- Seats progress bar width matches `sold/capacity`; "N locuri rămase" matches `seatsLeft`.
- CTA href points at the live event; ≥44px, full-width; price uses mono font via `priceRon`.
- No active event: card shows the empty state, no crash.
- No horizontal overflow; poster respects aspect ratio at 360px.
**Verification:** Live, accurate event card that reveals on scroll and converts; build passes.

### U4. Mobile stats + how-it-works

**Goal:** Two compact sections that add substance and motion between the event card and membership.
**Requirements:** R3, R5.
**Dependencies:** U1.
**Files:** `web/app/_mobile/MhStats.tsx`, `web/app/_mobile/MhHowItWorks.tsx`, styles in `mobile-home.css`.
**Approach (Signature Moments 3 + 4):** **Ribbon (not a 3-metric card grid — banned):** `3 ediții · 264 bilete · ~13.500 RON pentru cultură` as one inline line on a cyan hairline, each numeral a `CountUp` (mono) firing on scroll-in. Compute `ediții` real from `getPastEvents()` where cheap; bilete/RON stay the brand's illustrative figures with a `// TODO live` (Open Questions). **Thread:** `Alegi → Plătești → Scanezi` as three beats joined by a **cyan connector line that draws** as the section enters view (`clip-path`/`scaleY` reveal of the line, then each beat `.anim-rise` staggered) — the one earned use of `01/02/03`. Icons from the project's `lucide-react` (already a dependency), one `strokeWidth`.
**Patterns to follow:** `CountUp` (`components/landing/`); the app's icon usage (lucide) in staff/buyer pages; `Reveal`.
**Test scenarios:**
- Stats count up from 0 to target when scrolled into view; final values render server-side (no 0 flash for no-JS).
- How-it-works: 3 steps stack, icons + labels legible at 360px, reveal as they enter.
- No horizontal overflow.
**Verification:** Both sections add density + motion; count-up fires once on scroll; build passes.

### U5. Mobile membership, footer & sticky buy bar

**Goal:** Close the page with the membership CTA and footer, and add an app-native sticky buy bar.
**Requirements:** R3, R4.
**Dependencies:** U3 (sticky bar coordinates with the event card CTA).
**Files:** `web/app/_mobile/MhMembership.tsx`, `web/app/_mobile/MhFooter.tsx`, `web/app/_mobile/MhStickyBuy.tsx`, styles in `mobile-home.css`.
**Approach (Signature Moments 5 + 6):** **Invitation (a different layout family):** full-bleed `public/landing/about.jpg` (students) under an ink scrim, one line of pitch, one `.mh-btn` "Aplică acum" → `/devino-membru`. Footer: Interact Sf. Sava brand line, key links, social/contact, year — grouped with hairline dividers, not cards. **Sticky door:** a fixed bottom bar ("Cumpără bilet · N RON" → live event) with `safe-pb`, shown by default and **fading out (clip/opacity, custom ease) while the MhEventCard CTA is in view** (IntersectionObserver) so the two never duplicate intent; returns after. `:active{scale(.97)}`. Hidden entirely when no active event.
**Patterns to follow:** `BuyCta` (fixed bottom, `max(28px, env(safe-area-inset-bottom))`, desktop-hide); the membership page CTA; the global `ScrollReveal`/IntersectionObserver usage.
**Test scenarios:**
- Membership + footer render, links resolve (`/devino-membru`, archive, etc.); no overflow.
- StickyBuy: fixed at bottom, clears `env(safe-area-inset-bottom)`, ≥44px; hides when the event-card CTA is on screen, reappears after scrolling past; absent when no active event.
- Covers R4. StickyBuy never overlaps the footer content (footer has bottom padding to clear it).
**Verification:** Page closes cleanly with a native sticky buy affordance; build passes.

### U6. Mobile polish pass (the whole `.mh`)

**Goal:** Tighten the assembled mobile homepage to feel finished: rhythm, tap targets, safe-area, landscape, zero overflow.
**Requirements:** R2, R4, R5.
**Dependencies:** U2–U5.
**Files:** `web/app/_mobile/mobile-home.css` (and minor per-section tweaks).
**Approach:** Audit the full scroll at 360/390/414 + landscape: consistent vertical rhythm between sections, ≥44px on every control (`.tap` where needed), `safe-px`/`safe-pb` on edges and the sticky bar, headline/type scale tuned, images lazy + sized, motion smooth (compositor-only transforms, `will-change` only where needed). Confirm no element causes horizontal overflow.
**Patterns to follow:** the `safe-*`/`.tap` helpers (002/this session's U1); the app's `anim-*` timing.
**Test scenarios:**
- 360/390/414 + landscape: `documentElement.scrollWidth ≤ innerWidth + 2` everywhere; all CTAs ≥44px; sticky bar + page edges respect safe-area.
- A full scroll shows reveals/count-up firing once, no jank, no layout shift.
- Zero console errors.
**Verification:** The mobile homepage looks and feels finished across phone sizes + landscape; build passes.

### U7. Recheck buyer / account / staff on mobile

**Goal:** Confirm the rest of the app is genuinely native on a phone and fix any real gaps (the scope add).
**Requirements:** R8.
**Dependencies:** none (parallel to U2–U6).
**Files:** only the files with a genuine gap (e.g. `app/[slug]/checkout/CheckoutClient.tsx`, `app/conta/*`, `app/(staff)/*`) — no speculative churn.
**Approach:** Walk the buyer flow (`/[slug]` → checkout → success → ticket), account (`/conta`, login), membership (`/devino-membru`), and staff (authenticated: admin, editor, team, aplicatii, statistici, scanner) at 390px. Most were verified native in 002/this session; fix only concrete issues found (overflow, sub-44px control, safe-area miss). Staff needs a login (see Risks).
**Patterns to follow:** the safe-area/`.tap`/`.table-scroll` helpers already in place.
**Test scenarios:**
- Each route at 390px: no horizontal overflow, primary actions ≥44px, inputs ≥16px (global rule), sticky bars clear safe-area.
- Staff (authenticated): tables scroll, scanner operable.
- Any fix is the minimal change to the specific gap.
**Verification:** Buyer/account/staff confirmed native on mobile; any real gaps fixed; build passes.

### U8. Verify (mobile + desktop) and redeploy

**Goal:** Prove the mobile homepage looks good and the desktop is untouched, then ship.
**Requirements:** R1, R9.
**Dependencies:** U1–U7.
**Files:** `web/scripts/verify-mobile.mjs` (new) — Playwright over `/` at 360/390/414 + landscape (mobile context): `.mh` visible, `.sp-immersive-root` hidden, no engine fetch, no overflow, reveals/count-up fire, tap targets, zero console errors; plus a 1280px desktop assertion (`.mh` hidden, immersive present, engine loads) for R1. (Install Playwright for this run, or use the headless-Chrome screenshot path.) Then Vercel CLI prod deploy (`active/.vercel-token`).
**Approach:** Screenshot the mobile homepage at the three widths and run a **design self-review against the Design Direction guardrails** — one accent locked, ≤1 eyebrow page-wide, ≥4 distinct layout families, no banned patterns (hero-metric grid, identical cards, gradient text, glassmorphism-default), real photos present, every CTA passes contrast + fits one line, motion actually moves (hero clip-path reveal, seats fill, count-up, thread draw, sticky yield all fire). It must read as *breathtaking and intentional*, not "AI made that." Assert the desktop baseline is unchanged. Redeploy and confirm production serves `.mh` for mobile and the immersive for desktop.
**Patterns to follow:** the served-HTML + Vercel CLI sequence used in 001/002; mobile Playwright context (`isMobile:true,hasTouch:true`).
**Test scenarios:**
- Mobile `/` at 360/390/414/landscape: looks full (screenshot), no overflow, no engine fetch, reveals/count-up fire, no console errors.
- Desktop `/` at 1280px: immersive unchanged, engine loads, `.mh` hidden.
- After deploy: production serves the mobile homepage for a mobile UA/viewport and the immersive for desktop.
**Verification:** Mobile looks good + native, desktop provably unchanged, build passes, live on `sava-pass.vercel.app`; hard-refresh confirms on device.

---

## Risks & Dependencies

- **Global immersive CSS bleed (KTD1/KTD2).** The unscoped `body`/`.btn`/`:root` rules are the top risk. Mitigation: namespace all mobile styles under `.mh`, use `.mh-btn` (never the global `.btn`), and a ≤900px `body` reset. Verify mobile buttons aren't 210px-min and the body isn't flex-padded.
- **Double payload on mobile.** Phones download the display:none immersive CSS (~65KB raw)/markup (~25KB) even though the heavy engine JS is gated off. Acceptable (gzips small; engine JS is the real weight and is skipped). Conditionally not shipping it is deferred (conflicts with ISR).
- **ISR + device split.** Both layouts live in one cached document, so no per-request branching is needed (the toggle is CSS + a client matchMedia gate). Keep `revalidate=300`; do not make the page dynamic.
- **Engine gate correctness (R6).** If `ImmersiveEngine` doesn't bail on mobile, phones run GSAP/Lenis pointlessly. Assert zero engine network requests on a mobile context.
- **Live data + paused Supabase (R7).** Reuse the 2s `Promise.race` timeout; MobileHome must render a graceful empty event state, never hang. The keep-warm cron already mitigates pausing.
- **Playwright not installed.** `web/node_modules` has no Playwright; U8 installs it for the run or uses the headless-Chrome screenshot path documented this session.
- **Staff verification needs a login (U7).** Authenticated routes need a staff test account; stub the scanner camera where possible.
- **Stale `.next` cache** has bitten CSS/asset changes repeatedly — verify served output (or `rm -rf web/.next` + rebuild) before concluding.
- **Redeploy needs the token** (kept at `active/.vercel-token`); CLI uploads local files (the MCP would deploy stale git). Production has no git integration, so a CLI `--prod` deploy is the only path live.

---

## System-Wide Impact

- **Affected users:** every phone visitor to `/` (the majority of traffic) gets a purpose-built experience instead of an emptied desktop port; desktop visitors are unaffected.
- **Desktop untouched:** the immersive block, its CSS, engine, and ISR are unchanged; only `page.tsx` gains a sibling mobile branch and a visibility toggle. U8 asserts the desktop baseline.
- **New surface area:** a `web/app/_mobile/` module (server + a few client components) and one verify script; no new runtime dependencies.
- **Perf:** mobile drops the ~150KB GSAP/Lenis engine (net win) but gains the small display:none immersive CSS/markup; LCP on mobile should improve (no engine boot, lighter first paint of real content).

---

## Open Questions (deferred to implementation)

- Aggregate stats: compute real (count past events, sum tickets/RON) vs keep the design's illustrative numbers — decided in U4 by how cheap the real aggregate is.
- Whether `MhEventCard`/`MhStickyBuy` CTA points at `/[slug]` (event page) or `/[slug]/checkout` (straight to pay) — pick the higher-converting one; default `/[slug]`.
- Exact hero gear treatment (rotating `GearWatermark` vs a static accent) — by eye in U2.
- Staff test-account availability for U7.
- Whether to later stop shipping the immersive payload to phones (deferred; ISR conflict).

---

## Sources & Research

- `web/app/page.tsx` (immersive render + `activeSlug()` 2s race + ISR `revalidate=300`); `web/app/_immersive/ImmersiveEngine.tsx` (CDN/engine loader to gate).
- Immersive CSS is **global/unscoped** (0 `.sp-immersive-root` scoping): bare `body{display:flex;padding-left:clamp()}`, `.btn{min-width:210px;flex:1}`, `:root{--cyan…}` — the isolation constraint.
- Data: `lib/events.ts` — `getActiveEvent`, `getPastEvents`, `getEventStats`, `seatsLeft`, `priceRon`; `Event=Tables<"events">`, `EventStats` view.
- Reusable components: `components/ui/` (`Button`, `Chip`, `Eyebrow`, `GearWatermark`, `Logo`, `LiveClock`, `Reveal`, `ScrollReveal`), `components/landing/` (`CountUp`, `TiltCard`). Theme: `.theme-immersive` on `<body>` (`layout.tsx`) → `--im-*` palette. Animation: CSS `anim-*` + global `ScrollReveal` + `CountUp`; **no `framer-motion`** in `package.json`.
- Prior attempts: 2026-06-24-001 (dots hide, shipped), 2026-06-24-002 (conservative whole-app polish — the homepage subtraction that left it sparse, motivating this rebuild).
- **Design skills (read this session, distilled into Design Direction):** `~/.claude/skills/impeccable/SKILL.md` (color/type/layout/motion rules + absolute slop bans + the AI-slop category-reflex test), `~/.claude/skills/emil-design-eng/SKILL.md` (animation decision framework — custom ease-out curves, durations, never-`scale(0)`, `:active` feedback, clip-path reveals, CSS-over-JS-under-load, stagger), `~/.claude/skills/design-taste-frontend/SKILL.md` (design read + VARIANCE/MOTION/DENSITY dials, hero discipline, eyebrow restraint, layout-family diversity, color/shape locks, real-image requirement). Same trio the project's `design-director` agent distills.
- `projects/sava-pass/CLAUDE.md`: extractor/immersive isolation, force-on motion, served-HTML verification, Vercel CLI-deploy-needs-token / no-git-integration, stale-`.next` cache, `BuyCta`/safe-area patterns.
