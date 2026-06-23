# SavaPass — REDESIGN SPEC

**Audience:** implementer agents. You read ONLY this file plus your batch's source files. Everything you need from the design doctrines is distilled here — do not read the skill files, do not re-derive rules. Where this spec is silent, follow the existing code's conventions.

**Scope:** visual layer of `web/` (Next.js 16 App Router, Tailwind v4 tokens in `app/globals.css`, inline-style components). All paths below are relative to `C:\Users\cycla\Documents\Bussines\projects\sava-pass\web\`.

---

## 1. Global direction

SavaPass should feel like a well-organized student council with impeccable taste, not a SaaS template: quiet, academic, warm-but-precise. Hierarchy comes from weight and whitespace, never from color; cyan `#009FE3` appears only where you act or where state changes; the Instrument Serif italic appears at exactly three ceremonial moments (landing hero accent word, payment success headline, 404 numeral); everything else is Manrope. Motion is confirmation, not decoration — the app moves when something happened (payment confirmed, scan verdict, row arrived) and settles instantly everywhere else. The ticket is the one theatrical object (Apple-Wallet register, gradient header, spring entrance); admin is a calm desktop tool; the scanner is a dark instrument used at a door at night.

---

## 2. What is frozen (immutable)

Every existing value in `app/globals.css` is frozen — `@theme` block and `:root` block both. That means:

