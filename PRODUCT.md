# SavaPass — Product & Design Master

Single source of truth for what SavaPass is, who it's for, and how it must look and feel. This file merges the **handoff notes** (from the Claude Design export) and the **product spec + design system** (from the design chats). The raw design conversations live in [`chats/`](chats/).

---

## 1. Handoff — coding agents read this first

This project began as a **handoff bundle** from Claude Design (claude.ai/design). A user mocked up the designs in HTML/CSS/JS, then exported them so a coding agent can build the real product.

- **The prototype is the visual contract.** Recreate it pixel-perfectly in whatever stack fits the target (the planned path is Vite + React — see [CLAUDE.md](CLAUDE.md) "Next steps"). Match the visual output; don't copy the prototype's in-browser-Babel structure unless it happens to fit.
- **Read the source, not screenshots.** Everything — dimensions, colors, layout rules — is in the source. Don't render to screenshot unless asked.
- **The intent lives in the chats.** [`chats/chat1.md`](chats/chat1.md) holds the original product spec, the design system, and the full build history. [`chats/chat2.md`](chats/chat2.md) covers the landing-page redesign. Read them before changing direction.
- **When in doubt, ask before building.** Cheaper to clarify scope up front than to build the wrong thing.

Bundle source (preserved): `active/savapass-design/` (extracted `design.gz`).

---

## 2. Product spec

**SavaPass** is a simple, mobile-first ticketing platform for **Interact Sf. Sava** (a Rotary-affiliated student club, Bucharest, Curtea Veche). Inspired by the clean feel of DICE, but adapted for a school club that usually runs **one main active event** and maybe 2–3 events total.

### What it does
View the current Interact event → buy a ticket online → receive a receipt + QR by email and in-app → show the QR at the door → organizer scans it and marks it used.

The app should feel **modern, premium, simple, trustworthy, and youthful** — not like a big Romanian ticket marketplace.

### Positioning
- **Not** a big platform like iaBilet (many categories, filters, festivals).
- **But** a private event-pass app for one school club.
- Mental model: **DICE-style event app + Apple Wallet-style ticket + Stripe checkout**.
- Core promise: *"One active Interact project. One simple checkout. One QR code for entrance."*

### User types
1. **Guest / Student (buyer)** — view events, buy a ticket, receive QR, show ticket at entrance.
2. **Organizer / Interact member** — view sold tickets, scan QR codes, check people in, see ticket status.
3. **Admin** — create/edit the current event, set ticket price, see revenue, export attendees, manage availability.

### Main screens
Home / Current Project · Event Details · Checkout · Payment Success · My Ticket (QR Pass) · Scanner · Admin Dashboard. Plus a desktop **brand landing site** and a **mobile-web** view (used as the deep link from a shared ticket).

Language: **Romanian** (UI strings are bilingual-ready; source standardizes on English with Romanian next to it). Admin is **deep** — desktop with revenue chart, exports, scan log. Live demo event is **Echoes Unplugged**; past events: Easter Egg Hunt, Cupid's Hex.

---

## 3. Design system — SavaPass

> A digital ticketing app for Interact Sf. Sava. Mobile-first event pass: view event → buy ticket → receive QR → scan at the door.

| | |
|---|---|
| **Tone** | Modern, premium, simple, trustworthy, youthful, *lightly academic* |
| **References** | DICE (mobile event app) · Apple Wallet (ticket) · Stripe Checkout (payment) |
| **Anti-references** | iaBilet-style marketplaces · party/club apps · childish school apps |
| **Audience** | Students & guests (buyers), Interact members (organizers/scanners), club admins |

### Voice & content
- **Short, calm, friendly, slightly formal** — a well-organized student council, not a club promoter.
- Address the user directly ("Your ticket", "You're in"). First person plural for the organizer ("We've sent your QR to…").
- Never "the user", never "click here", no marketing exclamation marks, **no emoji** in product surfaces.
- Dates unambiguous ("Fri · 14 Nov · 19:00"). Money explicit with currency ("45 RON", never "$45").
- **Sentence case** for headings/buttons/labels. **ALL CAPS** only for tiny letter-spaced eyebrows ("DOORS 19:00", "USED"). No Title Case.
- Headlines ≤ 5 words, subtitles ≤ 12, button labels 1–3 words.
- Romanian voice is warm, not stiff: "Biletul tău", "Ne vedem vineri" — avoid "Vă mulțumim pentru achiziție".

### Color
- **Primary** `--brand-cyan #009FE3` — the exact logo cyan, the only "loud" color; carries all interactive emphasis.
- **Deep Blue** `#2563EB` — almost only in the brand gradient (`--grad-brand`) on ticket headers / hero CTA. Never a flat fill.
- **Navy** `#0F172A` — body text. Pure black is forbidden (too harsh against cyan).
- **Slate** scale — surfaces, borders, secondary text. **Light mode only**; dark mode is a v2 non-goal.
- **Semantic** — green = valid/paid, amber = warning (low stock), red = error/expired, slate-500 = used.
- Brief palette: Primary `#009FE3`, Deep `#2563EB`, Navy `#0F172A`, Light bg `#F8FAFC`, Card `#FFFFFF`, Border `#E2E8F0`, Success `#16A34A`, Used `#64748B`.

