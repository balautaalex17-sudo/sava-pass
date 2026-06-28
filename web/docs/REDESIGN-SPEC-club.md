# SavaPass — CLUB SITE REDESIGN SPEC (Phase 9, immersive register)

**Audience:** implementer agents building the public Interact club site (U1–U9 of `web/docs/plans/2026-06-28-005-feat-public-club-site-plan.md`). You read ONLY this file plus your unit's source files and the existing `web/docs/REDESIGN-SPEC.md` when you touch a transactional surface. Everything you need from the three design doctrines (`impeccable`, `emil-design-eng`, `design-taste-frontend`) is distilled here — do not re-read them, do not re-derive rules. Where this spec is silent, follow the existing immersive code's conventions.

**Scope:** the dark immersive identity pages in the `(club)` route group + the appended landing teasers + the reusable shell/hero/gallery + the extended public nav. All paths are relative to `c:\Users\cycla\Documents\Bussines\projects\sava-pass\web\`.

**Constitution order (read this first):** the project's documented design system wins over any skill. The hierarchy is: (1) `app/globals.css` frozen tokens, (2) the existing `web/docs/REDESIGN-SPEC.md` rulings, (3) this club spec, (4) the three skills. Where a skill conflicts with (1)–(3), the project wins. Section 3 lists every such conflict and its final ruling.

---

## 1. Global direction

The landing already does the loud part: a cinematic, GSAP-scored scroll that says "this club throws real events." The club pages are the rest of the building — the rooms you walk into after the lobby. They keep the same dark cinematic skin (ink `#070A12`, cyan `#00A7E8`, the gear/seam/hairline motifs, JetBrains-Mono telemetry labels) so a visitor never feels they left the site. But where the landing is a performance, each club page is **one held breath then a quiet, generous read**: a single crafted hero moment, then a calm, high-contrast, editorial body that respects the reader. Interact Sf. Sava is a real student club with real names, real projects, real beneficiaries — so the design's job is to be specific, never decorative-for-its-own-sake. The pages should feel like a well-made annual report that happens to glow in the dark: confident, factual, warm, never templated. The buy/apply flows stay light because they are checkout, and the contrast between dark identity and light transaction is itself a piece of the design — you feel the moment you cross from "learning about us" to "doing business with us."

---

## 2. What is frozen (immutable)

Everything in `app/globals.css` — `@theme`, the base `:root`, the motion block, the `--im-*` immersive block, `.theme-immersive`, and `.sp-light` — is frozen. You may **add** tokens, keyframes, utility classes, and CSS files; you may not edit or remove any existing value. Specifically immutable:

- **The `--im-*` palette** is the club site's entire color vocabulary. Use ONLY these for color: `--im-ink` `#070A12` (page), `--im-ink-2` `#0B1320` (card surface), `--im-ink-3` `#101A2E` (elevated/hover), `--im-cyan` `#00A7E8`, `--im-cyan-light` `#7FE0FF`, `--im-fg` `#EAF4FB` (primary text), `--im-fg-2` (muted, 66%), `--im-fg-3` (faint, 42%), `--im-line` (cyan hairline), `--im-line-soft` (neutral hairline), `--im-grad` (the cyan→blue CTA gradient), `--im-shadow`, `--im-glow`. Do not introduce any new hex anywhere.
- **The `.theme-immersive` scope** is applied on `<body>` in `app/layout.tsx`. The club pages inherit it automatically — they do NOT add `.sp-light` and do NOT re-declare semantic aliases. Inside `(club)`, semantic aliases (`--bg-app`, `--fg-primary`, `--bg-card`, `--border-subtle`, shadows) already resolve to the dark palette. Read color through the semantic aliases OR the raw `--im-*` tokens; never hardcode.
- **Fonts:** Manrope (UI/body), JetBrains Mono (data/labels/numerals), Instrument Serif (display, italic, ceremonial only). Loaded via `next/font` in `app/layout.tsx`. Do not change weights/subsets/loading.
- **Radii** 6/10/14/20/28/pill; **shadows** xs/sm/md/lg (immersive variants) + `--im-shadow`/`--im-glow`; **easings/durations** `--ease-out`, `--ease-spring`, `--ease-in-out`, 140/220/380ms.
- **The gear brand mark** (`components/ui/Logo.tsx`) and the Interact columns/temple logo. Never redraw or restyle the geometry.
- **The homepage immersive port** (`app/page.tsx` `<style>` + `_immersive/content.ts` + `public/imersiv/engine*.js` + the extractor). NEVER edit the verbatim port or its engine. Landing enrichment (U7) is **append-only React below `.sp-immersive-root`** — KTD6.
- **Routes, slugs, form field `name`s, server actions, data fetching, RLS, auth, redirects, metadata exports, `lib/`, `proxy.ts`** — untouchable by the visual layer.

You may add new tokens/keyframes/utilities as Section 5 specifies, and you may add a single new CSS file scoped to the club register (Section 4.1).

---

## 3. Resolved doctrine conflicts (final rulings)

The project constitution overrides the generic skills on these points. These decisions are not re-openable per page.

1. **Instrument Serif.** `design-taste-frontend` §4.1 bans `Instrument_Serif` by name as an AI-default serif. The project committed it as the brand display font and `REDESIGN-SPEC.md` ruling §3.3 keeps it for ceremonial moments only. **Ruling: Instrument Serif stays, italic, and is RATIONED to exactly one ceremonial moment per club page — the hero's accent line (one phrase, not the whole headline) OR a single pull-quote, never both on the same page.** Never in body, buttons, labels, captions, nav, or staff surfaces. If you reach for it twice on one page, you have over-used it — cut to one.

2. **Em dash / middle dot.** `design-taste-frontend` §9.G bans `—` outright and rations `·`. `REDESIGN-SPEC.md` §3.2 sanctions three glyphs (`·` `—` `→`). **Ruling: the project wins, with discipline.** `—` is legal but reserved for true parenthetical prose pauses, never as a decorative separator or in labels/pills/eyebrows/buttons. `·` is the metadata separator (`Vin · 14 Nov · 19:00`, `Direcție · Comunitate`) and may appear more than once per line where it joins genuine metadata fields. `→` is the action/forward glyph. No other dash forms. Date ranges use a hyphen (`2024-2025`).

