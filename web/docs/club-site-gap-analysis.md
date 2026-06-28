# Club-site gap analysis — interactatheneum.ro vs SavaPass

_Captured 2026-06-28 (scraped via Firecrawl). Goal: evolve SavaPass from a ticketing
app into the full club website — not just tickets._

## What interactatheneum.ro is

A **7-page static brochure site** for the Interact/Rotaract/Rotary "Atheneum" family.
It presents identity and pushes every interaction to Instagram (apply, full member list,
"more events"). No payments, no login, no real backend.

Pages + what each holds:
1. **Acasă (Home)** — hero ("Service above self"), image carousel, "Despre" (mission/values), "Familia Atheneum" (Interact 14-18 / Rotaract 18-30 / Rotary 30+), social footer.
2. **Echipă (Team)** — "Meet the Board": 8 board members w/ photo + role; "Our Team" blurb + group photo; **"Cum devii membru?"** 6-step visual journey; member list → Instagram highlights.
3. **Evenimente (Events)** — project showcase (e.g. "Ghiozdanul de școală"): date, location, description, **photo gallery**; "see more" → Instagram. These are *volunteer projects*, not ticketed.
4. **Cauze (Causes)** — beneficiaries they support (schools + NGOs: Casa Bună, Fabrica de Fapte Bune).
5. **District 2241** — Rotary district map + context, **conference galleries**, trips/teambuilding gallery.
6. **Sponsori (Sponsors)** — sponsor/partner logos.
7. **Contact** — **contact form** (name/email/message), address, email, socials.

Cross-cutting: photo galleries everywhere, prominent IG/FB/YouTube, bilingual-ish RO/EN headings.

---

## Feature comparison

| Capability | Atheneum | SavaPass today | Gap |
|---|---|---|---|
| **Club "About"/mission/values** | ✅ dedicated | ⚠️ event-centric homepage only | **SavaPass needs it** |
| **Org family (Interact/Rotaract/Rotary) + District/Rotary context** | ✅ | ❌ | **needs it** |
| **Public Team / Board page** (photos, roles) | ✅ | ⚠️ staff exist in admin, no *public* page | **needs it** |
| **Projects portfolio** (non-ticketed volunteer projects + galleries) | ✅ | ❌ (events = ticket items only) | **needs it** |
| **Causes / beneficiaries** | ✅ | ❌ | **needs it** |
| **Sponsors / partners** | ✅ | ❌ | **needs it** |
| **Photo galleries** | ✅ throughout | ⚠️ posters + QR only | **needs it** |
| **Contact page + general contact form** | ✅ | ❌ (only checkout/membership forms) | **needs it** |
| **"How to join" explainer** | ✅ 6-step | ✅ `/devino-membru` "cum decurge" timeline | parity |
| **Social integration** ("see more on IG") | ✅ prominent | ⚠️ minimal | improve |
| **Multi-page public nav to identity content** | ✅ | ⚠️ transactional nav (Bilete/Membru/Cont/Check-in) | **needs it** |
| — | — | — | — |
| **Online ticket sales + payments (Stripe)** | ❌ (→ Instagram) | ✅ | SavaPass ahead |
| **QR ticket + door check-in scanner** | ❌ | ✅ | SavaPass ahead |
| **In-app membership application + admin pipeline** | ❌ (form on IG) | ✅ | SavaPass ahead |
| **Admin dashboard / CMS / auth** | ❌ (hardcoded HTML) | ✅ | SavaPass ahead |
| **Live event stats, comp tickets** | ❌ | ✅ | SavaPass ahead |
| **Legal / GDPR pages** | ❌ | ✅ | SavaPass ahead |

**Bottom line:** SavaPass is technically far ahead (real backend, payments, scanning, CMS,
auth). It's only missing the **public "shop window" / identity layer** that Atheneum has.
And because SavaPass has admin + Supabase, those pages can be **data-driven/editable** —
strictly better than Atheneum's hand-coded HTML that needs a dev to change.

---

## What to add to become "the whole club site" (prioritized)

Build the identity layer **data-driven** (Supabase tables + admin editing), reusing existing patterns.

### P1 — Core identity (the minimum to stop looking like "just a ticket app")
- **About / club page** — mission, values ("Service above self"), the Interact Sf. Sava story, the Rotary family context. (Static content or a small `about` content table.)
- **Public Team page** — board + members with photo + role. New `team_members` table (name, role, photo, order, active) + admin CRUD + a public `/echipa`. (Photos via Supabase Storage.)
- **Projects portfolio** — separate *projects/causes* from *ticketed events*. Either add a `kind` to events (`ticketed` vs `project`) or a `projects` table (title, date, location, description, gallery[], beneficiary). Public `/proiecte` with detail + gallery. Ticketed events stay as-is.
- **Homepage reframe** — lead with the club (who we are + impact), with tickets/membership as CTAs, not the whole story.
- **Public identity nav** — extend the public nav: Acasă · Despre · Proiecte · Echipă · Evenimente(bilete) · Devino membru · Contact.

### P2 — Engagement + recognition
- **Sponsors/Partners** page — `sponsors` table (logo, name, link, tier) + `/sponsori`.
- **Causes/beneficiaries** — `/cauze` (table or part of projects).
- **Contact form** — `/contact`: a stored message (`contact_messages` table) + best-effort email (reuse `lib/email.ts`) + honeypot (reuse the membership pattern). Real upgrade over Atheneum's basic form.
- **Photo galleries** — Supabase Storage bucket + a gallery component reused across projects/events/team.

### P3 — Reach + content
- **District 2241 / Rotary** context page (map + conferences gallery).
- **News/blog** (`posts` table) for announcements — Atheneum lacks this entirely (a differentiator).
- **Newsletter signup** (store emails, consent) + deeper Instagram/YouTube embeds.

---

## Suggested data model additions (Supabase)
- `team_members` (name, role, photo_url, sort, active)
- `projects` (slug, title, date_label, location, summary, body, beneficiary, cover_url, gallery jsonb) — OR add `kind` + project fields to `events`
- `sponsors` (name, logo_url, url, tier, sort)
- `contact_messages` (name, email, message, created_at) + RLS staff-read like `membership_applications`
- (P3) `posts` (slug, title, cover, body, published_at)
- Storage bucket `media` for team/project/sponsor images (public read).

All editable from the existing admin shell → the club updates content without a developer
(the main thing Atheneum can't do).

---

## Note
This is a feature/strategy comparison, not a build. Recommended next step: `/ce-plan` a
"Phase 9 — public club site" (start with P1: About + Team + Projects portfolio + homepage
reframe), data-driven via Supabase + admin.
