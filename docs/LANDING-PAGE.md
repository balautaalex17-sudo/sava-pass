# SavaPass — The Perfect Landing Page

A description of the ideal desktop/brand landing page for SavaPass (`web/app/page.tsx`).
Grounded in [PRODUCT.md](../PRODUCT.md) (product + design system), the established voice,
and [REDESIGN-SPEC.md](REDESIGN-SPEC.md) (anti-slop rules). This is the target, not a
record of the current build — where the two diverge, this document wins.

---

## 1. What this page is for

One job: **turn a curious visitor into a ticket holder for the current Interact event.**

Everything else (the brand story, "how it works", past editions) exists only to remove the
three reasons a student hesitates: *Is this legit? Is paying online safe? Is it worth it?*
If a section does not advance buy-the-ticket or answer one of those three doubts, it does
not belong on the page.

Secondary job: be the **shared-ticket deep link** target. People arrive here from a friend's
forwarded ticket. The page must make sense cold, with zero prior context.

**The single conversion goal:** click "Cumpără bilet" → land on the event page.
Every screen of scroll should keep that button one glance away.

### Who lands here

| Visitor | Arrives via | Wants to know | We give them |
|---|---|---|---|
| Student / guest | Instagram bio, word of mouth | What's on, how much, is it safe | Hero event + price + QR flow |
| Friend of a buyer | Forwarded ticket link | "What is SavaPass?" | Brand context in 5 seconds |
| Parent | Shown by their kid | Is this a real, trustworthy thing | About Interact + secure-payment trust |
| Future organizer | Recruiting interest | Can I join | Quiet "join the team" link |

---

## 2. The feeling (non-negotiable)

From PRODUCT.md §3: **modern, premium, simple, trustworthy, youthful, lightly academic.**

- References: DICE (event app), Apple Wallet (the ticket object), Stripe Checkout (payment).
- Anti-references: iaBilet-style marketplaces, party/club flyers, childish school-app design.
- It should look like a **well-run student council** built it, not a club promoter and not a
  Romanian ticket reseller.

If a visitor's first half-second reaction is "this looks like a real company," the page works.

---

## 3. Page anatomy (top to bottom)

Seven sections, in this order. Each one earns its place.

```
Sticky nav        →  brand + jump links + persistent "Cumpără bilet"
Hero              →  the pitch + the live event + the buy button
Trust band        →  the 4 objections, killed in one quiet strip
How it works      →  3 steps, the email→QR→scan flow made tangible
Events            →  the active event (big) + past editions (proof it's real)
About Interact    →  who runs this and why it matters
Footer            →  the boring necessary stuff
```

### 3.1 Nav (sticky)

- Left: the **logo** (gear + wordmark). The gear rotates 45° on hover — small, alive, owned.
- Center/left: three jump links — `Evenimente`, `Cum funcționează`, `Despre Interact`.
- Right: `Biletele mele` (or `Contul meu` when signed in) + the **primary CTA** `Cumpără bilet`.
- The CTA pill is **always visible**. It is the one thing that must never scroll away.
- Flat by default; gains a soft shadow only after the page scrolls (scroll-driven, no JS).
- Mobile: jump links collapse, the `Cumpără bilet` pill stays.

**The CTA never disappears.** That is the whole point of a sticky nav here.

### 3.2 Hero — the most important 600px

This is where the sale is won or lost. Structure:

- **Full-bleed photography**, not a poster. Real concert-crowd energy, dark navy base, a
  scrim that keeps text readable. (Posters are 340×465 — they pixelate at hero scale. They
  belong on event cards only.) Subtle Ken-Burns settle on load, killed under reduced motion.
- **Brand mark line:** a small cyan dot + `Biletele oficiale Interact Sf. Sava`. This is the
  legitimacy stamp — "official", not a scalper.
- **Headline:** two lines, the brand signature.
  > Bilete pentru
  > serile *Interact.*

  `Interact.` is set in **Instrument Serif italic** — the one ceremonial serif moment in the
  hero. This is untouchable; it is the brand's voice. Lines reveal with a mask-rise on load.