- **Colors:** `--brand-cyan #009FE3`, cyan 50/100/600/700, `--brand-blue #2563EB`, blue 100/700, `--brand-navy #0F172A`, navy-soft, the full slate 50–900 scale, white, success/warning/danger + their 100 tints, all semantic aliases (`--bg-app`, `--fg-primary`, `--border-subtle`, …).
- **Gradients:** `--grad-brand`, `--grad-brand-soft`, `--grad-night` exactly as defined.
- **Fonts:** Manrope (UI), Instrument Serif (display, italic accent only), JetBrains Mono (codes/numbers). Loaded via `next/font` in `app/layout.tsx` — do not change weights/subsets.
- **Radii:** 6 / 10 / 14 / 20 / 28 / pill. Buttons+inputs 14, cards 20, ticket/hero 28, chips pill, smallest 6. Nothing square.
- **Shadows:** xs/sm/md/lg (blue-tinted) and `--shadow-brand` (the primary button's one license to glow).
- **Easings/durations:** `--ease-out cubic-bezier(0.22,1,0.36,1)`, `--ease-spring cubic-bezier(0.34,1.56,0.64,1)`, 140 / 220 / 380 ms.
- **Brand marks:** the rotary gear (drawn in `components/ui/Logo.tsx`) and the columns/temple logo JPEGs. Never redraw, never restyle the geometry.
- **Routes, slugs, form field `name`s, server actions, data fetching, auth, redirects, `lib/`** — untouchable (see Hard Rules).

You may **add** tokens, keyframes, and utility classes (Section 4 defines exactly which). You may not edit or remove any existing token.

---

## 3. Resolved doctrine conflicts (these decisions are final)

The project constitution (PRODUCT.md §3) wins over generic design doctrine. Where they collided, here is the ruling:

1. **Eyebrows.** PRODUCT.md sanctions tiny uppercase tracked labels ("DOORS 19:00", "USED") as brand voice; doctrine bans the eyebrow-above-every-section scaffold. **Ruling: an eyebrow may label DATA, never a HEADING.**
   - **Survive:** field labels in info grids (DATA / LOCUL / PORTI / PRET), status words (USED, DRAFT), table column headers, the ticket header's document label `BILETUL TĂU` (a real-world ticket carries an all-caps artifact label — that is voice, not scaffold), tiny labels inside stat cards on staff dashboards.
   - **Die everywhere:** the `<Eyebrow>` sitting above an `h1`/`h2` as section taxonomy. Concretely delete: `CUM FUNCȚIONEAZĂ`, `EVENIMENTE`, `DESPRE INTERACT`, `CE FACEM` (landing); `DESPRE EVENIMENT`, `PROGRAMUL SERII`, `BILETUL INCLUDE` (event page); `PLATĂ SECURIZATĂ` (checkout); `CONTUL MEU` (conta); `ADMIN`, `EVENIMENTE`, `ECHIPĂ`, `EDITOR`, `STATISTICI` (staff). Headings stand alone, sentence case.
2. **Em dash and middle dot.** Doctrine bans `—`; PRODUCT.md explicitly sanctions exactly three glyphs: `·` separator, `—` em dash, `→` arrow. **Ruling: the three glyphs stay legal.** Date strings keep the constitutional format (`Vin · 14 Nov · 19:00`). But prefer `·` over `—` in label·price pairs (`Cumpără bilet · 45 RON`), and never use `—` as a decorative flourish.
3. **Instrument Serif.** Doctrine bans it as an AI-default serif; here it is the committed brand display font (PRODUCT.md). **Ruling: it stays, restricted to the three ceremonial uses** listed in Section 1, plus event subtitle italics where they already exist. Never in buttons, body, or staff surfaces.
4. **Lucide.** Doctrine prefers other icon sets; PRODUCT.md specifies Lucide. **Ruling: Lucide only, `strokeWidth={1.75}` standardized everywhere** (several call sites currently use 2 or 2.2 — fix them). Sizes 20 dense / 24 standard / 40 empty-state.
5. **Backdrop blur.** PRODUCT.md allows blur in exactly one place (the ticket screen). Current code blurs four nav bars and the scanner chrome. **Ruling: remove `backdropFilter` everywhere.** Sticky chrome becomes solid translucent: light surfaces `rgba(255,255,255,0.95)`, the event-page nav `rgba(248,250,252,0.95)`, scanner dark chrome `rgba(2,6,23,0.88)`. The ticket screen's blur license goes unused — a license is not an obligation, and the ticket has nothing to blur over.
6. **Dark scanner.** PRODUCT.md says light mode only and bans page-level gradient backgrounds; the scanner ships dark with a radial gradient page bg. **Ruling: the scanner stays dark** (it is an instrument wrapped around a live camera feed, used at a door at night — light chrome there would be glare), **but the radial gradient page background becomes flat solid `#0F172A`**. This is the single dark surface in the product and the exception is now documented.
7. **Decorative dots.** Chip dots survive only when they encode real state (ticket status, event status, low-stock warning, live-connection indicators). Informational chips (date labels, archive markers) render `dot={false}`.
8. **Numbered steps.** The numbered-section ban does not apply to "How it works" on the landing — it is a genuine 3-step sequence, so the numbers carry information. They survive there and nowhere else.
9. **Hero metrics.** The hero stat strip (264 bilete / 13.5k RON / ediții) is the banned hero-metric template AND the numbers are hardcoded. It dies in the hero. The About section keeps one quiet typographic stat treatment (Section 6, Batch A).

---

## 4. Motion system (installed in `app/globals.css` during Batch A)

Zero new dependencies. Pure CSS keyframes/transitions + one tiny IntersectionObserver component. No motion library.

### 4.1 New tokens (append to `:root`; do not touch existing lines)

```css
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* on-screen movement only */
--stagger-step: 60ms;
--z-sticky: 10; --z-cta: 20; --z-nav: 30; --z-overlay: 40;
```

### 4.2 Keyframes (append)

```css
@keyframes sp-rise   { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes sp-fade   { from { opacity: 0; } to { opacity: 1; } }
@keyframes sp-pop    { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
@keyframes sp-ring   { from { transform: scale(0.6); opacity: 0.9; } to { transform: scale(1.45); opacity: 0; } }
@keyframes sp-shake  { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
@keyframes sp-pulse  { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(0.82); } }
@keyframes sp-spin   { to { transform: rotate(360deg); } }
@keyframes sp-flash  { from { background-color: var(--brand-cyan-50); } to { background-color: transparent; } }
@keyframes sp-scanline { 0%,100% { transform: translateY(-96px); opacity: 0.25; } 50% { transform: translateY(96px); opacity: 1; } }
```

**Invariant: every one-shot keyframe ends at the fully visible resting state.** The existing global reduced-motion block (`animation-duration: 0.01ms !important`) then degrades every one-shot animation to "instantly at rest" for free. Never write a keyframe whose final frame hides content.

### 4.3 Utility classes (append)

| Class | Definition | Use | Never use |
|---|---|---|---|
| `.anim-rise` | `animation: sp-rise var(--dur-slow) var(--ease-out) both` | Above-the-fold load-in: hero elements, auth cards, ticket card, success sequence | On hover, on rapid-repeat UI |
| `.anim-rise-fast` | same, `var(--dur-base)` | Small items: form rows, list rows, chips | — |
| `.anim-fade` | `animation: sp-fade var(--dur-base) ease both` | Crossfades, overlays, error banners | — |
| `.anim-pop` | `animation: sp-pop var(--dur-slow) var(--ease-spring) both` | Success moments ONLY: success check, scan verdict, "sent" confirmation | Regular UI (no spring outside success) |
| `.anim-shake` | `animation: sp-shake 160ms ease-in-out 2` | Hard errors: invalid scan, failed login, error banner appearance | Warnings, empty states |
| `.ring-pulse::after` | absolutely-positioned inherited-radius ring (`box-shadow: 0 0 0 2px currentColor` or 2px border), `animation: sp-ring var(--dur-slow) var(--ease-out) both` | Scanner OK verdict, payment success ring (host element needs `position: relative`) | Anything that is not a success confirmation |
| `.anim-pulse-dot` | `animation: sp-pulse 2s var(--ease-in-out) infinite` | Live-state dots only: ticket LiveClock dot, scanner "scanning" dot, admin live-tab dot | Decorative dots (those don't exist anymore) |
| `.anim-spin-slow` | `animation: sp-spin 1.2s linear infinite` | The gear-logo loader (success page polling), button spinners | — |
| `.anim-flash` | `animation: sp-flash 1s var(--ease-out) both` | New realtime row arriving in admin scan log | — |
| `.anim-scanline` | `animation: sp-scanline 1.5s ease-in-out infinite` | Scanner sweep line only | — |
| `.anim-stagger > *` | `animation-delay: calc(var(--i, 0) * var(--stagger-step))` | Parent of staggered `.anim-rise(-fast)` children; set `style={{ "--i": n } as React.CSSProperties}` per child; cap n at 6 | Lists longer than ~8 items (cap the delay, let the rest land together) |
| `.pressable` | `transition: transform var(--dur-fast) var(--ease-out); &:active { transform: scale(0.97); }` | Every button, chip-button, tappable card | — |
| `.hover-dim` | inside `@media (hover: hover) and (pointer: fine)`: `transition: filter var(--dur-fast) ease; &:hover { filter: brightness(0.96); }` | Solid-fill buttons/links (4% darker, never lighter) | Text links (use color shift to cyan-700 instead) |
| `.row-hover` | inside same hover media query: `&:hover { background: var(--slate-50); }` | Desktop table rows | Mobile surfaces |
| `.input` | `transition: border-color var(--dur-fast) ease; &:focus { border-color: var(--brand-cyan); }` | All text inputs/selects/textareas (global `:focus-visible` ring already provides the cyan halo — delete per-field JS focus handlers) | — |

### 4.4 Explicit reduced-motion overrides (append after the existing block)

```css
@media (prefers-reduced-motion: reduce) {
  .anim-pulse-dot, .anim-spin-slow, .anim-scanline, .ring-pulse::after { animation: none !important; }
}
```

One-shot utilities need no override (the existing global block completes them instantly at the visible end state). Infinite ones must die explicitly, as above. Spinners: when the spinner is hidden under reduce, the accompanying text ("Se emite biletul…") must still communicate state — every spinner in this app already has adjacent text; keep it that way.

### 4.5 The scroll-reveal pattern (content visible by default — non-negotiable)

Scroll-triggered reveals use ONE shared client component, created in Batch A:

**`components/ui/Reveal.tsx`** (client). Renders a `<div>` (accept `as`, `className`, `style`, `delay?: number` props) around children. On mount (`useEffect`) it sets `data-armed` on the element, then an IntersectionObserver (`{ once-equivalent: unobserve after fire, threshold: 0.2 }`) sets `data-inview`. CSS in globals:

```css
[data-armed]:not([data-inview]) { opacity: 0; transform: translateY(12px); }
[data-armed] { transition: opacity var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-out); }
@media (prefers-reduced-motion: reduce) { [data-armed]:not([data-inview]) { transform: none; } }
```

Because `data-armed` only exists after JS hydration, no-JS / crawler / headless renders show everything. Never hide content with a server-rendered class. `Reveal` is used ONLY on the landing page (below-the-fold sections) — buyer/staff product surfaces use load-in `.anim-rise` or nothing.

### 4.6 Where motion does NOT go

No animation on: keyboard-driven actions, tab switches in admin (instant content swap; only the underline indicator slides), table sorting, route navigations (Next handles them), hover states beyond the defined dim/lift, anything a staff member sees 100+ times per shift. No parallax, no scroll-jacking, no marquees, no infinite loops outside the three sanctioned ones (pulse-dot, spin-slow, scanline).

---

## 5. Shared components (Batch A work)

### 5.1 `components/ui/Button.tsx` — rework

Current: JS `useState` press tracking, inline-only styles, inline `<style>` keyframe.
- Delete the `pressed` state and all mouse/touch handlers; apply `className="pressable hover-dim"` instead.
- Move the spinner to `.anim-spin-slow` (delete the inline `<style>` tag).
- Keep the exact visual values (primary cyan + `--shadow-brand`, secondary white + 1.5px border, ghost cyan-700) — move them into globals as `.btn`, `.btn--primary`, `.btn--secondary`, `.btn--ghost` classes (padding `14px 22px`, radius `var(--radius-md)`, weight 700, size 16) and have the component compose classes. Keep `style` prop passthrough for layout overrides.
- Add a `size="sm"` variant (`padding: 9px 14px; font-size: 13px`) — staff surfaces use it.
- Disabled stays `opacity: 0.4; pointer-events: none` (move pointer-events in; remove cursor juggling).
- Public API (`variant`, `full`, `loading`, `icon`, button props) must not change — call sites depend on it.

### 5.2 `components/ui/Chip.tsx` — adjust

- Tones and values unchanged. Change `dot` default from `true` to `false`, then set `dot` explicitly at the semantic-state call sites listed per page below. (Grep all `<Chip` call sites in your batch and set `dot` per this spec.)
- Add optional `size="sm"` (font 11, padding `3px 8px`) for table cells.

### 5.3 `components/ui/Eyebrow.tsx` — keep, narrow the role

Visuals unchanged (11px, 700, +0.14em, cyan-700 default). Its only legal use after this redesign: data labels and the ticket's `BILETUL TĂU`. Every `<Eyebrow>` directly above an `h1`/`h2` gets deleted by the page specs below. Do not delete the component.

### 5.4 `components/ui/Logo.tsx` — one micro-interaction

Geometry untouched. Wrap the `<svg>` so a parent with class `.logo-spin` rotates the gear (svg only, not the wordmark) `transform: rotate(45deg)` on hover, `transition: transform var(--dur-slow) var(--ease-out)`, gated by the hover media query. Apply `.logo-spin` on the `<Link href="/">` wrappers in navs (landing, conta, event page). It is a gear; it turns. Under reduced motion the global block makes it instant — acceptable.

### 5.5 New: `components/ui/Reveal.tsx`

As specced in 4.5. Landing page only.

### 5.6 New: `components/ui/GearWatermark.tsx`

Server component. Renders the same gear SVG geometry as Logo (copy the path math, scale up) at `width/height ≈ 280`, `color: var(--slate-300)`, `opacity: 0.08`, `position: absolute`, `pointer-events: none`, `aria-hidden`. Used on empty states, 404 and error pages ONLY (PRODUCT.md license). Never on tickets, never on chrome.

### 5.7 New (Batch B): `components/ui/LiveClock.tsx`

Client component for the ticket screen: a row with a 8px cyan dot (`.anim-pulse-dot`) + current time `HH:MM:SS` in JetBrains Mono 13px slate-500, ticking via `setInterval` 1s. Purpose: door staff can verify the ticket is live, not a screenshot (the DICE pattern). Under reduced motion the dot is static but the clock still ticks (it is information, not decoration). Render `null` until mounted to avoid hydration mismatch.

---

## 6. Per-page specs (implementation batch order)

General note for all pages: pages are inline-style based; keep that approach. Use the new global classes via `className` for anything needing pseudo-states or keyframes. Standardize every Lucide icon to `strokeWidth={1.75}`. Bump any informational text using `--slate-400` to `--slate-500` minimum (contrast floor); `slate-400` survives only on true decoration.

---

### BATCH A — Landing + shared system (brand register, desktop-first)

Files: `app/page.tsx`, `app/layout.tsx`, `components/ui/*`, `app/globals.css` (motion install).

#### `app/layout.tsx`
Untouched except: nothing needed. Fonts, metadata, html/body structure stay exactly as-is. (Metadata strings are SEO surface — frozen.)

#### `app/page.tsx`

**(a) What reads as AI now:** eyebrow above every section (4×); two separate 3-identical-card grids both using the same 44px gradient-icon tile (the 2023 SaaS signature); hero stat strip (banned hero-metric template, hardcoded numbers); the navy stat card duplicating the same numbers again; trust band as 4 identical icon columns; "PAS 1/2/3" micro-labels; a third gradient CTA block inside the event card (duplicate CTA intent); dead `#` nav links; zero motion anywhere; blurred nav.

**(b) Redesign:**

- **Nav:** solid `rgba(255,255,255,0.95)` (no blur), `zIndex: var(--z-nav)`. Logo link gets `.logo-spin`. The three nav links point to real anchors: add `id="evenimente"` to the events section, `id="despre"` exists, add `id="cum-functioneaza"` to How-it-works; reorder links to match page order (Evenimente, Cum funcționează, Despre Interact). Links get `.hover-dim`-style color shift to `--brand-navy` on hover (color transition 140ms, not filter). Both right-side pills get `.pressable`; the navy CTA also `.hover-dim`.
- **Hero:** keep the grid, the badge pill, the 3-line headline with the serif-italic `Interact.` accent (this is the brand signature — untouchable), and the sub-paragraph. **Delete the `HeroStat` strip entirely** (and the `HeroStat` component). Load choreography (pure CSS, no Reveal): badge, h1, paragraph, CTA row get `.anim-rise` with inline `animationDelay` 0 / 60 / 120 / 180ms. CTAs: primary keeps the gradient + glow (its license), add `.pressable .hover-dim`; secondary `.pressable`.
- **PosterStack:** entrance — each poster gets `.anim-pop` with delays 0 / 90 / 180ms so the fan deals itself once on load. Hover (hover media query only): the hovered poster `transform: rotate(0deg) translateY(-6px)` over `var(--dur-base) var(--ease-out)` — it straightens and lifts. Implement by moving the rotation transforms to a CSS class per index or inline `--rot` custom property so hover can override. Keep shadows/borders as-is.
- **TrustBand:** kill the 4-column icon-card feel. New form: a single slim strip (same slate-50 band) with the four items inline-flex, separated by 1px × 24px hairlines (`--slate-200`), icon 16px `--slate-400` inline before the title, title 13/600 navy, sub joined with `·` after it in 12/`--slate-500` (`Plată securizată · Stripe`). One quiet line of facts, not four mini-cards. Wrap the band in `<Reveal>` (fade only — pass a className that omits the translate, or accept the 12px rise; rise is fine). Mobile: 2×2 grid, hairlines hidden.
- **HowItWorks:** delete the Eyebrow and the right-floating paragraph (banned split-header float — fold its sentence "Fără cont, fără aplicații de instalat. Doar email-ul tău și un card." in under the h2 as a normal sub-paragraph, max-width 480). **Delete the card boxes and gradient icon tiles.** New layout: 3 columns on a transparent background separated by whitespace; each step = mono numeral (`01` `02` `03`, JetBrains Mono, 15px, 700, `--brand-cyan-700`) above a 20px Lucide icon in plain `--brand-navy`, then title (17/700), then body (14, `--slate-600`). Between columns, a 1px horizontal connector line (`--slate-200`) at numeral height (pseudo-element or grid row) so the three read as one flow. The numerals earn their place — this is a real sequence. Mobile: vertical stack, connector becomes a left vertical line. Wrap section content in `<Reveal>`; columns are `.anim-stagger` children (`--i` 0/1/2) using `.anim-rise-fast` — but ONLY via the data-armed pattern (Reveal arms the parent; children transition with `transition-delay: calc(var(--i)*var(--stagger-step))` instead of animation; simplest: put the stagger delay on the child transitions under `[data-armed]`).
- **EventsGrid:** h2 stays, eyebrow dies. Group labels `EVENIMENTUL CURENT` / `ARHIVĂ` become sentence-case 13px/700 `--slate-500` ("Acum la vânzare" / "Edițiile trecute"). Featured card: layout stays; the inner gradient "Cumpără bilet — 45 RON" block (a fake button inside a link, third buy-CTA on the page) becomes a bottom row: price in JetBrains Mono 22/700 navy (`45 RON`) left, right an inline text-CTA `Cumpără bilet →` in 15/700 `--brand-cyan-700`, arrow translates 3px right on card hover. Card hover (hover media): `box-shadow: var(--shadow-md)`, image `scale(1.02)` over `var(--dur-base)` (wrap image in overflow-hidden, transition transform only). Info mini-grid labels (Data/Locul/Porți/Preț) keep their uppercase data-label styling — that is sanctioned voice. Past cards: keep poster-led cards; change chip to `<Chip tone="used" dot={false}>Încheiat</Chip>`; same hover lift + image scale; date line stays. Wrap the two groups in `<Reveal>` blocks.
- **AboutInteract:** eyebrows die (`DESPRE INTERACT`, `CE FACEM`). The h2 loses its serif italic line — replace `Student-run. / Impacte reale.` with one Manrope-800 heading, e.g. `Condus de elevi, cu impact real.` (serif is rationed to the hero on this page). Mission paragraph + social buttons stay (social buttons get `.pressable`, hover border `--slate-300`). **Delete the navy stat card.** Replace with a quiet stat ledger directly under the mission paragraph: one row, four entries inline (wrap on mobile), each = JetBrains Mono 24/700 navy number + 12px `--slate-500` sentence-case label below; entries separated by 24px gaps and hairlines. Same numbers as today (3+ ani, 264 bilete, 13.5k RON, 100% fonduri) — they appear exactly once on the page now. **Pillars:** delete the 3-card grid + gradient tiles. New form: three rows in a single column (max-width 560), each row = 20px Lucide icon in `--brand-cyan-700` + one merged line: `<strong>Cultural.</strong> Concerte acustice, baluri…` (title bolded inline, body continues), 15px/1.6, hairline (`--slate-100`) between rows. A list of what the club does, not a feature grid. Place it in the right column where the navy card was (desktop: mission left, pillars right — an asymmetric two-column section, different layout family from steps and events). Membership CTA link stays, gets `.pressable`, arrow `→` inline.
- **SiteFooter:** keep. Add a 14px gear (Logo without wordmark) before the © line, links get hover color shift. No other change.

**(c) Do not touch:** data fetching (`getActiveEvent`, `getPastEvents`, supabase auth check), all hrefs/routes, metadata, the GDPR-adjacent absence of cookie banners, `priceRon` usage, event accent plumbing.

---

### BATCH B — Buyer flow (product register, mobile-first, content column max-width 440px)

Buyer pages narrow their content column to **440px** (PRODUCT.md mobile max): event sheet, checkout form, success content, ticket card, conta column. The poster hero on the event page may stay at 640px width with the 440px sheet overlapping it — the artifact can outsize the column; text content cannot.

#### `app/[slug]/page.tsx` + `BuyCta.tsx`

**(a) AI tells:** three section eyebrows; blurred nav; decorative chip dots; status chip yelling `EVENIMENTUL CURENT`; no motion at all.

**(b) Redesign:**
- Nav: solid `rgba(248,250,252,0.95)`, no blur; back button `.pressable`; logo `.logo-spin`.
- Poster hero: unchanged structurally (priority image, scrims). Poster chip: `În vânzare` (active) / `Schiță` (draft) / `Arhivă` (past), `dot={false}`, tone dark.
- Content sheet: entrance `.anim-rise` on the sheet container (pure CSS load-in; the page is server-rendered so this runs once on navigation). Width: `maxWidth: 440`.
- Title block unchanged (h1 + serif-italic subtitle — the subtitle italic is existing sanctioned use).
- Info cells: keep — these uppercase labels are the sanctioned data-label voice. Polish: icon `strokeWidth 1.75`, label color stays, value 13/700.
- Seats chip: `dot` stays `true` ONLY when warning (low stock — semantic); the normal "N locuri rămase" brand chip gets `dot={false}`. Sold out: used tone, no dot.
- Sections: eyebrows die. Each section gets a sentence-case heading: `Despre eveniment`, `Programul serii`, `Biletul include` — 16px/800 navy, `margin: 28px 0 10px`.
- Program list: card stays; rows get `.anim-stagger`/`.anim-rise-fast` (cap `--i` at 6). Mono time column stays cyan-accented (use `--brand-cyan-700` if the event accent is too light for 4.5:1 on white — rule: accent text under 18px must use the 700-depth variant; since accents are dynamic, render times in `accent` but with `fontWeight 700` at 13px and accept large-text rules only if accent is the default cyan; safest uniform call: times in `--brand-navy`, the left hairline + heading carry no accent. Implement: times navy 700, keep it calm).
- Perks: pill row stays; check icon color = `--success` (state color, not accent); chips `.anim-rise-fast` staggered.
- Organizer card: keep; label `ORGANIZATOR` is a data label — survives.
- `BuyCta.tsx`: remove blur → `rgba(255,255,255,0.95)`; zIndex `var(--z-cta)`. The link: keep gradient + glow license, add `.pressable`; label becomes `Cumpără bilet · {priceRon} RON` with the price in JetBrains Mono (wrap price in a `<span style={{fontFamily:"var(--font-mono)"}}>`). Sold out block unchanged. Entrance: `.anim-rise` with 120ms delay (it arrives just after the sheet).

**(c) Do not touch:** `getEventBySlug`/`getEventStats` calls and their double-fetch shape, `seatsLeft` logic, metadata/robots, BuyCta's href and props API, draft/active gating.

#### `app/[slug]/checkout/page.tsx`

**(a) AI tells:** eyebrow `PLATĂ SECURIZATĂ`; JS onFocus/onBlur style juggling; generic spacing; no entrance.

**(b) Redesign:**
- Layout: column max 440. Eyebrow dies; h1 `Aproape gata.` stands alone (good voice — keep), 28/800. Directly under it a quiet context line 13px `--slate-500`: `Biletul ajunge pe email imediat după plată.` (replaces the lost eyebrow's reassurance with information).
- Form: fields get `className="input"`, delete the onFocus/onBlur handlers (the global focus ring + `.input:focus` border now do this). Error state stays inline-styled (red border + danger-100 halo). Field rows `.anim-rise-fast` staggered 0/60/120ms on load.
- GDPR checkbox card: keep text EXACTLY (legal copy — frozen). Add `.pressable` on the label, checkbox `accentColor` stays cyan.
- General error banner: add `.anim-shake .anim-fade` when it renders (mount = animation runs).
- Submit Button: shared Button (already), full-width; pending label stays.
- Lock footer line: keep; icon 1.75 stroke. This line plus the context line are the page's trust voice — no badges, no Stripe logos.
- Nav: same solid-no-blur treatment as event page.

**(c) Do not touch:** `createCheckout` action, `CheckoutState` shape, field `name`s (`slug`, `name`, `email`, `gdpr`), hidden input, `useActionState` wiring, GDPR sentence, error message strings.

#### `app/succes/page.tsx` — the ceremony (serif + spring license)

**(a) AI tells:** generic `Loader2` spinner; Manrope h1 where the constitution grants the serif; success elements appear unchoreographed.

**(b) Redesign:**
- **Polling state:** replace `Loader2` with the brand gear: render the Logo's gear svg (no wordmark, 36px, cyan) with `.anim-spin-slow` + text `Se emite biletul…` (text stays; under reduced motion the gear is static and text carries the state). Delete the inline `<style>` spin.
- **Ready state choreography** (all pure CSS `animationDelay`, total ≈ 700ms, runs once):
  1. Ring: the 80px circle keeps `ring-expand`-equivalent via `.anim-pop` (spring) at 0ms, and gets `.ring-pulse` (`color: var(--success)`) so one green ring expands and fades — the same gesture the scanner makes. 380ms.
  2. Check icon `.anim-pop`, delay 120ms.
  3. **H1 becomes Instrument Serif italic:** `fontFamily: var(--font-display)`, `fontStyle: italic`, `fontWeight 400`, 40px, navy, `Ești înăuntru.` — delay 220ms, `.anim-rise`.
  4. Email line `.anim-fade`, delay 320ms.
  5. CTA button `.anim-rise`, delay 400ms; keep gradient + `--shadow-brand`, add `.pressable .hover-dim`.
- **Error state:** calm, no shake (the user did nothing wrong): `.anim-fade`, text + home link as today; add `GearWatermark` behind, centered, since this is an empty/terminal state (sanctioned).
- Delete the inline `<style>` `ring-expand` keyframe (now in globals).

**(c) Do not touch:** the polling logic (15 attempts / 2s), `sessionId` handling, `/api/order-status` call, Suspense wrapper, link targets, copy of error message.

#### `app/bilet/[token]/page.tsx` — the Apple-Wallet moment

**(a) AI tells:** none egregious (this page is already the strongest) — but it is static, the used/void states are timid, and it misses the anti-screenshot liveness cue real ticket apps have.

**(b) Redesign:**
- Card: radius 28 stays; max-width 400 stays (the artifact, not the 440 column). Entrance: `.anim-pop` (spring — the wallet card snaps in once). 
- Gradient header: keep (object license). Add a text-protection layer: an absolutely-positioned `linear-gradient(180deg, rgba(15,23,42,0.18), transparent 70%)` inside the header so white text clears contrast on the light end of the gradient. `BILETUL TĂU` eyebrow survives (artifact document label). Status chip: dots stay (semantic): Valid=success, Folosit=used, Anulat=danger.
- **Used state:** the header gradient swaps to a slate ramp `linear-gradient(135deg, var(--slate-500), var(--slate-700))` — a used ticket visibly loses its color (PRODUCT.md: used = slate-500). QR at `opacity 0.5`.
- **Void state:** keep the overlay; the `ANULAT` overlay label gets `.anim-shake` on load (one hard signal), header gradient stays brand (the event was real; the ticket is not).
- Perforation: keep the notch construction; ensure notch circles use `var(--slate-50)` (they do).
- QR block: under the mono code, insert `<LiveClock />` (Section 5.7) — pulsing dot + ticking `HH:MM:SS`. Caption line `Arată acest cod la intrare` moves below the clock, bump to `--slate-500`.
- Holder grid: labels (PARTICIPANT / EMAIL / CHECK-IN) are data labels — keep uppercase style; values 13/600.
- Footer line `Ne vedem la {venue} · Interact Sf. Sava`: keep (warm voice), `.anim-fade` delay 200ms.
- No backdrop blur is used (see ruling 3.5).

**(c) Do not touch:** `verifyTicket`, the supabaseAdmin fetch, token/QR URL construction, robots metadata, status derivation logic.

---

### BATCH C — Account, auth, system pages

#### `app/conta/page.tsx` (+ `ProfileCard.tsx`, `SignOutButton.tsx`)

**(a) AI tells:** **the 6px gradient side-stripe on ticket cards (hard-banned pattern — must die)**; eyebrow `CONTUL MEU` above an h1 that says "Contul meu" (the same words twice); plain StatBoxes; no motion.

**(b) Redesign:**
- Header bar: keep; logo link `.logo-spin`; SignOutButton: keep behavior, style as quiet text button with hover color shift to `--danger` (140ms) — leaving is allowed to feel slightly consequential.
- Heading: eyebrow dies. H1 becomes a greeting: `Salut, {firstName}.` when `displayName` is non-empty (first word of it), else `Contul meu`. Display-only ternary, no data changes. Email line below, 13 `--slate-500`.
- Stat boxes: keep two, but quiet them — value in JetBrains Mono 24/700, label sentence case 12 `--slate-500` (drop the uppercase tracking here; these read as account facts, not dashboard). `.anim-rise-fast` staggered.
- ProfileCard: inputs get `.input` class; labels keep their small uppercase style (form-field data labels — sanctioned); save button → shared `Button size="sm"` look (navy stays — staff/neutral action color, see 3 note in Batch D intro); success/error message `.anim-fade`.
- Section titles `Active` / `Istoric`: keep, 15/800.
- **TicketCard rebuild (the stripe dies):** card becomes a mini-ticket: white card radius 20, internal layout in two zones separated by a vertical dashed hairline (`border-left: 2px dashed var(--slate-200)`) with two 12px notch circles (bg `--slate-50`) at its top/bottom — the boarding-pass silhouette at list scale. Left zone (flex 1): event title 16/800, date·venue line 13 `--slate-500`, status Chip (dot=true — semantic). Right zone (stub, ~96px, slate-50 bg): mono code 14/700 vertical-centered + `Vezi →` 12 cyan-700. Whole card is the existing Link: add `.pressable`, hover `--shadow-sm` lift (hover media). Cards `.anim-rise-fast` staggered (cap 6).
- Empty state: add `GearWatermark` behind the card content (sanctioned); copy stays; CTA gets `.pressable`.

**(c) Do not touch:** supabase fetch + field list (no adding `photo_url` etc.), redirect to `/conta/login`, ticket filtering/sorting logic, `updateProfile` action and field names, sign-out flow.

#### `app/conta/login/page.tsx` (buyer magic-link)

**(a) AI tells:** **the ✉️ emoji (banned — no emoji in product)**; literal fallback hexes `var(--brand-cyan-100, #e0f7fa)` with WRONG fallback colors; generic card.

**(b) Redesign:**
- Card: `.anim-rise` on load; max 400 stays; radius 24→20 (cards are 20; 24 is off-scale).
- Form state: labels keep uppercase data-label style; input `.input`; footnote `Vei primi un email cu un link de acces · fără parolă.` (swap the `—` for `·`, keep meaning).
- **Sent state:** emoji dies. 56px circle `--brand-cyan-100` with Lucide `MailCheck` 24px `--brand-cyan-700`, `.anim-pop` (a success moment — spring is legal). Title/body stay. "Trimite din nou" stays a text button, add hover shift.
- State swap form→sent: both wrapped containers get `.anim-fade` so the swap reads as a 220ms crossfade (the outgoing state unmounts; the incoming fades in — sufficient).
- Error message: `.anim-shake` on appearance.
- Remove the bogus `var(--x, #fallback)` literals — use the real tokens.

**(c) Do not touch:** `signInWithOtp` call, `emailRedirectTo`, error-param handling, Suspense, copy of error strings.

#### `app/login/page.tsx` (staff) + `app/invite/page.tsx`

**(a) AI tells:** visually identical twins of the buyer login — no register separation; otherwise clean.

**(b) Redesign (both):**
- Same card treatment as conta/login (rise-in, radius 20, `.input` fields, shake on error).
- **Register cue:** a 3px top border on the card in `--brand-navy` (a full-width top edge is not a side-stripe; it is the staff register's quiet uniform), and the submit Button uses a navy fill variant (`background: var(--brand-navy)`, white text, no glow) — staff primary actions are navy throughout (matches existing admin buttons); cyan + glow stays a buyer-facing signature. Implement as `<Button>` with a style override or a `.btn--navy` class added in globals.
- `login`: subtitle `Interact Sf. Sava · SavaPass` keep. `invite`: heading/copy keep.

**(c) Do not touch:** auth calls, role lookup + `staffRedirectForRole`, password update flow, redirects, Suspense wrappers.

#### `app/error.tsx` + `app/not-found.tsx`

**(a) AI tells:** bare centered text blocks; ad-hoc inline buttons instead of the shared Button.

**(b) Redesign:**
- Both get `GearWatermark` (8%, slate-300) absolutely centered behind the content (the sanctioned motif, exactly here).
- `not-found`: the serif italic `404` stays (display-license adjacent: an empty state) — enlarge to 72px; content `.anim-rise`; CTA → shared Button primary `.pressable .hover-dim`.
- `error`: content `.anim-fade` (calm — never shake a system failure at the user); buttons → shared Button primary + secondary. Copy unchanged.
- Both: wrap content in `position: relative` so the watermark layers correctly.

**(c) Do not touch:** `reset()` wiring, links, copy.

---

### BATCH D — Staff (desktop product register, max 1200px)

Register rules for all staff pages: navy is the primary-action color (cyan appears only for live/scan signals and links); typography hierarchy by weight; tables breathe with `.row-hover`; numbers use `fontVariantNumeric: "tabular-nums"` (add to table cells and stat values); motion is minimal and informational. Eyebrows above headings die on every staff page; uppercase table headers and stat-card micro-labels survive (data labels).

#### `app/(staff)/layout.tsx`
Add the shared shell only: `<div style={{ minHeight: "100vh", background: "var(--slate-50)" }}>{children}</div>` so pages stop repeating it (pages keep their own wrappers where removal is risky — optional cleanup, not required). Create **`components/staff/StaffHeader.tsx`** (server component): white bar, bottom hairline, sticky `--z-sticky`, three slots (`left`, `right`, default center = Logo). Refactor the five staff pages to use it. Pure markup dedupe — keep each page's exact links/labels.

#### `app/(staff)/admin/page.tsx` + `AdminClient.tsx`

**(a) AI tells:** eyebrow `ADMIN`; **emoji in `RESULT_LABELS` (✅⚠️❌ — banned)**; four undifferentiated stat cards; static tab underline; realtime rows appear with no acknowledgment; bare "Niciun eveniment activ" dead-end.

**(b) Redesign:**
- Header → `StaffHeader` (nav pills keep labels/targets; Scanner pill keeps cyan fill — it is the "go scan" live action; others stay white/navy; all `.pressable`).
- Title block: eyebrow dies. `h1 {event.title}` 24/800 + meta line. To its right (same row, space-between): a live chip — `<Chip tone="success" dot>Live</Chip>` where the dot carries `.anim-pulse-dot` (semantic: realtime subscription is open).
- Stat cards: keep the 4-card grid (this is a dashboard; metrics are the content). Differentiate inside:
  - "Bilete vândute": add a 4px progress bar under the value (track `--slate-100`, fill `--brand-cyan`, radius pill, `width: {sold/capacity}%`, `transition: width var(--dur-slow) var(--ease-out)` — renders at value, no JS).
  - "Check-in-uri": same bar in `--success` (checkedIn/sold).
  - "Locuri rămase": warning border treatment stays when low.
  - "Venituri": value in JetBrains Mono.
  - All values `tabular-nums`; cards `.anim-rise-fast` staggered 0/60/120/180.
- No-event state: add `GearWatermark`, message + a navy Button link `Creează eveniment` → `/admin/events/new` (visual affordance to an existing route; no logic).
- `AdminClient` tabs: keep instant content swap. The active underline becomes a single shared indicator: each button `position: relative` with a `::after` bar `transform: scaleX(0)` → active `scaleX(1)`, `transition: transform var(--dur-base) var(--ease-out)`, `transform-origin: left`. Tab label for scans keeps the live count.
- **Emoji die:** `RESULT_LABELS` becomes text-only (`OK`, `Deja înăuntru`, `Folosit`, `Invalid`, `Anulat`) rendered next to a 16px Lucide icon (`CheckCircle`/`AlertTriangle`/`XCircle`, stroke 1.75) colored success/warning/danger. Build a small `VerdictLabel` in the same file.
- Realtime scan rows: new rows (anything prepended after mount) get `.anim-flash .anim-rise-fast` — a cyan-50 flash that decays over 1s while the row settles. Track "new" via a `mounted`-time check or simply apply the classes to index-0 rows whose id wasn't in `initialScans` (a `useRef(new Set(initialIds))` — display logic only).
- Tables (both tabs): `.row-hover` on rows; status column in attendees switches from colored uppercase text to `<Chip size="sm" dot>` with the status tone mapping (valid=brand, in=success, used=used, void=danger); header row keeps uppercase micro-labels.
- Export CSV button: `.pressable`, navy outline style; on click it already downloads — no animation needed (frequent utilitarian action).

**(c) Do not touch:** all supabase queries, realtime channel wiring, CSV construction/download logic, `requireStaffRole` + redirect, tab state semantics, RESULT/STATUS semantic mappings (only their presentation).

#### `app/(staff)/admin/events/page.tsx` + `StatusControl.tsx` + `[id]/page.tsx` + `EventEditor.tsx`

**(a) AI tells:** eyebrows (`EVENIMENTE`, `EDITOR`); raw text-button StatusControl; the editor is a wall of identical card sections with unfocusable inputs and a submit lost at the bottom.

**(b) Redesign:**
- List page: header → `StaffHeader` (back link left, `Nou` navy pill right, `.pressable`). Eyebrow dies; h1 + sub stay. Table: `.row-hover`; event cell gains a 10px round swatch of `event.accent` before the title (informative: the event's brand color — semantic, allowed); status `<Chip size="sm" dot>`; Vândute cell `tabular-nums` + a 40px micro-bar (sold/capacity, 3px, cyan) under the number; icon links `.pressable` + hover border `--slate-300`.
- `StatusControl`: button → secondary small style (`.pressable`), pending state shows a 12px `.anim-spin-slow` ring instead of "..."; error span `.anim-shake .anim-fade`. Confirm dialog logic untouched.
- Editor page (`[id]/page.tsx`): header → `StaffHeader`; eyebrow dies; h1 + helper line stay.
- `EventEditor`: 
  - All inputs/textarea/selects get `.input` (focus ring arrives — currently none).
  - Section cards: keep the grouped white cards (forms benefit), radius 16→20 for scale consistency, titles 16/800.
  - Accent field: add a live 20px round swatch next to the input reflecting its value — make the accent input controlled with `useState(event?.accent ?? "#009FE3")` (component is already client; keep `name="accent"` and submitted value identical).
  - Program/perk rows: newly added rows `.anim-rise-fast`; row action icon-buttons `.pressable`.
  - **Sticky save bar:** move the submit button + state messages into a bottom-sticky bar (white, top hairline, `position: sticky; bottom: 0;` inside the form, `--z-sticky`, padding 12 20): left = success/error message (`.anim-fade`), right = navy submit Button. The long form always shows its exit.
- Photo input stays a bare file input (functional; just give it the `.input` treatment).

**(c) Do not touch:** `upsertEvent`/`setEventStatus` actions, hidden inputs (`id`, `photo_url`, `program`, `perks` JSON), field names, slug-lock logic, program/perks state management, confirm-swap behavior.

#### `app/(staff)/admin/team/page.tsx` + `TeamClient.tsx`

**(a) AI tells:** eyebrow `ECHIPĂ`; colored-text status; undifferentiated forms-in-table.

**(b) Redesign:** header → `StaffHeader`; eyebrow dies. Invite card: inputs/select `.input`; submit navy Button sm `.pressable`; success/error `ActionMessage` gets `.anim-fade` (+ `.anim-shake` when error). Table: `.row-hover`; status column → `<Chip size="sm" dot tone={pending ? "warning" : "success"}>{În așteptare|Activ}</Chip>`; role `select` gets `.input`; Salvează → secondary sm button `.pressable`; remove (trash) button: ghost with `--danger` color, `.pressable`, hover bg `--danger-100` (hover media). Rows `.anim-rise-fast` staggered cap 6.

**(c) Do not touch:** `inviteStaff`/`changeRole`/`removeMember` actions and field names, member mapping logic, role list/labels semantics (labels' text may not change — they map to roles).

#### `app/(staff)/scanner/page.tsx` + `ScannerClient.tsx`

**(a) What's off:** radial-gradient page background (banned page-level gradient); blurred header + status strip; neon drop-shadow corner glow (AI glow tell); success and error verdicts share one animation (constitution demands ring-expand vs shake); missing Romanian diacritics throughout the copy ("inauntru", "Scaneaza", "Reincearca"…).

**(b) Redesign:**
- Page bg: flat `#0F172A` (`--brand-navy`). No gradient (ruling 3.6). Dark chrome surfaces: solid `rgba(2,6,23,0.88)`, no blur.
- Corner marks: keep geometry; **delete the cyan drop-shadow glow**; border 3px `rgba(255,255,255,0.9)` idle. On `state === "scanning"` corners are white; during a verdict they may take the verdict color (they already derive `color`).
- Scan line: move keyframes to globals (`.anim-scanline`), keep 1.5s; hidden under reduced motion (already specced).
- Status dot in the bottom strip: scanning = `--success` with `.anim-pulse-dot` (live semantic), error = danger static, idle = warning static. Remove its glow box-shadow.
- **Verdict choreography (the constitutional moment):**
  - `ok`: the 96px circle gets `.anim-pop` AND `.ring-pulse` with `color: var(--success)` — one green ring expands 380ms. Text/labels rise in (`.anim-rise-fast` delay 80ms).
  - `already_in` / `already_used`: amber, `.anim-pop` only (a warning is news, not a slap).
  - `invalid` / `void_ticket` / `unauthorized` / `inactive_event`: the circle gets `.anim-pop` and the inner content wrapper gets `.anim-shake` (2-cycle 6px, 160ms each) — the constitutional error gesture.
  - Verdict overlay backdrop: `.anim-fade` 180ms (exists, formalize with the class).
- Aside panel: solid dark card (no blur); buttons keep dark-outline style + `.pressable`; manual-code input keeps mono styling + `.input`-equivalent dark focus (`border-color: var(--brand-cyan)` on focus); submit disabled at 0.4 opacity standard.
- **Fix diacritics in all visible strings** (display copy only, same meaning): `Deja înăuntru`, `Scanează`, `Reîncearcă`, `Reîncarcă camerele`, `Verific…`, `Validează cod`, `Camera activă`, `Cameră optimizată pentru QR`, `Pornesc camera…`, `Ține biletul mai departe și centrează QR-ul.`, etc. (Romanian product voice requires correct diacritics; this is presentation, not logic.)
- The `<style>` media-query block for mobile collapse stays (update selectors if class names change). Keyframes inside it move to globals.

**(c) Do not touch:** camera selection/constraint logic, zxing wiring, cooldown/dedupe refs, `scanTicket`/`scanTicketByCode` calls, verdict semantics, the 3s verdict timeout, device labels logic, `transform: scaleX(-1)` mirror.

#### `app/(staff)/statistici/page.tsx`

**(a) AI tells:** a near-clone of the admin dashboard (same 4 stat cards, same table skeleton) — two pages, one template.

**(b) Redesign — make it read as a REPORT, not a control room:**
- Header → `StaffHeader` (Refresh link right: `.pressable`; its icon rotates 180° on hover, `transition: transform var(--dur-base) var(--ease-out)`, hover media only).
- Eyebrow dies. H1 = active event title (or `Niciun eveniment activ` + `GearWatermark` empty treatment).
- **Replace the 4-card grid with ONE summary card** (white, radius 20, padding 24): a single horizontal band split by vertical hairlines into four cells — `Vândute {sold} / {capacity}` with an inline 4px cyan bar, `Check-in {n} ({pct}%)` with green bar, `Locuri rămase`, `Venituri {priceRon} lei` in mono. Values 24/800 `tabular-nums`, labels 11 uppercase micro (data labels). `.anim-rise` on load. One composed report band ≠ admin's four tiles.
- Table: `.row-hover`; per-row "Vândute" gets the 40px micro-bar; "Venituri" mono `tabular-nums`; status `<Chip size="sm" dot>`. Rows `.anim-rise-fast` staggered cap 6.

**(c) Do not touch:** all queries, aggregation maps, role gate, refresh link target.

---

## 7. Hard rules for implementers

1. **Frozen tokens.** Never edit or delete any existing value in `app/globals.css` (`@theme` or `:root`). Add only what Section 4 specifies. Same hexes, same easings, same radii forever.
2. **Visual layer only.** Never modify: server actions (`actions.ts` — do not even open them for editing), `route.ts`/`api/`, data fetching calls and their selected columns, auth/role checks, redirects, form field `name` attributes, hidden inputs, `lib/`, metadata exports, `proxy.ts`. If a visual idea needs new data — drop the idea.
3. **Banned patterns (match → rewrite with different structure):** gradient text (`background-clip: text`); colored side-stripes (`border-left/right` > 1px as accent); backdrop-filter/glassmorphism anywhere (ruling 3.5); page-level gradient backgrounds (gradients live only on the ticket header and primary-CTA fills); eyebrow/uppercase-tracked label above any heading; numbered section markers outside the landing How-it-works; three-identical-cards grids; the hero-metric stat strip; emoji in any product surface; decorative status dots; pure `#000`; `scale(0)` entrances (floor 0.92); `ease-in` on anything; `transition: all`; animating width/height/margin/padding/top/left (transforms + opacity only; the stat progress bars' `width` transition is the single sanctioned exception, it runs once at render); `window.addEventListener("scroll", …)`.
4. **Contrast floors:** informational text ≥ 4.5:1 — on white that means `--slate-500` minimum (never `--slate-400` for words that carry meaning); cyan text below 18px must be `--brand-cyan-700`; raw `--brand-cyan` is for fills, icons, and large display only; white text on the brand gradient needs the 0.18 navy protection layer (ticket header) or ≥ 700 weight at ≥ 15px.
5. **Motion contract:** every animation uses the tokens (140/220/380ms, `--ease-out`/`--ease-spring`/`--ease-in-out`); spring only on success moments; one-shot keyframes end fully visible; infinite animations are only `.anim-pulse-dot`, `.anim-spin-slow`, `.anim-scanline` and each is killed under `prefers-reduced-motion: reduce`; hover effects live inside `@media (hover: hover) and (pointer: fine)`; press = `scale(0.97)`; never gate content visibility on a JS-added class except via the `Reveal` `data-armed` pattern (Section 4.5), which is landing-only.
6. **Voice:** Romanian, sentence case everywhere (ALL CAPS only in the sanctioned data labels), correct diacritics, no exclamation marks, no emoji, money always `N RON`/`N lei` as currently written, allowed glyphs `·` `—` `→` only. Frozen copy: GDPR sentence, error-message strings tied to logic states, prices, status values. Adjustable copy: headings/labels explicitly rewritten in this spec — change nothing else.
7. **Iconography:** Lucide only, `strokeWidth={1.75}`, sizes 20/24/40, `currentColor`. No hand-rolled SVGs except the two preserved brand marks (gear, columns).
8. **Layout:** 4px spacing scale; buyer content columns max 440px; staff content max 960–1200px; mobile gutters 20px; fixed CTAs keep the `env(safe-area-inset-bottom)` gap; z-index only via the new `--z-*` tokens (no 999).
9. **Per-page distinctness:** if your diff makes two pages look like the same template (admin vs statistici, the two logins), re-read that page's spec — differentiation is specified; implement it.
10. **Build verification:** from `web\`, run `npm run build` and it must pass with zero errors before the batch reports done. Fix errors one at a time (Turbopack reports them sequentially). Do not report done on a red build.
