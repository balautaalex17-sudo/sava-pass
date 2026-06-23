# SavaPass — Full-Stack Build Plan

> From prototype to production. Sources: [PRODUCT.md](PRODUCT.md) (vision + design system), [HANDOFF.md](HANDOFF.md) (code structure, data contract), `src/` (visual contract).
> The production app lives in **`web/`** — the prototype at root stays untouched as the visual reference.

---

## 0. Stack decision

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Server actions + API routes + SSR ticket pages in one deployable. HANDOFF suggested Vite+React, but that needs a separate API server; Next is the smaller total system. Same stack as nexus-work. |
| DB / Auth / Realtime | **Supabase** (Postgres + RLS + Auth + Realtime) | Matches CLAUDE.md next steps; MCP tooling already connected. |
| Payments | **Stripe Checkout** (test → live) | Simplest hosted checkout; RON supported. Netopia only if Stripe activation fails for the club. |
| Email | **Resend** + React Email | `SP_EMAILS` templates map 1:1. |
| Styling | **Tailwind v4** with tokens from `src/tokens.css` as `@theme` vars | Pixel-parity via exact token values; fast with Claude Code. |
| Icons / QR / Scan | `lucide-react` / `qrcode` / `@zxing/browser` | Per CLAUDE.md next steps. |
| Deploy | **Vercel** | Already used in workspace. |

---

## 1. PRD

### Problem
Interact Sf. Sava sells event tickets by hand (cash, lists, Instagram DMs). No receipts, no entry control, double entries possible, revenue tracking is manual.

### Goal (v1)
One web app where a student buys a ticket in <60 seconds without an account, receives a QR by email, and an organizer scans it at the door with their phone. The board sees sales and check-ins live.

### Personas (from PRODUCT.md)
1. **Guest/Student (buyer)** — account-free: view event → pay → get QR → show at door.
2. **Organizer (scanner)** — logs in, scans QRs, sees green/red result instantly.
3. **Admin (board)** — logs in, edits the event, watches revenue/check-ins, exports attendees.

### Success metrics
- 100% of tickets issued digitally with QR; zero double-entries at the door.
- Scan-to-verdict < 2 seconds.
- Buyer flow completable on a phone in under a minute.
- Board can export the attendee list as CSV at any moment.

### Scope
| v1 (ship) | v2 (later) |
|---|---|
| Single active event (DB-enforced) | Multiple simultaneous events |
| 1 ticket per order | Multi-ticket orders (schema already supports `quantity`) |
| Stripe Checkout (hosted) | Embedded checkout, Apple/Google Pay buttons |
| Email with QR + ticket link | Day-of reminder email (cron) |
| Live dashboard via Supabase Realtime | Albums / post-event page |
| Wallet-style ticket (default variant) | Membership/recruitment module (`applicants`, documented in HANDOFF §4–5) |

### Non-goals (explicit, from PRODUCT.md)
Marketplace features, dark mode, native app, seat selection, self-service refunds, multi-club support.

