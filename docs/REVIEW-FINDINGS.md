# SavaPass Redesign Review — Findings (2026-06-12)

Reviewed against `docs/REDESIGN-SPEC.md` (Section 7 hard rules) + impeccable skill bans.
All paths relative to `C:\Users\cycla\Documents\Bussines\projects\sava-pass\web\`.

Verified clean across the whole tree: no backdrop-filter, no gradient text, no side-stripes,
no scroll listeners, no `transition: all`, no emoji, no page-level gradients (scanner bg is flat
navy), hero stat strip dead, navy stat card dead. The four PRODUCT.md violations stayed dead.

---

## P1 — spec violation / banned pattern / broken behavior (must fix)

1. `app\(staff)\scanner\ScannerClient.tsx:32` — `ok: "Intrat!"` uses an exclamation mark; rule 6 bans exclamation marks anywhere. Fix: `"Intrat"` (or `"Înăuntru"`).

2. `app\(staff)\admin\events\[id]\page.tsx:43` — helper copy missing diacritics: `"Slug-ul este blocat pentru ca exista comenzi."` and `"Salveaza ca draft, apoi activeaza din lista de evenimente."`. Fix: `"…pentru că există comenzi."` / `"Salvează ca draft, apoi activează din lista de evenimente."` (rule 6; Batch D explicitly fixed diacritics — this file was missed).

3. `app\[slug]\page.tsx:57` — `.anim-pop` (spring) on the event poster. Rule 5: spring only on success moments; spec gives the sheet `.anim-rise` and says nothing about animating the poster. Fix: drop the class or use `anim-fade`.

4. `app\[slug]\checkout\CheckoutClient.tsx:45` — `.anim-pop` on the checkout mini-ticket card. Same spring-outside-success violation. Fix: `anim-rise-fast`.

5. `components\ui\Button.tsx:41-58` — when `loading`, children are replaced by the spinner, so every pending label ("Se procesează...", "Se trimite...", "Se salvează parola" etc.) disappears. Spec 4.4: every spinner must keep its adjacent text (this is also the reduced-motion fallback — with the spinner frozen, a bare circle communicates nothing). Fix: render `{loading && <spinner/>}{icon}{children}` instead of the ternary.

6. `components\ui\LiveClock.tsx:14` — spec 5.7: "Render null until mounted to avoid hydration mismatch." It initializes with `useState(formatTime)`, so server HTML carries server time and React logs a hydration mismatch on every ticket view. Fix: `const [time, setTime] = useState<string | null>(null)`, set it in the effect, return `null` while `time === null`.

---

## P2 — spec item missing or half-done (should fix)

### Shared / systemic

7. Multiple files — `font-weight: 850/900/750` used while `app\layout.tsx` loads Manrope only at 400-800 (frozen). Browsers synthesize the weight (smeared faux-bold, inconsistent across OSes). Occurrences: `app\page.tsx:454,610,726` (`850`), `app\[slug]\page.tsx:283,378` (`850`), `app\[slug]\checkout\CheckoutClient.tsx:210,265` (`850`), `app\(staff)\statistici\page.tsx:53,101,104,121` (`850`/`750`), `app\(staff)\scanner\ScannerClient.tsx:358,395` (`900`). Fix: clamp all to `800` (`750` → `700`).

8. `components\ui\Button.tsx:33` — `hover-dim` applied to every variant including `ghost`. Spec 4.3: hover-dim is for solid fills; text/ghost links use a color shift to cyan-700. Fix: apply `hover-dim` only for `primary`/`secondary`/`navy`; give `.btn--ghost:hover` a `color: var(--brand-cyan)` shift in globals (inside the hover media query).

### Landing — `app\page.tsx`

9. `app\page.tsx:87-133` — [verify] the hero was rebuilt as a full-bleed photo hero; the spec said "keep the grid… the 3-line headline (untouchable)" and gave PosterStack explicit motion (pop-fan entrance 0/90/180ms, hover straighten+lift). PosterStack is gone entirely — a whole spec block silently replaced. If this was an approved ambiguity resolution, document it; otherwise restore the grid+PosterStack hero.

10. `app\page.tsx:451-453` — hero title `clamp(48px, 8vw, 104px)` with `letter-spacing: -0.055em`. Skill hard limits: display clamp max ≤ 96px, tracking floor ≥ -0.04em. Fix: `clamp(48px, 7.5vw, 96px)`, `-0.04em`.

11. `app\page.tsx:174-183` — HowItWorks stagger is `.anim-rise-fast` on children inside `<Reveal>`. The animation runs at hydration (page load), finishes long before the section scrolls into view, so the stagger never happens — only the parent's single-block reveal shows. Spec 4.5/Batch A: stagger via `transition-delay` on children under `[data-armed]`, not animations. Fix: drop the child animation classes; add CSS `[data-armed] .steps__item { transition: opacity/transform …; transition-delay: calc(var(--i)*var(--stagger-step)); }` driven by the same `data-inview` flip.

12. `app\page.tsx:622-635` — spec: a 1px horizontal connector line at numeral height linking the three steps ("the three read as one flow"). Implemented as vertical `border-left` dividers between columns instead — a different (separator, not flow) structure. Fix or document as a deliberate call.

### Buyer flow

13. `app\[slug]\checkout\CheckoutClient.tsx:41-42` — spec keeps h1 `Aproape gata.` and adds context line `Biletul ajunge pe email imediat după plată.` Implemented `Rezervă biletul.` + a Stripe sentence. Rule 6: only copy explicitly rewritten in the spec may change. Fix: restore the spec strings.

14. `app\[slug]\checkout\CheckoutClient.tsx:67-92` — field rows are not staggered; spec: `.anim-rise-fast` with 0/60/120ms on the two fields + consent card. Fix: add the classes/delays.

### Conta

15. `app\conta\page.tsx:200-234` — TicketCard stagger is broken: `.anim-stagger > *` targets the `<Link>` children, but `--i` and `.anim-rise-fast` sit on the inner `<div>` (a grandchild), so every card animates with delay 0. Fix: move `--i` + the animation class onto the `<Link>` (or put the stagger class delay rule on the inner div).

16. `app\conta\page.tsx:233` — hover lift half-done: `transition: box-shadow` is declared but no hover rule ever changes the shadow. Spec: hover `--shadow-sm` lift inside the hover media query. Fix: add a `.ticket-card:hover { box-shadow: var(--shadow-sm); }` rule under `@media (hover: hover) and (pointer: fine)` (needs a class, not inline style).

17. `app\conta\SignOutButton.tsx:28-29` — hover implemented with `onMouseEnter`/`onMouseLeave` JS handlers; rule 5 requires hover effects inside the hover media query (JS hover sticks on touch). Fix: a small CSS class with `:hover { color: var(--danger); }` in the hover media query.

### Staff

18. `app\(staff)\admin\page.tsx:138` — Live chip dot is static; spec: "the dot carries `.anim-pulse-dot` (semantic: realtime subscription is open)". `Chip` can't class its dot — render the live indicator inline (8px dot span with `anim-pulse-dot` + label) or add a `pulse` prop to Chip.

19. `app\(staff)\admin\events\StatusControl.tsx:33-43` — three spec items skipped: button lacks `.pressable` (and the secondary-small treatment), pending shows `"..."` instead of a 12px `.anim-spin-slow` ring, error span lacks `.anim-shake .anim-fade`. Fix all three (presentation only; form/action untouched).

20. `app\(staff)\admin\events\EventEditor.tsx` — biggest unimplemented block in Batch D:
    - all inputs/textarea/file lack `className="input"` → no focus affordance at all (line 40-101, `inputStyle:127`);
    - sticky save bar missing entirely — submit + messages sit at the bottom of the long form (lines 108-110). Spec: bottom-sticky white bar, top hairline, `--z-sticky`, message left (`.anim-fade`), navy submit right;
    - accent live swatch missing — accent input (line 45) is uncontrolled with no 20px color swatch;
    - section card radius 16 → 20 (line 123).

21. `app\(staff)\statistici\page.tsx:43` — `className="pressable refresh-link"` but no `.refresh-link` CSS exists anywhere; the specced hover icon-rotate (180°, `--dur-base`, hover media) was never written. Fix: add the rule to globals or the page style block.

---

## P3 — polish / judgment calls (nice to fix)

22. `app\page.tsx:337` / `app\[slug]\page.tsx:183` / `app\[slug]\checkout\CheckoutClient.tsx:173` / `app\[slug]\BuyCta.tsx:23` — nav/CTA backgrounds use `0.98` alpha; spec says `0.95` (light) / `rgba(248,250,252,0.95)` (event). Cosmetically identical; align for consistency.

23. `app\page.tsx:367-371` — nav links change color on hover with no `transition: color var(--dur-fast)`; spec asked for a 140ms color shift. Add the transition on `.landing-nav__links a`.

24. `app\page.tsx:216-218` — featured-card `Cumpără bilet →` arrow does not translate 3px right on card hover (specced). Make the arrow a span and add the hover transform.

25. `app\page.tsx:835-859` — stat ledger entries have gaps but no hairline separators (spec: "separated by 24px gaps and hairlines"). Add 1px dividers.

26. `app\page.tsx:172` — folded sentence drifted: spec text "Fără cont, fără aplicații de instalat." vs implemented "Fără cont obligatoriu, …". Restore or accept.

27. Icon sizes below the 20/24/40 scale (13-16px) appear throughout (TrustBand 16 is specced, but e.g. `CheckCircle size={13}` at `app\[slug]\page.tsx:128`, `Lock/Mail size={13}` checkout:106/111, scanner buttons 14). Rule 7 says 20/24/40; spec's own examples contradict it — pick 16 as the sanctioned dense floor and normalize.

28. `app\(staff)\scanner\ScannerClient.tsx:300,338,393,422,427,447` — Lucide icons without `strokeWidth={1.75}` (default 2): LayoutDashboard, RotateCcw ×2, Video, Camera ×2, CheckCircle. Also `app\(staff)\admin\events\EventEditor.tsx:78,85-87,96,102` (Plus/X/ArrowUp/ArrowDown). Standardize.

29. `app\(staff)\scanner\ScannerClient.tsx:358` — `animationDelay: 80ms` is set on the title div, but the `anim-rise-fast` animation runs on its parent wrapper (line 357), so the delay does nothing. Move the delay to the wrapper.

30. `app\(staff)\scanner\ScannerClient.tsx:182,249` — `"..."` vs `"…"` mixed ("Pornesc camera cu rezoluție mare...", "Verific codul introdus..."); elsewhere the ellipsis char is used. Normalize to `…`.

31. `app\(staff)\scanner\ScannerClient.tsx:308,390` — shadows use `rgba(0,0,0,…)`; the system's shadows are navy-tinted. [verify] Swap to `rgba(2,6,23,…)` to match the dark chrome.

32. `app\(staff)\admin\AdminClient.tsx:220` and `app\(staff)\admin\events\page.tsx:75`, `statistici\page.tsx:99` — status chips print raw DB values (`valid`, `in`, `used`, `active`, `draft`, `past`) where conta maps them to Romanian labels. Presentation-only mapping (`Valabil/Intrat/…`, `Activ/Ciornă/Arhivat`) would match the voice rule; semantics untouched.

33. `app\(staff)\admin\team\TeamClient.tsx:112-120` — `ActionMessage` is `.anim-fade` only; spec adds `.anim-shake` when it is an error. `:154-161` — trash button lacks the specced hover `background: var(--danger-100)` (hover media).

34. `app\(staff)\admin\events\page.tsx:110` — icon links lack the specced hover border `--slate-300`.

35. `app\conta\page.tsx:260-281` — [verify] notch circles sit at `left: calc(100% - 96px - 1px)` so their left edge starts at the divider; centering them on the dashed line needs `-8px` (half the 16px circle) plus the 2px border offset.

36. `app\conta\login\page.tsx:87-100` — "Trimite din nou" declares a color transition but has no hover style; add the cyan-600/700 shift (hover media).

37. `app\conta\page.tsx:313` — ticket stub code at 11px vertical; spec said mono 14/700. Minor, bump if it stays legible.

38. `app\[slug]\checkout\CheckoutClient.tsx:111` — `Mail` icon paired with the seats-remaining line reads mismatched; use `Ticket` (16) or drop the icon.

39. Mono weights: JetBrains Mono loads only 400/500 (`app\layout.tsx:22`) yet the spec itself demands mono 700/800 everywhere (prices, codes, stats) — every bold mono is synthesized. [verify] Spec freeze ("do not change weights/subsets") conflicts with its own type specs; recommend the owner amend the freeze to add `"700"` to JetBrains Mono — one line, visual-only.

---

## Verdict per page

| Surface | Verdict |
|---|---|
| Landing (`app\page.tsx`) | fix-then-ship (items 9-12, 22-26; hero deviation needs an explicit decision) |
| Shared components | fix-then-ship (items 5, 6, 8) |
| Event page + BuyCta | fix-then-ship (item 3; otherwise solid) |
| Checkout | fix-then-ship (items 4, 13, 14) |
| Succes | ship — choreography matches the spec beat for beat |
| Bilet (ticket) | ship after item 6 (LiveClock) |
| Conta | fix-then-ship (items 15-17) |
| Conta login / staff login / invite | ship — register separation works (navy top edge + navy fill vs cyan magic-link) |
| error / not-found | ship |
| Admin dashboard + AdminClient | fix-then-ship (item 18; item 32 polish) |
| Events list + StatusControl | fix-then-ship (item 19) |
| Event editor | redo the missing block (item 20 — the page works but roughly half its spec is unimplemented) |
| Team | ship (P3s only) |
| Scanner | fix-then-ship (items 1, 28-31; verdict choreography itself is correct) |
| Statistici | fix-then-ship (items 7, 21; report-vs-control-room distinctness achieved) |