### Typography
- **Display** — Instrument Serif (quiet serif italic, academic nod). Used sparingly: event hero, success screen, empty state. Never buttons/body.
- **UI** — Manrope (clean, friendly, slightly rounded). ~95% of type.
- **Mono** — JetBrains Mono for ticket IDs, order numbers, the 6-digit code under the QR.
- Headings 800 weight, tight tracking (`-0.02em`). Body 400. Eyebrows 700, uppercase, +0.14em.
- **Hierarchy by weight & size, not color.** Color is reserved for state and brand.

### Surfaces, spacing, shape
- App surface `--slate-50 #F8FAFC`. **No page-level gradient backgrounds** — gradients are an object property (ticket header, CTA glow), never a page property. No background images/patterns/noise on chrome.
- One decorative motif allowed: faint **rotary-gear watermark** (8% opacity, slate-300) on empty states and the receipt. Never on tickets.
- 4px base scale. Mobile gutters 20px. Card padding 20–24px. Sections 32–48px apart. Mobile max width **440px**; desktop admin to **1200px**. Bottom nav + primary CTAs are fixed with 16px safe-area gap.
- Borders: 1px solid `--slate-200`, shared by inputs and cards. No double borders, no glow halos. Focus = `0 0 0 3px var(--brand-cyan-100)` + cyan border.
- Radii: buttons/inputs 14px, cards 20px, ticket/hero 28px (Apple-Wallet-ish), pills/chips/avatars pill, smallest 6px. Nothing is square.
- Shadows: soft, **blue-tinted, never gray** (`rgba(15,23,42,0.06–0.10)`). Three steps (sm/md/lg). Primary button gets a cyan brand-tinted shadow — its one license to glow.

### Motion
- Default easing `--ease-out cubic-bezier(0.22, 1, 0.36, 1)` (fast out, slow in). Success moments use `--ease-spring` with small overshoot.
- Durations: 140ms taps, 220ms transitions, 380ms page/sheet. No bounces on regular UI, no parallax, no scroll-jacking.
- QR success = one green ring expand (380ms) + one-shot haptic. QR error = 2-cycle 6px horizontal shake (160ms).
- Press is canonical on mobile: `scale(0.97)` + slight darken. Desktop hover = 4% darker (never lighter). Disabled = `opacity:0.4; pointer-events:none`.
- Blur used in one place: the ticket-screen bottom-tab bar (`backdrop-filter: blur(20px)` + `rgba(255,255,255,0.7)`). Modals use a solid `rgba(15,23,42,0.45)` scrim, no blur.

### Iconography
- **Lucide** via CDN. Stroke 1.75px. Sizes: 20px dense, 24px standard, 28px bottom tab, 40px empty states. Color = `currentColor` (active cyan, inactive slate-400, on-brand white). Outlined only; filled only for the active bottom-tab.
- Two brand marks preserved verbatim, never redrawn: the **rotary gear** (Rotary parent identity) and the **columns/temple** (Sf. Sava nod). Copy from `assets/logo-columns.jpg` / `assets/logo-wordmark.jpg`.
- Only unicode glyphs in use: `·` separator, `—` em dash, `→` inline-CTA arrow.

### Known substitutions (flagged for production)
- Lucide icons are a placeholder — swap 1:1 if Interact owns a custom set.
- Fonts are Google Fonts — self-host `.woff2` for production.
- Logos are small JPEGs — request vector (SVG/PDF) before scaling large.

---

## 4. Build history (from the design chats)

The prototype was built and iterated across two sessions. Highlights:

- **Chat 1 (app):** Built all 6 mobile screens + interactive phone flow (Acasă → Eveniment → Plată → Succes → Bilet → Scanare), three ticket variants (Wallet / Minimal / Boarding-pass), and the deep desktop admin (revenue chart, check-in dial, attendees table, scan log, past-events archive). Added the uploaded event posters, a scrollable Home with a "Past events" section, the desktop landing site, the mobile-web Safari view, then removed the in-app URL bar (kept only on mobile-web). Saved as standalone `SavaPass Prototype.html`.
- **Chat 2 (landing):** Reframed the desktop landing around the SavaPass / Interact brand story (hero pitch + stat strip + fanned poster stack, "How it works", events strip, About Interact, footer) instead of leading with a single event. Mobile-web stays event-focused as the shared-ticket deep link.

Full transcripts: [`chats/chat1.md`](chats/chat1.md) · [`chats/chat2.md`](chats/chat2.md).