### Constraints
- All copy in **Romanian**, centralized in one file (mirrors prototype's `data.js` approach).
- Light mode only. Mobile-first, content max 440px; admin desktop to 1200px.
- Design system in PRODUCT.md §3 is **binding** — tokens, voice, motion, no emoji.
- Buying never requires an account. Possession of the emailed link = possession of the ticket.

---

## 2. Database schema (Supabase migration)

```sql
-- ===== enums =====
create type event_status     as enum ('draft','active','past');
create type order_status     as enum ('pending','paid','failed','refunded');
create type ticket_status    as enum ('valid','in','used','void');
create type scan_result      as enum ('ok','already_in','already_used','invalid','void_ticket');
create type staff_role       as enum ('admin','organizer');
create type applicant_status as enum ('submitted','reviewing','interview_invited',
                                      'interview_scheduled','accepted','rejected'); -- v2

-- ===== staff =====
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text not null,
  role       staff_role not null default 'organizer',
  created_at timestamptz not null default now()
);

-- ===== events =====
create table public.events (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,            -- "echoes-unplugged"
  title      text not null,
  subtitle   text,
  starts_at  timestamptz not null,
  doors      text not null default '19:00',
  date_label text not null,                   -- "Vin · 14 Nov"
  date_long  text not null,                   -- "Vineri, 14 noiembrie 2026"
  venue      text not null,
  venue_line text,
  price_bani integer not null check (price_bani >= 0),  -- 45 RON = 4500
  capacity   integer not null check (capacity > 0),
  status     event_status not null default 'draft',
  accent     text,                            -- hex accent from prototype
  photo_url  text,
  about      text,
  program    jsonb not null default '[]',     -- [{ "t":"19:00", "l":"Doors" }]
  perks      jsonb not null default '[]',     -- ["Welcome drink", ...]
  created_at timestamptz not null default now()
);
-- business rule from PRODUCT.md: one active event at a time
create unique index one_active_event on public.events (status) where (status = 'active');

-- ===== orders =====
create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  event_id              uuid not null references public.events,
  buyer_name            text not null,
  buyer_email           text not null,
  quantity              integer not null default 1 check (quantity between 1 and 4),
  amount_bani           integer not null,
  currency              text not null default 'ron',
  stripe_session_id     text unique,
  stripe_payment_intent text,
  status                order_status not null default 'pending',
  created_at            timestamptz not null default now(),
  paid_at               timestamptz
);

-- ===== tickets ===== (HANDOFF §5: valid → in → used; void = cancelled)
create table public.tickets (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders,
  event_id      uuid not null references public.events,
  code          text not null unique,   -- "K7F2MQ", mono font under the QR
  qr_token      text not null unique,   -- HMAC-signed token (§7), the QR payload
  holder_name   text not null,
  holder_email  text not null,
  status        ticket_status not null default 'valid',
  issued_at     timestamptz not null default now(),
  checked_in_at timestamptz
);
create index tickets_event_idx on public.tickets (event_id, status);

-- ===== scans (audit log, feeds admin ScanLog) =====
create table public.scans (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events,
  ticket_id  uuid references public.tickets,   -- null when result = 'invalid'
  scanned_by uuid not null references public.profiles(id),
  result     scan_result not null,
  created_at timestamptz not null default now()
);
create index scans_event_time_idx on public.scans (event_id, created_at desc);

-- ===== applicants (v2 — membership, HANDOFF §4) =====
create table public.applicants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  school     text,
  email      text not null,
  track      text,
  status     applicant_status not null default 'submitted',
  slot       timestamptz,
  applied_at timestamptz not null default now()
);

-- ===== derived stats (sold / checked_in are NEVER stored columns) =====
create view public.event_stats with (security_invoker = true) as
select e.id as event_id,
       count(t.id) filter (where t.status <> 'void')        as sold,
       count(t.id) filter (where t.status in ('in','used')) as checked_in
from public.events e
left join public.tickets t on t.event_id = e.id
group by e.id;
```

Notes:
- Prototype's `sold` / `checkedIn` fields become derived counts — never stored, never drift.
- Public pages get "X locuri rămase" from a **server component using the service role** (anon can't read `tickets`, so the view returns 0 for anonymous users — that's intentional).
- Seed migration ports the three events from `src/data.js` (`SP_EVENTS`); `echoes` is the one `active`, the other two `past`.

---

## 3. User flows

### 3.1 Buyer (account-free, the critical path)
1. Lands on `/` (landing) or directly on `/echoes-unplugged` (shared link).
2. Event page: poster, date/venue/price facts, program, perks, "Locuri rămase", sticky CTA **"Cumpără bilet — 45 RON"**.
3. `/echoes-unplugged/checkout`: name + email + GDPR checkbox → server action creates a `pending` order + Stripe Checkout session → redirect to Stripe.
4. Pays on Stripe (test card in dev).
5. Stripe webhook fires → order `paid` → ticket issued (code + signed `qr_token`) → Resend email "Biletul tău" with QR image + button to `/bilet/[token]`.
6. Redirected to `/succes?session_id=…` → "Ești înăuntru." + link to the ticket. If the webhook hasn't landed yet, the page polls the order status and shows "Se emite biletul…" until it flips.
7. `/bilet/[token]`: Wallet-style ticket — gradient header, QR, 6-char code in mono, holder name, event facts. This URL **is** the ticket.

Edge cases: payment abandoned → order stays `pending`, no ticket, no email. Sold out → checkout action refuses before creating a session, CTA shows "Sold out". Capacity re-checked in the webhook before issuing.

### 3.2 Organizer — scan at the door
1. `/login` (Supabase email+password) → redirected to `/scanner`.
2. Camera viewfinder (PRODUCT.md scanner design: dark UI, cyan reticle). `@zxing/browser` decodes the QR.
3. Decoded token → server action `scanTicket(token)`:
   - verify HMAC signature (reject garbage offline-fast),
   - atomic transition: `update tickets set status='in', checked_in_at=now() where qr_token=$1 and status='valid' returning *`,
   - 0 rows → look up why: `in`/`used` → "already" verdict; missing → invalid,
   - insert a `scans` row with the verdict either way.
4. UI verdict per design system: green ring expand 380ms (ok) / red 6px shake (already/invalid), name + code shown, auto-rearm after ~1.5s.

Double-scan race (two doors, same ticket): the single atomic UPDATE guarantees exactly one `ok`.

### 3.3 Admin — board
1. `/login` → `/admin` (role `admin` required; organizers see only `/scanner`).
2. Dashboard (parity with prototype `admin.jsx`): stat cards (sold, revenue, checked-in %), 14-day revenue chart (group `orders.paid_at` by day), check-in dial, attendees table with status filters + search, **live scan log** (Supabase Realtime on `scans`), past events archive.
3. Export CSV → `/api/admin/export?event=…` (name, email, code, status, checked_in_at).
4. Event editor `/admin/event`: edit the active event, set price/capacity, upload poster (Supabase Storage), publish draft → active (the partial unique index makes activating a second event fail loudly — editor must archive the current one first).

### 3.4 Applicant (v2)
`/aplica` form → `submitted` → staff move through pipeline → each transition sends the matching `SP_EMAILS` template → interview slot picker → accepted/rejected.

---

## 4. Page list (App Router)

```
web/app/
  (public)/
    page.tsx                      /                      landing (responsive: website.jsx + website-mobile.jsx merged)
    [slug]/page.tsx               /echoes-unplugged      event details (EventScreen)
    [slug]/checkout/page.tsx      /…/checkout            checkout form (CheckoutScreen)
    succes/page.tsx               /succes?session_id=    payment success (SuccessScreen)
    bilet/[token]/page.tsx        /bilet/SP1.…           the ticket (TicketScreen, wallet variant)
  (staff)/
    login/page.tsx                /login                 staff sign-in
    scanner/page.tsx              /scanner               organizer scanner (ScannerScreen)
    admin/page.tsx                /admin                 dashboard (AdminDashboard)
    admin/event/page.tsx          /admin/event           event editor
  api/
    webhooks/stripe/route.ts      POST                   Stripe events
    qr/[token]/route.ts           GET                    QR PNG stream (for the email)
    admin/export/route.ts         GET                    attendees CSV (staff only)
  (v2) aplica/page.tsx, aplicant/[id]/page.tsx, admin/aplicanti/page.tsx
```

Static segments (`succes`, `bilet`, `login`, …) take precedence over `[slug]`, so root-level pretty event URLs (`savapass.ro/echoes-unplugged`, as in the prototype) are safe.

Middleware: `(staff)` routes require a Supabase session; `/admin/*` additionally requires `profiles.role = 'admin'`.

---

## 5. Component map (prototype → production)

| Prototype (`src/`) | Production (`web/`) | Notes |
|---|---|---|
| `tokens.css` | `app/globals.css` `@theme` | Exact hex values; fonts via `next/font` |
| `data.js` SP_EVENTS | DB seed migration | Content moves to Postgres |
| `data.js` copy strings | `lib/copy.ts` | All Romanian strings, one file |
| `data.js` SP_EMAILS | `emails/*.tsx` (React Email) | v1 ships only "Biletul tău" |
| `components.jsx` Button, Field, Chip, Eyebrow, Logo | `components/ui/*` | Port 1:1, Tailwind |
| `components.jsx` Icon | `lucide-react` direct | stroke 1.75, sizes per PRODUCT.md §3 |
| `components.jsx` QR (decorative) | `qrcode` lib | Real payload now |
| `screens-mobile.jsx` HomeScreen + `website*.jsx` | `(public)/page.tsx` + `components/landing/*` | One responsive landing (chat2 brand-led version) |
| `screens-mobile.jsx` EventScreen | `[slug]/page.tsx` + `components/event/*` | |
| `screens-mobile.jsx` CheckoutScreen | `[slug]/checkout/page.tsx` | Stripe redirect replaces the mock pay |
| `screens-mobile.jsx` SuccessScreen | `succes/page.tsx` | |
| `screens-mobile.jsx` TicketScreen | `bilet/[token]/page.tsx` + `components/ticket/*` | **Wallet variant only**; minimal/boarding stay reference |
| `screens-mobile.jsx` ScannerScreen | `scanner/page.tsx` + `components/scanner/*` | Real camera via `@zxing/browser` |
| `admin.jsx` AdminDashboard, StatCard, RevenueChart, CheckInDial, AttendeesTable, ScanLog | `admin/page.tsx` + `components/admin/*` | ScanLog goes Realtime |
| `ios-frame.jsx`, `browser-window.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx`, `animations.jsx`, `flow-video.jsx` | **not ported** | Presentation chrome for the prototype only |
| `membership.jsx` (missing locally) | v2 `components/membership/*` | Rebuild from HANDOFF §3–5 contract when prioritized |

---

## 6. API routes & server actions

| Name | Kind | Auth | Does |
|---|---|---|---|
| `createCheckout(slug, name, email)` | server action | public | Validate (zod) → check seats left → insert `pending` order → create Stripe Checkout session (RON, `success_url=/succes?session_id={CHECKOUT_SESSION_ID}`) → return redirect URL |
| `POST /api/webhooks/stripe` | route handler | Stripe signature | On `checkout.session.completed`: order → `paid`; re-check capacity; generate `code` + `qr_token`; insert ticket; send "Biletul tău" via Resend. **Idempotent** (skip if order already `paid`). |
| `getOrderBySession(sessionId)` | server action | public (unguessable id) | Success-page polling: returns `{status, ticketToken?}` |
| `/bilet/[token]` | server component | token = auth | Verify HMAC → fetch ticket via service role → render |
| `GET /api/qr/[token]` | route handler | token = auth | Verify HMAC → stream QR PNG (embedded in email) |
| `scanTicket(token)` | server action | staff session | §3.2 atomic transition + scan log insert → verdict |
| `getDashboard(eventId)` | server queries | staff | Stats, chart series, attendees, scan log |
| `GET /api/admin/export` | route handler | staff | CSV download |
| `upsertEvent(data)`, `setEventStatus(id, status)` | server actions | admin | Event editor |

All mutations server-side. The browser never holds the service-role key and never writes to the DB directly.

---

## 7. Security rules

### QR token design (HANDOFF §7.3: "token semnat, nu doar ID-ul")
```
qr_token = "SP1." + ticketId + "." + base64url(hmac_sha256(ticketId, QR_SIGNING_SECRET))
```
- Forging a valid token requires the server secret; a guessed UUID fails the HMAC before any DB hit.
- Verdict always comes from the DB row (status), never from the token alone — so `void` and re-scans work.
- `QR_SIGNING_SECRET` is server-only, separate from Stripe/Supabase keys.

### RLS (in the same migration)
```sql
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from profiles where id = auth.uid()); $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin'); $$;

alter table public.events     enable row level security;
alter table public.orders     enable row level security;
alter table public.tickets    enable row level security;
alter table public.scans      enable row level security;
alter table public.profiles   enable row level security;
alter table public.applicants enable row level security;

-- events: world reads published; only admin writes
create policy events_read  on events for select using (status in ('active','past') or is_staff());
create policy events_write on events for all    using (is_admin()) with check (is_admin());

-- orders / tickets: staff read-only from the client; ALL writes via service role (bypasses RLS)
create policy orders_staff_read  on orders  for select using (is_staff());
create policy tickets_staff_read on tickets for select using (is_staff());

-- scans: staff read + insert (Realtime subscriptions respect this select policy)
create policy scans_staff_read   on scans for select using (is_staff());
create policy scans_staff_insert on scans for insert with check (is_staff() and scanned_by = auth.uid());

-- profiles: self or admin
create policy profiles_read on profiles for select using (id = auth.uid() or is_admin());

-- applicants (v2): anyone applies, staff manage
create policy applicants_insert on applicants for insert with check (true);
create policy applicants_read   on applicants for select using (is_staff());
create policy applicants_update on applicants for update using (is_staff());
```

### App-level
- Stripe webhook verifies `stripe-signature` against `STRIPE_WEBHOOK_SECRET`; handler idempotent.
- Atomic single-UPDATE check-in (no read-then-write) kills the double-scan race.
- zod validation on every action input; checkout normalizes/lowercases email.
- Middleware gates `(staff)`; `/admin` additionally checks role server-side (not just in UI).
- Buyer PII minimal: name + email only, shown only on their own ticket page and to staff.
- No indexing of ticket pages (`robots: noindex` on `/bilet/*`).

### Env vars
```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          (server only)
STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RESEND_API_KEY
QR_SIGNING_SECRET                  (server only, 32+ random bytes)
NEXT_PUBLIC_SITE_URL
```

---

## 8. Implementation order

| Phase | Ships | Done when |
|---|---|---|
| **0 — Scaffold** | `web/` Next app, tokens, fonts, deps, Supabase schema + seed | `npm run build` green; token test page matches prototype colors/type |
| **1 — Public pages** | Landing, event page, from DB | Side-by-side visual parity with prototype canvas |
| **2 — Purchase** | Checkout → Stripe test → webhook → ticket + email → success + ticket page | Full test purchase delivers email with working QR link |
| **3 — Scanner** | Staff auth, camera scan, atomic check-in, verdict animations | Phase-2 ticket scans green once, red on re-scan |
| **4 — Admin** | Dashboard, realtime scan log, CSV export, event editor | Board can run an event without touching Supabase Studio |
| **5 — Launch** | SEO/OG, a11y pass, error pages, Vercel deploy, Stripe live | Real purchase on production domain |
| **6 — v2** | Membership module, reminders, multi-ticket | — |

Each phase = one focused Claude Code session + one commit. Don't start phase N+1 with phase N's acceptance unmet.

---

## 9. Exact prompts for Claude Code

Run **in order, one per session**, from `projects/sava-pass/`. Commit after each phase. If a build fails, paste the error back into the same session.

### Prompt 0 — Scaffold + database

```text
Read PLAN.md sections 0, 2 and 7, then PRODUCT.md section 3 (design system).

Scaffold the production app in web/ (prototype at root stays untouched):
1. create-next-app in web/: TypeScript, App Router, Tailwind, ESLint, no src dir.
2. Port every token from src/tokens.css into web/app/globals.css as Tailwind v4
   @theme variables — exact same names and hex values. Load Manrope, Instrument
   Serif and JetBrains Mono with next/font/google and wire them to the font tokens.
3. Install: @supabase/supabase-js @supabase/ssr stripe resend qrcode @zxing/browser
   lucide-react zod react-email @react-email/components
4. Create lib/supabase/client.ts (browser, anon), lib/supabase/server.ts (SSR,
   cookies) and lib/supabase/admin.ts (service role, server-only). Create
   .env.local.example with every var from PLAN.md §7 "Env vars".
5. Apply PLAN.md §2 schema + §7 RLS as ONE Supabase migration via the Supabase MCP.
   Then a seed migration: port the three events from src/data.js (SP_EVENTS) —
   echoes-unplugged as 'active', the other two as 'past'. Prices in bani (45 RON = 4500).
   Copy the three poster images from assets/ into web/public/events/.
6. Make a throwaway /dev/tokens page rendering all color tokens + the three fonts.

Acceptance: npm run build passes; /dev/tokens matches the prototype palette
(open SavaPass Prototype.html via python -m http.server to compare). Don't build
any real screens yet.
```

### Prompt 1 — Public pages, visual parity

```text
Read PLAN.md §3.1, §4, §5 and PRODUCT.md §3 (binding design system). The visual
contract is the prototype: serve the root folder (python -m http.server 8080) and
open "SavaPass Prototype.html". Grep src/website.jsx, src/website-mobile.jsx and
the HomeScreen/EventScreen sections of src/screens-mobile.jsx — don't read whole
files blindly.

Build in web/:
1. / — responsive landing, brand-led version from chats/chat2.md: hero pitch
   ("Biletul tău pentru fiecare seară Interact") + stat strip + fanned poster
   stack, "Cum funcționează" (3 steps), events strip (featured active event +
   past grid), "Despre Interact", footer. Desktop = website.jsx, mobile =
   website-mobile.jsx — one responsive page, content max per design system.
2. /[slug] — event details matching EventScreen: poster hero with --grad-night
   protection, date/doors/venue/price facts, program timeline, perks, "X locuri
   rămase" (server component, service role, via event_stats), sticky bottom CTA
   "Cumpără bilet — 45 RON" linking to /[slug]/checkout.
3. All events come from Supabase. All copy Romanian, centralized in lib/copy.ts.
   notFound() for unknown slugs. Use generateMetadata for titles.

Rules: only token values (no hardcoded hexes), no emoji, sentence case, voice
per PRODUCT.md §3. Acceptance: npm run build green; / and /echoes-unplugged
visually match the prototype side by side on 390px and 1440px widths.
```

### Prompt 2 — Purchase: Stripe → ticket → email

```text
Read PLAN.md §3.1, §6, §7 and grep src/screens-mobile.jsx for CheckoutScreen,
SuccessScreen and TicketScreen (wallet variant) as the visual contract.

Build the money path in web/:
1. /[slug]/checkout — name + email + GDPR consent checkbox, zod-validated server
   action createCheckout per PLAN.md §6: refuse if sold out (event_stats vs
   capacity), insert pending order, create Stripe Checkout session (currency ron,
   amount price_bani, success_url /succes?session_id={CHECKOUT_SESSION_ID},
   cancel_url back to checkout), redirect.
2. POST /api/webhooks/stripe — verify signature; on checkout.session.completed:
   idempotently mark order paid, re-check capacity, generate code (6 chars from
   A-Z/2-9, no ambiguous glyphs) and qr_token per PLAN.md §7 HMAC format, insert
   ticket, send "Biletul tău" email (React Email + Resend): event facts, QR image
   via /api/qr/[token], button to /bilet/[token]. Romanian voice per PRODUCT.md.
3. GET /api/qr/[token] — verify HMAC, stream PNG (qrcode lib) of the raw token.
4. /succes — poll getOrderBySession server action every 2s until paid (show
   "Se emite biletul…"), then "Ești înăuntru." + CTA to the ticket, per
   SuccessScreen design.
5. /bilet/[token] — verify HMAC server-side, fetch via service role, render the
   WALLET ticket variant: gradient header, QR, mono code, holder name, event
   facts, status chip. robots noindex. Invalid/missing token → friendly 404.

Test with Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe,
card 4242 4242 4242 4242. Acceptance: full test purchase = order paid + ticket row
+ email received + /bilet/[token] renders; abandoned session issues nothing.
```

### Prompt 3 — Staff auth + scanner

```text
Read PLAN.md §3.2, §6, §7 and grep src/screens-mobile.jsx for ScannerScreen
(dark UI, cyan reticle, verdict states) as the visual contract.

Build in web/:
1. Supabase Auth (email+password). /login per design system. Middleware: (staff)
   routes need a session; /admin/* needs profiles.role='admin' (checked
   server-side too). Organizer lands on /scanner.
2. /scanner — camera via @zxing/browser (getUserMedia, back camera), continuous
   decode, manual-code fallback input (the 6-char code).
3. scanTicket(token) server action per PLAN.md §3.2: HMAC check first; then ONE
   atomic UPDATE tickets SET status='in', checked_in_at=now() WHERE qr_token=$1
   AND status='valid' RETURNING *; on 0 rows, resolve verdict (already_in /
   already_used / invalid / void_ticket); ALWAYS insert into scans with
   scanned_by = auth.uid(). Return {verdict, holderName?, code?}.
4. Verdicts per PRODUCT.md motion rules: ok = green ring expand 380ms ease-spring;
   already/invalid = red + 6px horizontal shake 160ms ×2. Show name + code.
   Auto-rearm after 1.5s. Respect prefers-reduced-motion.
5. Seed one admin + one organizer profile (document the SQL in web/README.md).

Acceptance: the phase-2 ticket scans green exactly once, red "already" after;
random QR shows invalid; every attempt lands in scans; /scanner unauthenticated
redirects to /login.
```

### Prompt 4 — Admin dashboard

```text
Read PLAN.md §3.3, §6 and grep src/admin.jsx for AdminDashboard, StatCard,
RevenueChart, CheckInDial, AttendeesTable, ScanLog — that's the visual contract
(desktop 1200px).

Build in web/:
1. /admin — stat cards (sold, revenue RON, checked-in %), 14-day revenue chart
   from orders.paid_at (no chart lib — bars/SVG like the prototype), check-in
   dial, attendees table (search + status filter valid/in/used), scan log, past
   events archive with their stats.
2. Realtime: subscribe to INSERTs on scans (Supabase Realtime, RLS applies) —
   scan log and check-in numbers update live without refresh.
3. GET /api/admin/export?event=ID — staff-gated CSV (name, email, code, status,
   checked_in_at), filename savapass-attendees-[slug].csv.
4. /admin/event — edit active event fields (title, date fields, venue, price in
   RON converted to bani, capacity, about, program rows, perks, accent), poster
   upload to Supabase Storage (public bucket events/), draft→active→past status
   control. Surface the one-active-event constraint as a friendly error telling
   the admin to archive the current event first.

Acceptance: build green; scanning on a phone moves the dashboard live; CSV opens
in Excel with diacritics intact (UTF-8 BOM); price round-trips correctly.
```

### Prompt 5 — Polish + deploy

```text
Read PLAN.md §1 (success metrics), §7, §8 and HANDOFF.md §7.7.

Launch pass on web/:
1. A11y: contrast on cyan, visible focus states (cyan ring per design system),
   tap targets ≥44px, prefers-reduced-motion everywhere animated.
2. OG/SEO: metadata + OG image for / and /[slug] (poster-based); noindex on
   /bilet/*, /scanner, /admin, /succes.
3. Error states: global error.tsx + not-found.tsx in design language ("Pagina nu
   există" + rotary watermark 8% per PRODUCT.md); friendly Stripe failure path.
4. Empty states: landing/dashboard with zero active events.
5. Deploy to Vercel: project web/, all env vars, Supabase prod values, Stripe
   LIVE keys + production webhook endpoint (register in Stripe dashboard, set
   real STRIPE_WEBHOOK_SECRET), NEXT_PUBLIC_SITE_URL to the real domain.
6. Smoke test on production: 1 RON real purchase → email → scan → refund from
   Stripe dashboard; verify order flips to refunded (handle charge.refunded in
   the webhook by voiding the ticket).

Acceptance: production purchase + scan works end to end; Lighthouse mobile ≥90
on / and /[slug].
```

### Prompt 6 — v2: membership module (when prioritized)

```text
Read HANDOFF.md §3 (membership.jsx), §4 (Applicant + Email template contracts),
§5 (applicant state machine) and PLAN.md §2 (applicants table, already migrated).
The original membership.jsx is NOT in this repo — rebuild from the documented
contract, reusing components/ui and the design system.

Build: /aplica public form (name, school, email, track) → insert applicant +
confirmation email; /admin/aplicanti pipeline board with stage transitions, each
firing its SP_EMAILS-style template (port subjects/bodies from HANDOFF §4 shape);
interview slot picker; /aplicant/[id] status page (signed token link, same HMAC
pattern as tickets). Acceptance: full pipeline submitted→accepted sends the right
email at every step.
```

---

*Update this file as decisions change — it is the build contract. Visual questions → PRODUCT.md. Code-structure questions → HANDOFF.md.*