3. **Lucide icons.** `design-taste-frontend` §3.C discourages Lucide. The project standardized on it (`REDESIGN-SPEC.md` §3.4). **Ruling: Lucide only, `strokeWidth={1.75}`, `currentColor`, sizes 18 dense / 20 standard / 24 section-marker / 40 empty-state.** Never hand-roll an SVG icon except the two preserved brand marks (gear, columns).

4. **Eyebrow / uppercase tracked kicker.** All three skills ban the eyebrow-above-every-heading scaffold; `REDESIGN-SPEC.md` §3.1 allows uppercase tracked labels for DATA only. **Ruling: an uppercase tracked label may label DATA or a real metadata field, never sit above a section heading as taxonomy.**
   - **Survive:** mono field labels in fact grids (`ROL`, `BENEFICIAR`, `LOCAȚIE`, `PERIOADĂ`, `DISTRICT`), sponsor-tier labels (`PARTENER PRINCIPAL`), the project-card category tag when it is a real filter category. These render as JetBrains Mono 11px, +0.14em, `--im-fg-3`.
   - **Die:** any `<Eyebrow>` placed above an `h1`/`h2` to name the section ("DESPRE NOI", "ECHIPA", "PROIECTELE NOASTRE", "SPONSORII NOȘTRI"). Headings stand alone in sentence case. The `<Eyebrow>` component is NOT used on any club page.

5. **Numbered section markers.** Banned as scaffolding by all three skills; `REDESIGN-SPEC.md` §3.8 allows them only for a genuine ordered sequence. **Ruling: no `01 / 02 / 03` section markers on any club page.** The one allowed numbered sequence in the whole product is the landing's existing "How it works" — do not add another. The team page's board-vs-members split is a grouping, not a sequence: no numbers.

6. **Dark-only, no dark/light toggle.** `design-taste-frontend` §6.C/§8 mandate dual-mode. **Ruling: the project wins — the club register is dark-only by design (the two-register system, KTD1). No `prefers-color-scheme` toggle, no light variant of these pages.** The "second mode" of this product is the `.sp-light` transactional flow, reached by crossing a register boundary (Section 7), not by a theme switch. `design-taste-frontend` §4.11 (page theme lock) is honored: every section of a club page is dark; none inverts.

7. **Decorative status dots / `·` separators / scroll cues.** Honored as written in the skills (these are genuine slop). No colored dot before a nav item or list row unless it encodes real state (e.g. a live event indicator). No "Scroll" cue. No locale/weather/time strip. No version stamps. No photo-credit captions unless a real photographer is credited.

8. **Hero stack discipline + hero-metric template.** `design-taste-frontend` §4.7 caps the hero at 4 text elements and bans the hero-metric strip; `impeccable` bans the hero-metric template. **Ruling honored:** the club hero carries at most a mono kicker (one, optional, a real metadata word like a date or section name — NOT an eyebrow taxonomy), a headline (≤2 lines with one Instrument-Serif accent phrase), one ≤22-word sub-line, and one CTA pair. No stat strip in any hero. Impact numbers live in a dedicated body band, count-up animated, exactly once per page.

9. **Reduced motion.** The product globally forces motion ON via the `matchMedia` shim + stripped CSS suppressors (documented in `CLAUDE.md`). **Ruling: club pages inherit that posture — do NOT add new `@media (prefers-reduced-motion)` blocks and do NOT re-introduce the shim-defeating CSS.** BUT every new animation you write must still be *structured* so it degrades gracefully if the shim is ever removed: content is visible by default (Section 5.4), and the `[data-armed]` reveal pattern already carries a reduce fallback in globals. You inherit accessibility from the existing system; you must not regress it.

---

## 4. The two-register system + handoffs (KTD1, R6)

There are exactly three registers. A page belongs to one; it never mixes.

| Register | Where | Skin | Reached how |
|---|---|---|---|
| **Identity (dark immersive)** | `/` landing + all `(club)` pages (despre, echipa, proiecte, sponsori, contact, district) | `.theme-immersive` / `--im-*` ink+cyan | default; you are "learning about us" |
| **Transactional (light Desktop Flow)** | `/[slug]` event + checkout, `/devino-membru`, `/succes`, `/bilet/[token]` | `.sp-light` / brand+slate | crossing a deliberate CTA boundary; you are "doing business" |
| **Staff utility (dark)** | `(staff)/admin/*`, scanner | `.theme-immersive`, calmer | auth-gated; not public |

### 4.1 Club register stylesheet

Create **one** scoped stylesheet for club-specific structural classes (the shell, hero, gallery, grids) so dense inline styles don't have to repeat. Put new club classes in a clearly-marked appended block in `app/globals.css` (the project keeps everything in one globals file) OR a co-located CSS module imported by `ClubPage`. Prefer the appended-globals approach to match the existing pattern; prefix every class `cl-` (e.g. `cl-hero`, `cl-shell`, `cl-fact`, `cl-gallery`) so it can't collide with the immersive `hnav-`/`im-`/`ev-` families. All color in these classes reads `--im-*` or the semantic aliases. Never hardcode hex.

### 4.2 The dark→light handoff (this is a designed moment, not a glitch)

When a dark club page links into a light transactional flow (e.g. `/proiecte/[slug]` → its linked ticketed event, or any page → `/devino-membru`), the transition must read as "stepping up to the counter," not "the site broke." Rules:

- **The cross-register CTA is the gradient button.** Both registers already share `--im-grad` / `--grad-brand` (the same cyan→blue). So the primary CTA that crosses the boundary (`Cumpără bilet`, `Devino membru`) uses the gradient fill in BOTH registers — it is the visual thread the user follows across the seam. On dark it carries `--im-glow`; on light it carries `--shadow-brand`. Same shape (radius 14, weight 700), same label wording, same `→` affordance.
- **Same-register links are quiet.** Links between two dark club pages (despre → echipa) are text links in `--im-cyan-light` with a hover color shift — never the gradient button (the gradient is reserved for the register crossing, so it stays meaningful).
- **The nav persists across the seam.** The public nav (Section 6.2) renders on both dark club pages and is reachable from light flows via "back" affordances. The nav itself does not restyle per page — it is the constant that proves it is one site.
- **No animated theme cross-fade.** The register change happens on a full route navigation (Next handles it). Do not build a custom dark→light transition animation; it would draw attention to the seam instead of making it feel routine. The shared gradient CTA is the only bridge needed.