- **Sub-paragraph (≤ 2 sentences):**
  > Cumperi online, primești QR-ul pe email și intri la ușă cu o singură scanare.
  > Fără aplicații instalate și fără liste pe hârtie la intrare.
- **Two buttons:** primary `Cumpără bilet →` (gradient + the one licensed cyan glow),
  secondary `Vezi evenimentele` (ghost). On mobile they stack full-width.
- **A live "now on sale" strip** pinned to the bottom of the hero: `Acum la vânzare ·
  <event title> · <date> · <venue> · Detalii →`. This pulls the real current event from the
  database — the page is never stale, never shows a dead event.

**Banned in the hero** (per REDESIGN-SPEC §6): the stat strip ("264 bilete / 13.5k RON").
Hardcoded vanity metrics are the SaaS-template tell. Quiet stats live in About, once, earned.

What the hero must communicate in one glance, without scrolling:
1. This is the official Interact ticket store.
2. There is an event happening (named, dated).
3. Buying takes one click and it's safe.

### 3.3 Trust band — four objections, one line

A single quiet horizontal strip on the light surface, four items separated by hairlines:

| | |
|---|---|
| 🔒 Plată securizată | Stripe |
| ✉ QR pe email | imediat după plată |
| ↻ Returnabil | cu 48h înainte |
| 🤝 Pentru o cauză | 100% Interact |

(Icons are Lucide, stroke 1.75, slate-400 — *not* emoji. Shown here only as shorthand.)

This is not decoration. Each item kills a real hesitation: *will my money vanish / how do I
get in / what if I can't come / where does the money go.* Keep it to one row, no card grid,
no gradient icon tiles (the 2023 SaaS signature, explicitly banned).

### 3.4 How it works — make the QR flow tangible

The numbered-step ban does **not** apply here. This is a genuine 3-step sequence; the numbers
carry information. Three transparent columns (not three identical gradient-icon cards) on a
thin rail that draws itself in on scroll:

1. **01 · Alegi evenimentul** — Vezi data, locul, programul și câte locuri mai sunt.
2. **02 · Plătești securizat** — Card sau Apple Pay prin Stripe. Noi nu vedem datele cardului.
3. **03 · Intri cu QR** — Biletul ajunge pe email. La intrare îl scanezi și ești înăuntru.

Heading (sentence case, no eyebrow above it):
> Trei pași până la ușă.
> Fără cont obligatoriu, fără aplicații de instalat. Doar email-ul tău și un card.

Below the steps: a small **flow preview** — three mini-cards showing the actual artifacts
(an email → a ticket with a QR stub → a green "Intrat!" scan result). This is the Apple-Wallet
moment: show the thing they'll receive, don't just describe it. It makes the abstract concrete
and previews the product's quality.

### 3.5 Events — the active event, then proof

- **The active event, large.** A single wide card: poster image + title + serif-italic
  subtitle + a 2×2 fact grid (Data / Locul / Porți / Preț) + a price-and-arrow buy row.
  Pointer tilt on desktop (subtle, rAF-driven, off under reduced motion / touch). This is the
  second-strongest CTA on the page after the hero.
- **Past editions, smaller.** A grid of finished events tagged `Încheiat`. Their only job is
  social proof: *this club actually runs events, repeatedly, and people went.* Echoes Unplugged,
  Easter Egg Hunt, Cupid's Hex. No CTA on these — they are evidence, not offers.

Heading: `Evenimentele SavaPass.` — that's it. No eyebrow, no subtitle needed.

If there is no active event, this section degrades gracefully: lead with past editions and a
quiet "următorul eveniment se anunță în curând" line. The page must never look broken between
events.

### 3.6 About Interact — legitimacy and heart

Two columns:

- **Left, the story:** who runs this and why.
  > Condus de elevi, cu impact real.
  > Interact Sf. Sava este clubul de voluntariat al Colegiului Național Sfântul Sava, afiliat
  > Rotary International. Evenimentele strâng comunitatea liceului în jurul unor cauze reale.

  Then **one** quiet typographic stat ledger (mono numerals, count up on scroll): ani de
  activitate · bilete vândute · RON donați · 100% fonduri Interact. This is the *only* place
  numbers appear — earned here, banned in the hero. A soft `Vrei să faci parte din echipă? →`
  recruiting link. Then a 3-line rhythm of how an event comes together (planificare → bilete
  fără liste → fonduri urmărite clar).
- **Right, the proof board:** a composed collage — club photo, event poster, an "issued
  ticket" card with a mono code, the Interact wordmark, a green "scanner OK" card. This is the
  product and the club in one image: real photos, real ticket, real check-in.

The emotional turn of the page: *this is teenagers doing something real for a cause, and the
software is good.* Both halves matter — the heart and the craft.

### 3.7 Footer

Minimal. Logo + `© 2026 Interact Sf. Sava · București` on the left; Instagram + Contact on the
right. No fake sitemap, no newsletter trap, no social-icon wall. It is a school club, not a SaaS.

---

## 4. Design system applied

Pulled straight from PRODUCT.md §3 — the landing page does not invent its own rules.

### Color
- **Cyan `#009FE3`** is the only loud color. It carries the primary CTA glow, the live dot,
  step numerals, the mono ticket code, hover accents. Use it sparingly — scarcity is what
  makes it read as premium.
- **Navy `#0F172A`** is body text and the hero/photo base. Never pure black.
- **Deep blue `#2563EB`** appears only inside `--grad-brand` on the primary button. Never a
  flat fill.
- Surfaces alternate **white** and **slate-50 `#F8FAFC`** to separate sections. **No
  page-level gradient backgrounds** — gradients are an object property (button, ticket header),
  never a page wash.
- Green = success ("Intrat!", scanner OK). That's the only other accent.

### Typography
- **Manrope** for ~95% of the page (max weight 800 — never 850/900, they synthesize fake bold).
- **Instrument Serif italic** at exactly the ceremonial moments: the hero `Interact.` accent
  and the active-event subtitle. Nowhere else. Three appearances max across the whole page.
- **JetBrains Mono** for the stat numerals, the ticket code, and step numbers.
- Headings 800 weight, tight tracking (-0.02 to -0.04em), **sentence case always**. ALL CAPS
  only for tiny letter-spaced data labels ("BILET ACTIV", "EMAIL", "SCAN").
- Hierarchy comes from **weight and size, not color.** Color is reserved for state and brand.

### Shape, depth, spacing
- Radii: buttons 14, cards 20, hero/ticket/poster 28, chips pill, smallest 6. **Nothing
  square.**
- Borders: 1px slate-200, shared by cards and inputs. No double borders, no glow halos.
- Shadows: soft, **blue-tinted, never gray** (`rgba(15,23,42,0.06–0.10)`). The primary button
  gets the one cyan-tinted shadow — its single license to glow.
- 4px base scale. Sections 78–96px apart on desktop. Max content width ~1320px; mobile gutters
  20px.

### Motion (calm, intentional)
- Easing `cubic-bezier(0.22, 1, 0.36, 1)` — fast out, slow in. Success moments get a small
  spring overshoot.
- Above-the-fold: load-in `.anim-rise` with staggered delays (badge → h1 → paragraph → CTAs at
  0/60/120/180ms) + the hero headline mask-rise.
- Below-the-fold: `Reveal` (IntersectionObserver) — sections rise once as they enter. The
  steps rail draws itself; About stats count up; the event card tilts to the pointer.
- All continuous/pointer-driven values (tilt, count-up) write CSS vars or textContent via ref
  inside rAF — **never React state**. Everything gates on `prefers-reduced-motion`; tilt also
  gates on `(hover: hover) and (pointer: fine)`.
- No parallax, no scroll-jacking, no bounce on ordinary UI. Press = `scale(0.97)` + slight
  darken. Desktop hover darkens 4%, never lightens.

---

## 5. Voice & copy rules

