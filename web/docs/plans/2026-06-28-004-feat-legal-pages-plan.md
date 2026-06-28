---
title: "feat: Terms + Privacy (GDPR) pages"
type: feat
status: active
date: 2026-06-28
origin: web/docs/ROADMAP.md (Phase 5 — Legal & compliance)
depth: lightweight
---

# feat: Terms + Privacy (GDPR) pages

## Summary

Add the two legal pages the buyer + membership flows already reference but that
currently 404: **Terms** (`/termeni`) and **Privacy / GDPR** (`/confidentialitate`).
Light design (`.sp-light` + FlowNav), static routes, and wire the existing consent
copy in checkout + the membership form to link to them. Required before publicly
taking payments and collecting personal data in Romania.

## Problem Frame

Checkout's order summary says "ești de acord cu termenii și politica de confidențialitate"
and the membership form's consent says "regulamentul intern și politica de confidențialitate"
— but neither links anywhere and the pages don't exist. Taking RON payments + storing
buyer/applicant PII without an accessible privacy notice is a GDPR gap.

## Requirements

- **R1** — `/termeni` renders (light, FlowNav) with the ticketing terms.
- **R2** — `/confidentialitate` renders a GDPR privacy notice: data collected, purpose, legal basis, processors (Stripe, Resend, Supabase), retention, data-subject rights, contact.
- **R3** — Checkout + membership consent copy links to both pages.
- **R4** — Content is a clear, honest draft a non-lawyer can ship, with entity/contact specifics marked for the user to confirm — not legal advice.

## Key Technical Decisions

- **KTD1 — One shared light shell.** A `components/legal/LegalPage.tsx` (FlowNav + `.sp-light` prose container + "ultima actualizare" line) renders both pages so they're consistent and DRY.
- **KTD2 — Static routes.** Both pages are pure content → static prerender (no `force-dynamic`).
- **KTD3 — Honest placeholders.** Use Interact Sf. Sava as the organizer/controller and the existing support email; mark the bits only the user can confirm (legal entity, exact contact, any DPO) inline so they're easy to finish. Name the real processors (Stripe/Resend/Supabase) since those are facts of the build.

## Implementation Units

### U1. Shared legal shell + Terms page
- **Goal:** `/termeni` renders the ticketing terms in the light shell.
- **Requirements:** R1, R4. (KTD1, KTD2)
- **Files:** create `web/components/legal/LegalPage.tsx`, `web/app/termeni/page.tsx`
- **Approach:** `LegalPage` = `.sp-light` root + `FlowNav` + a centered prose column + title + last-updated. Terms content: who sells (Interact Sf. Sava), what a ticket is, price/RON, payment via Stripe, delivery (email + in-app QR), entry/scan rules (one use), refunds/cancellations policy, comp tickets, liability, changes, contact.
- **Test scenarios:** Test expectation: none — static content page, no behavior. Verify it prerenders (○) at build + renders light.
- **Verification:** `npm run build` shows `/termeni` static; page is light + readable.

### U2. Privacy / GDPR page
- **Goal:** `/confidentialitate` renders the privacy notice.
- **Requirements:** R2, R4.
- **Dependencies:** U1 (shell).
- **Files:** create `web/app/confidentialitate/page.tsx`
- **Approach:** Use `LegalPage`. Cover: controller identity + contact; data collected (checkout: name, email; membership: name, email, phone, class, motivation, tracks, availability; scans: check-in time); purposes + legal basis (contract for tickets, consent for membership/marketing); processors (Stripe — payments; Resend — email; Supabase — hosting/DB; Vercel — hosting); no card data stored by us; retention; rights (access, rectification, erasure, portability, objection, complaint to ANSPDCP); cookies/essential only; changes.
- **Test scenarios:** Test expectation: none — static content. Verify prerender + light render.
- **Verification:** Build shows `/confidentialitate` static.

### U3. Wire consent links
- **Goal:** Checkout + membership consent copy links to the two pages.
- **Requirements:** R3.
- **Dependencies:** U1, U2.
- **Files:** modify `web/app/[slug]/checkout/CheckoutClient.tsx`, `web/app/devino-membru/MembershipForm.tsx`
- **Approach:** Turn the plain "termenii" / "politica de confidențialitate" / "regulamentul intern" text into `<Link>`/`<a>` to `/termeni` + `/confidentialitate` (open in same tab; styled as the existing accent link). Keep the GDPR checkbox behavior unchanged.
- **Test scenarios:** Test expectation: none — link wiring. Verify the links resolve at build (routes exist) and the consent checkbox still gates submit.
- **Verification:** Build clean; links point at the new routes.

## Scope Boundaries
- **Not legal advice.** The copy is a practical draft; the user confirms entity/contact specifics and may have a lawyer review.
### Deferred to Follow-Up Work
- A cookie-consent banner (the app uses only essential cookies — Supabase auth/session; no analytics/ads, so no banner needed today).
- A separate long-form "regulament intern" for members (the Terms page covers the public ticketing terms; member rules can be a later doc).

## Open Questions
- Exact legal entity / contact email for the controller line (default: Interact Sf. Sava + the project support email) — user to confirm.