---

## 5. Motion system (reuse only; zero new dependencies, zero new GSAP)

KTD3 is binding: **no per-page GSAP.** The homepage engine stays the only GSAP/Lenis layer. Club pages animate with the existing CSS keyframes + the existing IntersectionObserver primitives. One motion library max is allowed by policy, but you do not need it — do not add Motion/GSAP.

### 5.1 The primitives you have (use these, build nothing new unless 5.3 says so)

- **`components/ui/ScrollReveal.tsx`** (mounted once in `layout.tsx`). Reveals any element carrying `.anim-rise` / `.anim-rise-fast` as it enters the viewport, choosing a per-element variant automatically (`scale` for img/poster/media, `pop` for chips/badges/stats/spans, `row` for table rows, `rise` for everything else), staggered by sibling index ×55ms (cap 6). It commits the end state and releases the WAAPI animation on finish. **This is the workhorse for club body content.** You control the variant with `data-reveal="rise|pop|scale|row"` when the auto-pick is wrong.
- **`components/ui/Reveal.tsx`** (the `[data-armed]`/`[data-inview]` component). Use for a *section-level* armed container whose children stagger via the `.rstag` child class (`transition-delay: calc(var(--i) * var(--stagger-step))`). Use this when you want a whole band to reveal as a unit with internal cascade (e.g. a fact ledger, a values list).
- **`.anim-*` one-shot classes** (globals): `.anim-rise`, `.anim-rise-fast`, `.anim-fade`, `.anim-pop` (spring; success/arrival moments only), `.anim-pulse-dot`, `.anim-spin-slow`. The `html.sr-on` gate hides `.anim-rise`/`.anim-rise-fast` until ScrollReveal reveals them — so use those two for scroll-revealed content and `.anim-fade`/`.anim-pop` for on-mount moments.
- **`.line-mask` + `sp-line-rise`** (globals): the masked clip-up headline reveal (a line rises out of an `overflow:hidden` mask). **This is the club hero headline mechanism** (Section 5.2).
- **`.anim-zoom-settle`** (globals): Ken-Burns settle from scale(1.12)→scale(1.02), once. Use for a hero cinematic image only.
- **`.pressable`** (scale 0.97 on `:active`), **`.hover-dim`** (4% darken, hover-media-gated). Every button/tappable card gets `.pressable`; gradient fills get `.hover-dim`.

### 5.2 The hero animation (ONE per page — the held breath)

Each club hero gets exactly **one** crafted entrance, on mount, no scroll-jacking:

- **Headline:** wrap each headline line in `.line-mask > span` so lines rise out of their mask, staggered with inline `animationDelay` (0 / 90ms for a 2-line headline). The Instrument-Serif accent phrase is its own masked line or inline span inside a line. This is the signature "held breath."
- **Hero image/motif (if the page has one):** `.anim-zoom-settle` on the image (Ken-Burns settle), under a scrim so text clears contrast. Heroes without a photo use a quiet motif instead (Section 6.3) — never a gradient blob.
- **Kicker + sub-line + CTA:** `.anim-fade` with inline delays 0 / 200 / 320ms so they arrive after the headline lands.
- Total hero choreography ≤ 700ms. No infinite loops in a hero. No parallax (that is the landing's job).

### 5.3 New shared motion component allowed

- **`components/club/CountUp` — REUSE the existing `components/landing/CountUp.tsx`.** It already does IntersectionObserver + rAF `textContent` mutation and server-renders the final value (so crawlers/no-JS see the real number). Use it for the impact band only. Do NOT build a second count-up. If `CountUp` needs a tiny prop addition (suffix/format), add it minimally without changing its render-the-final-value contract.
- No other new motion component. The shell/hero/gallery are presentational and use the primitives above.

### 5.4 Motion budget per page (hard caps)

- **1** hero entrance (5.2).
- **Scroll reveals** on body sections via `.anim-rise`/ScrollReveal — but reveals must *enhance an already-visible default*: the server renders content normally; ScrollReveal only animates after hydration; the `sr-on` gate + 4s failsafe (existing) guarantee no blank ship. Never gate visibility on a class that only JS adds, outside the established gate.
- **1** impact band with count-up (despre + landing teaser only; not every page).
- **0** marquees added (the landing already has its one allowed marquee). **0** new infinite loops. **0** `window.addEventListener("scroll")`. **0** animated `filter`/`blur`/`height`/`width`/`top`/`left` on multiple elements (perf lessons in `CLAUDE.md`; transform/opacity only). The one sanctioned `width` transition is a single progress/meter bar rendered once.
- Hover effects live inside `@media (hover: hover) and (pointer: fine)` only.

---

## 6. Shared shell, hero grammar, nav, type scale (U1, U3)

### 6.1 The type scale (club register)

One scale, used everywhere on club pages. Sizes are desktop; clamp down on mobile as noted.

| Role | Font | Size / weight | Tracking | Color | Notes |
|---|---|---|---|---|---|
| Hero display | Instrument Serif (accent phrase) + Manrope 800 (rest) | `clamp(40px, 6vw, 76px)` / serif 400, sans 800 | -0.02em | `--im-fg`; accent in `--im-cyan-light` | ≤2 lines, `text-wrap: balance`, italic-descender clearance `line-height: 1.08` + `pb` reserve |
| Section heading (h2) | Manrope | `clamp(26px, 3.4vw, 38px)` / 800 | -0.02em | `--im-fg` | sentence case, stands alone (no eyebrow) |
| Sub-heading (h3) | Manrope | 20px / 700 | -0.01em | `--im-fg` | |
| Lead paragraph | Manrope | 18px / 400 / 1.6 | — | `--im-fg-2` | max-width 60ch |
| Body | Manrope | 16px / 400 / 1.6 | — | `--im-fg-2` | max-width 68ch; `text-wrap: pretty` |
| Mono data label | JetBrains Mono | 11px / 600 | +0.14em | `--im-fg-3` | uppercase; data fields only (ruling 3.4) |
| Mono value/numeral | JetBrains Mono | 14–48px / 700 | +0.02em | `--im-fg` or `--im-cyan` for impact | `tabular-nums` |
| Impact number (count-up) | JetBrains Mono | `clamp(40px, 6vw, 72px)` / 700 | -0.01em | `--im-cyan` | one band per page |
| Link (same-register) | Manrope | inherit / 600 | — | `--im-cyan-light`, hover `--im-fg` | underline-on-hover or color shift |

**Contrast floors (WCAG AA, non-negotiable):** body text ≥ 4.5:1 on its surface. `--im-fg` and `--im-fg-2` clear it on `--im-ink`/`--im-ink-2`. **`--im-fg-3` (42% opacity) is for data LABELS and faint decoration ONLY — never for sentences a user must read.** Any prose set in `--im-fg-3` is a bug; bump to `--im-fg-2`. Cyan body text under 18px must use `--im-cyan-light` (not raw `--im-cyan`) on ink to clear 4.5:1. Verify every text-on-image hero: the scrim must take the text to ≥ 4.5:1 over the brightest part of the photo.

### 6.2 The public nav (`app/HomeNav.tsx` — extend, U3)

The current `HomeNav` is transactional-only (Bilete, Devino membru, Contul meu, Check-in). Extend it to a real site nav while keeping the zero-JS `<details>` mobile disclosure and the `.hnav-*` namespacing (do not add client JS to the LCP path). Final link set, in this order:

`Despre` · `Proiecte` · `Echipă` · `Evenimente` (→ active event ticketing) · `Devino membru` · then the gradient `Cumpără bilet` CTA pill.

- **Demote secondary identity pages** (`Sponsori`, `District`, `Contact`) — they do NOT get top-level slots (six items + CTA is the ceiling for a single desktop line; `design-taste-frontend` §4.7 nav-single-line rule). Put `Sponsori`, `District`, `Contact` (+ `Contul meu`, `Check-in`) in the footer's identity column instead. The nav stays one clean line.
- `Evenimente` resolves to the active-event href (the existing `__EVENT__` pattern) and is the one nav item that crosses into the light register — it does not change appearance in the nav (consistency); the register change happens on navigation.
- Desktop nav height ≤ 72px (existing). Active-page indication: the current page's link gets `color: var(--im-fg)` (full white) + a 2px cyan underline; others stay `--im-fg-2`. Pass the current path from the layout.
- No backdrop-filter (paint cost; existing gradient-scrim background stays).
- Mobile sheet lists the same five links + CTA; add the three demoted links below a hairline as a secondary group so mobile users can still reach them.

### 6.3 `ClubPage` shell + `ClubHero` (the grammar every page shares — U1)

**`components/club/ClubPage.tsx`** (server component) is the one shell. It guarantees coherence and stops each page becoming its own template. Structure:

```
<main class="cl-shell">           // dark; inherits .theme-immersive from body
  <ClubHero ... />                 // ONE hero moment (variants below)
  <div class="cl-body">{children}</div>   // calm content; max-width 1120, gutters clamp(20px,5vw,56px)
  <ClubCta ... />                  // cross-register or same-register CTA band
  <SiteFooter />                   // shared footer with identity column
</main>
```

- `cl-body` sets the calm baseline: vertical rhythm `clamp(56px, 9vh, 112px)` between major sections (generous; restraint below the fold), section content max-width 1120, prose blocks capped at 68ch.
- The shell renders a faint, fixed, `pointer-events:none`, `aria-hidden` gear watermark OR a single hairline seam motif in the page margin — ONE ambient motif total, at `--im-fg-3`/8% opacity, never animated on these pages. This is the "same building" cue, not decoration on every section.

**`components/club/ClubHero.tsx`** (server component) — one component, **variant prop** so heroes vary within a shared grammar (avoids per-page hero drift AND avoids identical heroes). Props: `kicker?` (mono metadata word, optional), `title` (string or nodes with the serif accent marked), `lead?` (≤22 words), `media?` (image path for the photo variant), `motif?` (`'gear' | 'seam' | 'none'`), `cta?`, `variant`.

Three hero variants, assigned per page so no two heroes are identical:

- **`editorial`** (text-forward, no photo): big masked headline left-aligned, lead below, CTA; right margin carries a quiet seam/gear motif. Min-height `clamp(56vh, 70vh, 760px)` — a held moment, NOT a full 100vh void (the landing owns the full-bleed scroll; club heroes are shorter so the calm body starts sooner). Used by `/despre`, `/contact`.
- **`cinematic`** (photo-backed): full-bleed `next/image` with a left-weighted scrim (`linear-gradient(90deg, rgba(7,10,18,0.88) 0%, rgba(7,10,18,0.35) 60%, rgba(7,10,18,0.6) 100%)`), `.anim-zoom-settle` on the image, headline + lead over the dark side. Min-height `clamp(60vh, 76vh, 820px)`. Used by `/proiecte/[slug]` (project cover), `/district` (conference photo).
- **`index`** (list-page hero): compact (min-height `clamp(40vh, 50vh, 520px)`), headline + lead + an inline mono count of what's below (`12 proiecte · 4 ani`), no photo, asymmetric — headline pushed to ~60% width with negative right space. Used by `/proiecte`, `/echipa`, `/sponsori`.

Every hero uses the 5.2 entrance. The kicker, when present, is a real metadata word (a year, a count, a one-word category) in mono — never an eyebrow taxonomy label.

### 6.4 `Gallery` (reused by projects/team/district — U6)

**`components/club/Gallery.tsx`** (client island, the only interactive club component). Requirements:

- Layout: CSS Grid `repeat(auto-fill, minmax(220px, 1fr))`, `gap: 4px` hairline rhythm, NOT a uniform card grid — vary cell aspect ratios using a deterministic pattern from the image index (e.g. every 5th image spans 2 columns/rows) so the grid reads as an editorial mosaic, not a contact sheet. This satisfies the "no identical card grid" ban while staying data-driven for N images.
- Each cell: `next/image` with `sizes` set, `loading="lazy"` below the fold, `object-fit: cover`, radius 14, a 1px `--im-line-soft` border, hover (hover-media) lift `translateY(-2px)` + `--im-glow`. ScrollReveal handles entrance (scale variant) automatically.
- **Lightbox:** native `<dialog>` (escapes stacking contexts, no portal lib, accessible). Click a cell → open dialog with the full image, prev/next, `Esc` to close, focus-trapped by `<dialog>` semantics, backdrop `rgba(7,10,18,0.9)`. Arrow-key nav. The dialog open/close uses `.anim-fade` (220ms) + the image `.anim-pop` from `scale(0.94)` — never `scale(0)`.
- Empty state: if `gallery` is empty, render nothing (no empty grid frame).
- Alt text comes from the data (`caption` or a generated `{project title} — fotografie {n}`); never empty alt on content images.

### 6.5 `SiteFooter` (extend the existing footer)

The footer is the catch-all that lets the nav stay short. Columns: (1) gear + wordmark + one-line club descriptor; (2) **Identitate** — Despre, Proiecte, Echipă, Sponsori, District; (3) **Acțiuni** — Evenimente, Devino membru, Contul meu, Check-in, Contact; (4) socials (Instagram/Facebook/YouTube as Lucide icons, real hrefs from data/site_content). Hairline `--im-line-soft` dividers, mono `©` line. Links get hover color shift. No marquee, no locale strip.

---

## 7. Per-page specs (implementation order: U4 → U5 → U6 → U7 → U8 → U9)

Each page differs in hero variant, section rhythm, and layout family. If two pages end up looking alike, you wrote a template — re-read. General rule for all: server-render content; reveal with ScrollReveal; reuse `ClubPage`/`ClubHero`/`Gallery`; read prose from `site_content`, lists from their tables; design for N items and for empty.

---

### 7A. `/despre` — About (U4)

**(a) Generic/AI risk:** the obvious move is centered hero → "Mission / Vision / Values" 3-card grid → "The Rotary Family" 3 equal cards → CTA. That is the slop signature. Refuse it.

**(b) Redesign — an editorial essay, not a card deck.**
- **Hero:** `editorial` variant. Headline carries the mission as the ceremonial serif accent: e.g. `Servim comunitatea, **prin acțiune.**` (the serif-italic accent is the verb phrase; the rest Manrope 800). Kicker: a mono founded-year (`DIN 20XX`). Lead ≤22 words: who Interact Sf. Sava is in one sentence. CTA: `Vezi proiectele →` (same-register text link, not gradient).
- **Section 1 — Who we are:** a two-column asymmetric block (text 7 / motif or single real photo 5), prose from `site_content` key `about_intro`. NOT a card. Lead paragraph + body, ≤68ch.
- **Section 2 — Values:** the values are a club's character — render them as a **typographic list, not a grid**: each value = a large Manrope-700 value word + a one-line body, stacked with `--im-line-soft` hairline dividers, revealed as a staggered `Reveal` band with `.rstag`. 3–5 values from `site_content`. No icon tiles, no boxes.
- **Section 3 — Familia Interact / Rotaract / Rotary:** this is the one place three peers genuinely exist, but render them as a **horizontal age-ladder, not 3 identical cards**: a single band with three tiers along a connecting hairline, each tier = name + age range (`Interact 12-18` · `Rotaract 18-30` · `Rotary 30+`) + one line of role. Differentiate the three visually by depth (ink-2 / ink-3 surfaces) and a cyan accent that strengthens toward Rotary, so the eye reads progression, not repetition. Mobile: vertical ladder with a left connecting line.
- **Section 4 — Impact band (the one count-up):** a full-width band, ink-2 surface, 3–4 impact numbers via `CountUp` (years active, projects run, beneficiaries reached, funds raised in RON) in mono cyan `clamp(40px,6vw,72px)` with a mono label beneath each. Numbers come from data/`site_content`, never hardcoded fake-precise values. This is the page's single hero-metric moment, placed in the body where it is earned.
- **CTA band:** cross-register — `Devino membru` gradient button (the recruitment crossing) + a quiet `Vezi echipa →` text link.

**(c) Do not touch:** `site_content` keys/fetch, ISR/`updateTag` wiring, metadata.

**(d) Done looks like:** zero card grids; exactly one serif accent (hero); the family is a ladder not 3 cards; one count-up band; all prose ≥ `--im-fg-2`; reveals fire on scroll; builds clean.

---

### 7B. `/echipa` — Team (U5)

**(a) Generic/AI risk:** identical square avatar cards in a uniform grid with name + role + social icons under each — the textbook "team page" slop.

**(b) Redesign — a masthead, not an avatar wall.**
- **Hero:** `index` variant. Headline (e.g. `Oamenii din spatele proiectelor.`), lead, inline mono count `{N} membri · {M} în board`.
- **Board (the lead group):** the board is the editorial feature — render board members **larger and asymmetric**: a 2-up or 3-up row of portrait cards where the portrait is generous (`next/image`, 4:5, radius 20), name Manrope 700, role mono label, an optional one-line bio from data. These cards get real presence (ink-2 surface, `--im-line` border). Group heading `Board` (sentence case, no eyebrow). Order by `sort`.
- **Members (the ensemble):** the wider membership renders **denser and quieter** — a `repeat(auto-fill, minmax(150px, 1fr))` grid of small portraits (1:1, radius 14) with name + role beneath, no bio, no per-card socials. The visual contrast between the large board row and the dense member grid IS the hierarchy — same data shape, deliberately two densities. This is what makes it not-a-uniform-grid.
- **Roles/socials:** a member's socials, if present, surface only in a hover/focus state on the small cards (hover-media) or not at all — never an icon row under every face.
- **Empty/edge:** if `active` members = 0, show a calm "Echipa se actualizează." line, no broken grid. If a member has no photo, render a gear-monogram placeholder on `--im-ink-3` (the gear mark, not a generic user icon) — never a Lucide user glyph (slop tell).
- **Motion:** portraits reveal via ScrollReveal `scale` variant; the dense grid staggers by index (cap 6). No hover tilt, no spotlight.

**(c) Do not touch:** `team_members` query, `sort`/`active` semantics, admin CRUD/actions, storage URLs.

**(d) Done looks like:** two visibly different densities (board vs members), not one uniform grid; no per-face social row; photo-less members get the gear monogram; ordered by `sort`; builds clean.

---

### 7C. `/proiecte` (index) + `/proiecte/[slug]` (detail) — Projects (U6)

**(a) Generic/AI risk:** index = 3 identical project cards; detail = hero + body + a uniform thumbnail grid. Both are slop defaults.

**(b) Redesign — INDEX as an editorial portfolio:**
- **Hero:** `index` variant. Headline (`Ce am construit împreună.`), lead, mono count `{N} proiecte · {beneficiari} beneficiari`.
- **Featured + rest rhythm:** the most recent / `sort`-top project is a **full-width featured row** (cover image left 6 / story teaser right 6, asymmetric, large) — distinct layout family from the rest. Below it, the remaining projects render as an **editorial mosaic** via `ProjectCard`: a `repeat(auto-fill, minmax(300px, 1fr))` grid but with varied cell heights (alternate 4:3 and 3:4 covers by index) so it reads as a magazine spread, not equal tiles. `design-taste-frontend` §4.7 zigzag cap + layout-repetition rules honored: featured row appears once, the mosaic once.
- **`ProjectCard`:** cover `next/image` (lazy below fold, `sizes` set), title Manrope 700, a mono meta line `{date_label} · {beneficiary}`, an optional real category tag (mono label, only if `category` is a genuine filter). Hover (hover-media): cover `scale(1.02)` inside `overflow:hidden` + `→` nudge on the title. No fake button inside the card; the whole card is the `<Link>`.
- **Empty:** if 0 published projects, a composed empty state (gear watermark + "Primele proiecte apar în curând." + a `Devino membru →` CTA), never a blank grid.

**Redesign — DETAIL `/proiecte/[slug]` as a story:**
- **Hero:** `cinematic` variant, the project `cover_path` full-bleed with left scrim, `.anim-zoom-settle`. Headline = project title; kicker = mono `{date_label}`; lead = `summary`.
- **Fact rail:** directly under the hero, a single horizontal mono fact strip (NOT cards): `LOCAȚIE {location}` · `BENEFICIAR {beneficiary}` · `PERIOADĂ {date_label}` · (if `category`) `DIRECȚIE {category}`, separated by `--im-line-soft` vertical hairlines, mono labels + Manrope values. These are data labels (sanctioned).
- **Story body:** `body` prose rendered from markdown (the project plan stores `body`), single column max 68ch, lead paragraph at 18px, `text-wrap: pretty`. Generous rhythm. A single optional pull-quote MAY use the Instrument-Serif accent — but only if the hero did not (one serif moment per page; the cinematic hero headline is Manrope, so a serif pull-quote is allowed here).
- **Gallery:** the `Gallery` component (6.4) with the project's `gallery` images. Editorial mosaic + lightbox.
- **Linked event (the register crossing):** if `event_id` is set and the event is live, a cross-register CTA band: `Vezi biletele →` gradient button into the light `/[slug]` flow. This is the designed dark→light seam (Section 4.2).
- **Prev/next:** a quiet bottom rail linking the adjacent projects by `sort` (same-register text links).
- **Edge:** unknown slug → `notFound()`; unpublished → `notFound()` for anon (data layer handles it; design just renders the 404, which already has the gear watermark).

**(c) Do not touch:** `projects` queries, slug routing, `published`/`event_id` gating, ISR/`updateTag`, admin CRUD, storage.

**(d) Done looks like:** index has a featured row + a varied mosaic (two layout families), not equal tiles; detail has a mono fact rail not cards; gallery is a mosaic with a `<dialog>` lightbox; the linked-event CTA is the only gradient button and it crosses to light; ≤1 serif moment; builds clean.

---

### 7D. Landing teasers (`app/page.tsx` append + `components/club/LandingTeasers.tsx`) — U7

**(a) Constraint:** append-only React BELOW `.sp-immersive-root`. Never edit the verbatim port, `content.ts`, or the extractor. Re-run `scripts/verify-mobile-immersive.mjs` after. The teasers must read as a continuation of the immersive scroll (same dark skin), then hand off into the club pages.

**(b) Redesign — 2-3 crafted teaser bands, each routing into a deep page (NOT mini-versions of the deep pages):**
- **Impact strip:** a slim full-width band, ink-2, the same `CountUp` impact numbers as `/despre` (years · proiecte · beneficiari · RON). One line of facts that proves substance after the cinematic intro. Links to `/despre`.
- **Featured projects rail:** a horizontal scroll-snap rail (NOT a grid; the landing can afford one rail) of 3-4 `ProjectCard`s pulled live from `projects` (top by `sort`), with a `Toate proiectele →` text link. Scroll-snap pills/cards, lazy images. This is the one place a rail is allowed; it does not duplicate the index's mosaic.
- **Join-the-family block:** an editorial recruitment band — a short headline (one serif accent allowed here IF the immersive port above did not already spend a serif moment; the port is verbatim and uses its own type, so a single serif accent in the teaser is fine), one line, and the cross-register `Devino membru` gradient CTA + a `Despre noi →` text link.
- Motion: these are below-fold, so each band reveals via ScrollReveal (`.anim-rise`). The teasers are NOT inside `.sp-immersive-root`, so ScrollReveal handles them (the engine ignores them). No new GSAP, no marquee (the port already has its marquee).

**(c) Do not touch:** the immersive markup/engine, `page.tsx`'s ISR/`activeSlug` timeout, the extractor.

**(d) Done looks like:** 2-3 bands appear below the immersive scroll in the same dark skin; live data; ScrollReveal fires; the immersive engine + landing are byte-identical (`verify-mobile-immersive.mjs` green, zero console errors); `/` still prerenders.

---

### 7E. `/sponsori` — Sponsor wall (U8)

**(a) Generic/AI risk:** a uniform 4-col logo grid with a category label under each logo (the LOGO-ONLY rule violation) and decorative dots.

**(b) Redesign — a tiered recognition wall, weighted by tier.**
- **Hero:** `index` variant, compact. Headline (`Cei care fac proiectele posibile.`), lead thanking partners, mono count `{N} parteneri`.
- **`SponsorWall` by tier:** group sponsors by `tier` (e.g. principal / aur / argint / partener). Tiers are **visually weighted, not uniform**: the top tier renders as large logo plates (generous size, ink-2 surface, real `next/image` logos) in a 2-3 wide row; lower tiers render progressively smaller in denser rows. A tier heading (sentence case, e.g. `Parteneri principali`) precedes each group; the tier name may also appear as a mono data label. No category/industry label under any logo (LOGO-ONLY rule). Logos link to the sponsor `url` (new tab, `rel`), hover lift only.
- **Logo treatment on dark:** logos on `--im-ink-2` plates with adequate padding; if a logo needs a light backing to be legible, give that single plate a `--im-paper` (light) inner card with rounded corners — a deliberate, contained light chip inside the dark page (this is allowed because it is a logo container, not a section inversion). Keep it consistent across all logos in a tier.
- **Empty:** if 0 active sponsors, a single line `Devino partener →` linking to `/contact`, no empty grid.

**(c) Do not touch:** `sponsors` query, `tier`/`sort`/`active`, admin CRUD, storage.

**(d) Done looks like:** tiers are visibly weighted (size), not one uniform grid; no industry labels under logos; logos are real images with legible backing; links open the sponsor site; builds clean.

---

### 7F. `/contact` — Contact (U8)

**(a) Register decision (the plan's open question, resolved):** `/contact` stays in the **dark identity register** for cohesion — it is the public face, not a checkout. BUT the form fields themselves use the calm, high-contrast treatment so the form never feels hostile on dark.

**(b) Redesign — an asymmetric two-column: invitation + form.**
- **Hero:** `editorial` variant, short. Headline (`Hai să vorbim.`) — note: this is a contact intent; per `design-taste-frontend` §4.5 "no duplicate CTA intent," use this one contact label consistently and do not also say "Scrie-ne" / "Ia legătura" elsewhere on the page.
- **Left column — the human side:** real contact details from `site_content` — address, email, phone, socials (Lucide icons), and an Instagram/Facebook line. Mono labels for each (`EMAIL`, `ADRESĂ`). One short paragraph inviting messages. This is where the page's warmth lives.
- **Right column — the form:** name / email / message, labels ABOVE inputs (never placeholder-as-label), inputs styled for dark (`background: var(--im-ink-2)`, `border: 1px solid var(--im-line)`, text `--im-fg`, placeholder `--im-fg-3`, focus border `--im-cyan` via the existing `.theme-immersive .input` rules — reuse the `.input` class). Helper text present; error text BELOW each input in `--danger`. The honeypot field is visually hidden (reuse the membership pattern). Submit = gradient button `Trimite mesajul →` (this is a same-page action, not a register crossing, but the gradient is fine for the page's single primary action).
- **States (full cycle, mandatory):** idle / submitting (button shows the gear `.anim-spin-slow` + "Se trimite…") / success (the form swaps to a composed success panel with a Lucide `MailCheck` in a cyan circle, `.anim-pop`, "Mesajul a ajuns. Revenim curând.") / error (inline, `.anim-fade`; never shake a contact failure — the user did nothing wrong). Mirror the membership posture: a failed best-effort email never blocks the stored message.
- **Form contrast:** every input, placeholder, label, focus ring, helper, and error must clear WCAG AA on the dark surface. Placeholder `--im-fg-3` is acceptable for placeholder hints only (not labels).

**(c) Do not touch:** `contact_messages` insert, the `contact/actions.ts` server action, field `name`s, honeypot logic, zod schema, best-effort email, `site_content` fetch.

**(d) Done looks like:** dark register, asymmetric invitation+form, labels above inputs, all four states implemented, AA-contrast form, one contact label across the page, builds clean.

---

### 7G. `/district` — Rotary District 2241 (U9)

**(a) Generic/AI risk:** a dry "about the district" text page, or a uniform conference-photo grid. Make it feel like a field report.

**(b) Redesign — context + field galleries.**
- **Hero:** `cinematic` variant, a conference/trip photo full-bleed with scrim, `.anim-zoom-settle`. Headline (`Parte dintr-o rețea mai mare.`), kicker mono `DISTRICT 2241`, lead one line of context.
- **Context section:** prose from `site_content` (`district_body`) explaining District 2241 and Interact Sf. Sava's place in it — single column, 68ch, generous rhythm. A single mono fact line may carry concrete data (`{N} cluburi · {regiune}`) if available — real data only.
- **Galleries:** TWO labeled `Gallery` instances — `Conferințe` and `Excursii / teambuilding` — each a mosaic with the `<dialog>` lightbox, fed from `site_content`/storage galleries. Distinct headings; the two galleries differ only by content, which is fine here because they are explicitly two named collections (not a repeated layout family — galleries are a content component, used at most twice with clear labels).
- **No map widget / no embed** in v1 (the plan defers embeds); if a static district image exists in storage, render it as a single framed image, not an interactive map.
- **Empty:** if a gallery is empty, omit that whole labeled section (no empty frame).

**(c) Do not touch:** `site_content`/storage fetch, ISR/`updateTag`, metadata.

**(d) Done looks like:** cinematic hero, field-report prose, two clearly-labeled galleries with lightbox, real data only, empty galleries omitted, builds clean.

---

## 8. Accessibility + performance notes (R5, binding)

- **Images:** every content image is `next/image` with explicit `width`/`height` or `fill`+`sizes` (no CLS). Hero/cover images that are the LCP element get `priority`; below-fold gallery/teaser images get `loading="lazy"`. Storage assets must be reasonably sized before upload (the admin should constrain; the design assumes sized assets). Always meaningful `alt`.
- **Motion respects the existing posture (ruling 3.9):** inherit the forced-on system; don't add suppressors; don't regress the `sr-on` gate or its 4s failsafe. Content is server-rendered visible; reveals enhance.
- **Keyboard + focus:** the `<dialog>` lightbox is keyboard-operable (Esc, arrows) and focus-trapped. Every interactive element shows the existing `.theme-immersive :focus-visible` ring (cyan halo). Nav `<details>` disclosure is keyboard-operable already.
- **Contrast:** Section 6.1 floors are mandatory; audit every text-on-image hero and every form.
- **CWV:** no per-page GSAP (KTD3 protects TBT); no animated `filter`/`blur`/`height` on many elements; the only `width` transition is a single meter rendered once. Club pages are ISR/cacheable (KTD7) — design for static render + revalidate-on-edit; nothing here requires client data fetching.
- **Touch targets:** interactive controls ≥ 44px on coarse pointers (reuse the `.tap` helper); CTAs full-width on mobile in flow contexts.
- **SEO:** per-page `generateMetadata` (title/description/OG image from cover/hero or a club default). Headings are real `h1`/`h2`/`h3` in order; one `h1` per page (the hero).

---

## 9. Hard rules for implementers (numbered, distilled)

1. **Frozen tokens.** Never edit/remove any value in `app/globals.css`. Add only what Sections 4.1 / 5 specify, namespaced `cl-`. Color comes ONLY from `--im-*` or the semantic aliases — zero new hex.
2. **Visual layer only.** Never modify server actions, `route.ts`/`api/`, data fetching + selected columns, RLS, auth/role checks, redirects, form field `name`s, hidden inputs, `lib/`, metadata logic, `proxy.ts`, the immersive port/engine/extractor. If a visual idea needs new data, drop the idea or request it as a data-layer unit.
3. **Banned patterns (match → rewrite with different structure):** identical card grids (team, projects, sponsors, family — every one is specified as non-uniform); the hero-metric stat strip inside any hero; eyebrow/uppercase-tracked label above any heading; numbered section markers (`01/02/03`); `background-clip: text` gradient text; colored side-stripe borders (`border-left/right` > 1px as accent); backdrop-filter/glassmorphism by default; page-level gradient backgrounds (the gradient lives on CTA fills only); a second serif moment on a page (one max); decorative status dots; scroll cues; locale/weather/time strips; version stamps; photo-credit captions on stock/placeholder images; div-based fake screenshots; Lucide user-icon avatar placeholders (use the gear monogram); `scale(0)` entrances (floor 0.92); `ease-in` on anything; `transition: all`; animating `width`/`height`/`margin`/`top`/`left`/`filter` on multiple elements (transform/opacity only; the one meter bar is the sole `width` exception, rendered once); `window.addEventListener("scroll", …)`; new GSAP/Motion scenes (KTD3); editing the verbatim landing port.
4. **Contrast floors (WCAG AA):** body/prose ≥ 4.5:1 — on dark that means `--im-fg` or `--im-fg-2`, NEVER `--im-fg-3` for sentences; cyan text under 18px uses `--im-cyan-light` on ink; hero text over a photo must clear 4.5:1 via the scrim; every form input/label/placeholder/error passes AA.
5. **Type discipline:** the Section 6.1 scale only. Instrument Serif = one ceremonial accent per page (hero accent phrase OR one pull-quote). Manrope = everything else display/body. JetBrains Mono = data labels, numerals, fact rails. No mixed-family emphasis inside a single phrase except the sanctioned serif accent.
6. **Motion contract:** reuse ScrollReveal / Reveal / `.anim-*` / `.line-mask` / `.anim-zoom-settle` / `CountUp` only — build no new motion component except a minimal `CountUp` prop tweak. One hero entrance per page; spring (`.anim-pop`) only on success/arrival moments; durations from the 140/220/380 tokens; hover effects inside `@media (hover: hover) and (pointer: fine)`; press = `scale(0.97)`; content visible by default, reveals enhance (never gate visibility outside the existing `sr-on` gate).
7. **Two-register handoff:** the cross-register CTA (`Cumpără bilet`, `Devino membru`, `Vezi biletele`) is the shared gradient button on both sides of the seam; same-register links are quiet cyan text links; no custom dark→light transition animation. One contact intent label per page (no duplicate-CTA-intent).
8. **Voice:** Romanian, sentence case (uppercase only in sanctioned mono data labels), correct diacritics, no exclamation marks, no emoji (use Lucide), money as `N RON`/`N lei`, allowed glyphs `·` `—` (prose pauses only) `→`. Real names, real project descriptions, real beneficiaries, real impact numbers — specificity kills slop. No filler verbs ("Elevate/Seamless/Unleash"), no fake-precise invented numbers (impact figures come from data/`site_content`).
9. **Iconography:** Lucide only, `strokeWidth={1.75}`, `currentColor`, sizes 18/20/24/40. No hand-rolled SVG except the gear + columns marks.
10. **Per-page distinctness:** if your diff makes two club pages (or a club page and the landing) look like the same template, re-read that page's spec — each hero variant + section family is specified. Every list page is explicitly non-uniform.
11. **Build verification:** from `web\`, `npm run build` passes with zero errors before reporting done (fix Turbopack errors one at a time). After U7, also run `scripts/verify-mobile-immersive.mjs` and confirm the immersive engine + landing are unaffected with zero console errors. Do not report done on a red build.

---

## 10. Summary table — hero variant + signature per page (anti-template guard)

| Page | Hero variant | Primary layout family (used once) | Serif moment | Count-up | Gallery | Cross-register CTA |
|---|---|---|---|---|---|---|
| `/despre` | editorial | values typographic list + family age-ladder | hero accent | yes (impact band) | no | Devino membru |
| `/echipa` | index | board (large) vs members (dense) two-density | no | no | no | (footer only) |
| `/proiecte` | index | featured row + varied mosaic | no | no | no (cards) | (per linked project) |
| `/proiecte/[slug]` | cinematic | story column + mono fact rail | one pull-quote | no | yes | Vezi biletele |
| landing teasers | (below port) | impact strip + scroll-snap rail + join band | one accent (teaser) | yes | no | Devino membru |
| `/sponsori` | index | tier-weighted wall | no | no | no | (empty → contact) |
| `/contact` | editorial | invitation + form asymmetric two-col | no | no | no | (form action) |
| `/district` | cinematic | field-report prose + two labeled galleries | no | no | yes ×2 | (none) |

No two rows share a hero variant + layout family + serif/count-up/gallery combination — that is the structural proof these are eight designed pages, not one template.
</content>
</invoke>