From PRODUCT.md §3 — applies to every word on the page.

- **Romanian**, warm but lightly formal. A student council, not a hype account.
- Address the visitor directly: "Biletul tău", "Ești înăuntru", "Ne vedem vineri."
- **No marketing exclamation marks. No emoji. No "click aici". No "the user".**
- Sentence case for headings/buttons/labels. ALL CAPS only for tiny data labels.
- Headlines ≤ 5 words, subtitles ≤ 12, button labels 1–3 words.
- Dates unambiguous: `Vin · 14 Nov · 19:00`. Money explicit: `45 RON`, never `$45` or `45 lei`
  styled inconsistently.
- Only three unicode glyphs allowed: `·` (separator), `—` (em dash), `→` (inline CTA arrow).

---

## 6. Anti-slop checklist (what makes it NOT look templated)

The difference between a real-company landing and an AI-generated one. Every item below is
banned (see REDESIGN-SPEC §6):

- ❌ An eyebrow label above every section heading (`CUM FUNCȚIONEAZĂ`, `EVENIMENTE`,
  `DESPRE INTERACT`). Headings stand alone, sentence case. **The one survivor:** data labels
  inside cards ("BILET ACTIV").
- ❌ A hero stat strip with hardcoded vanity numbers.
- ❌ Three identical gradient-icon cards (the SaaS signature). Use transparent columns / a
  ledger / a real collage instead.
- ❌ A second/third gradient CTA block restating the hero CTA. One primary CTA intent per view.
- ❌ Page-level gradient or radial backgrounds. Backdrop-blur anywhere (PRODUCT.md allows blur
  in exactly one place — the in-app ticket tab bar — which is not on this page).
- ❌ Dead `#` nav links that scroll nowhere.
- ❌ Zero motion (looks dead) **or** motion everywhere (looks cheap). Choreographed, calm.
- ❌ Emoji anywhere in product copy.
- ❌ Stretched low-res posters used as hero backgrounds.

---

## 7. Responsive behavior

- **Desktop-first** for this page (it is the brand surface; the app itself is mobile-first).
- ≤ 900px: nav links + account link collapse, `Cumpără bilet` stays; hero artwork fades back
  and the ticket mock hides; the steps grid, event card, and About grid all go single-column;
  trust band becomes a 2×2.
- ≤ 560px: headline drops to 48px, hero buttons stack full-width, fact grid goes single-column.
- The hero must be **legible on a phone in daylight** — it doubles as the shared-ticket deep
  link, so most real traffic is mobile. Test the scrim contrast on a real phone, not just the
  desktop preview.

---

## 8. Performance & SEO

- Hero photo is the LCP element: `priority`, served from `/public/landing/` (local, not a
  remote URL — avoids broken-link risk and `next.config` remote-pattern setup), `sizes="100vw"`.
- Everything below the fold reveals on scroll, but content is **server-rendered** — no
  `data-armed` class hides anything from crawlers or no-JS visitors. The page is fully
  meaningful with JavaScript off.
- Title + description set for Romanian search:
  > SavaPass — Bilete pentru serile Interact Sf. Sava
  > Cumpără bilete online pentru evenimentele Interact Sf. Sava. Simplu, rapid, sigur.
- Live event data is fetched server-side, so the "now on sale" strip and event card are always
  current and indexable.

---

## 9. Definition of done

The landing page is "perfect" when:

1. A first-time visitor understands *what this is* and *that it's safe* within 5 seconds, on a
   phone, without scrolling.
2. The `Cumpără bilet` button is reachable in one glance from any scroll position.
3. The current event is pulled live — never a stale or hardcoded event.
4. Nothing on the page reads as a template (run the §6 checklist).
5. It degrades gracefully with no active event and with JavaScript disabled.
6. Every animation respects `prefers-reduced-motion`.
7. A parent looking over their kid's shoulder concludes: "this is a real, trustworthy thing."

The current build (`web/app/page.tsx`, "Landing v2") already implements this anatomy. Treat
this document as the spec to measure it against and the contract for any future change.
