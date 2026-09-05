# SavaPass Vibe-Code Security Audit

Audit date: 2026-08-19  
Audit mode: read-only, except for this report  
Repository: `sava-pass`  
Branch and commit: `perf/pagespeed-mobile-green` at `9c001350b0741715cb2e6daec2bd99c9fdae6119`  
Release candidate: local dirty worktree in `web/`  
Live application checked: `https://www.interactsfsava.com`  
Live Supabase project checked: `shzyvrojbtbczqqoilip`

## Direct answer

Yes. SavaPass has a solid security base, but it needs fixes before unrestricted public ticket sales. Two findings are High severity:

1. low-privilege operational staff can bypass the admin upload action and directly upload, overwrite, or delete public media;
2. anonymous, concurrent checkout requests can oversell an event or reserve all capacity without payment.

No hardcoded production secret, anonymous database-table exposure, ticket forgery, or direct admin authentication bypass was found.

## Remediation update: 2026-08-19

All 11 numbered findings are remediated in the local working tree. The original
finding text remains below as the evidence snapshot from before the fixes.

| Finding | Local status | Main remediation |
|---|---|---|
| #1 | Fixed | Central validated server environment; both cron routes fail closed and compare bearer secrets in constant time. |
| #2 | Fixed | Migration removes every direct authenticated media write policy, constrains the public bucket, and introduces private signed-upload staging. |
| #3 | Fixed | Idempotent atomic reservation RPC, event lock, universal capacity trigger, stale-reservation maintenance, and atomic notification claiming. |
| #4 | Fixed | One origin-normalizing redirect helper rejects slash, backslash, encoded-backslash, absolute-URL, and control-character escapes. |
| #5 | Fixed | Zod/database length constraints, 128 KB public proxy guard, signed media upload, and a global 1 MB Server Action cap. |
| #6 | Fixed | Shared CSV encoder neutralizes formula prefixes in both attendance export implementations. |
| #7 | Fixed | Patched `nanoid` override; `npm audit --audit-level=low` reports zero vulnerabilities. |
| #8 | Fixed | Unused npm copies of `gsap` and `lenis` removed; the intentional vendored browser files remain. |
| #9 | Fixed | PostgreSQL-backed HMAC rate limits on checkout, contact, recruitment, password setup, and the staff test shortcut. |
| #10 | Fixed | CSP baseline, anti-framing, `nosniff`, referrer, permissions, HSTS, and source-map settings. |
| #11 | Fixed locally | Foundational migration, complete ordered migration set, inert legacy snapshot, fresh-database CI job, and real production `/dev/*` 404 proxy block. |

Verification completed locally: type check, production build (81 pages), 25 focused
tests, lint with zero errors, dependency audit with zero vulnerabilities,
and runtime checks for headers, fail-closed cron behavior, and oversized public
requests. A local database reset could not run because this machine has no Docker,
Podman, or PostgreSQL runtime; the new GitHub CI job is configured to perform that
disposable reset.

One production account setting remains outside the codebase: the live Supabase
Security Advisor still reports leaked-password protection disabled. Enable it in
Supabase Auth before launch and rerun the advisor.

Production is not changed by these local edits. Before the fixes protect the live
application, review and apply `20260819143420_security_audit_remediation.sql`, set a
32+ character `CRON_SECRET`, enable leaked-password protection, regenerate Supabase
types, and deploy this exact code.

## Scope and limits

Pass 1 covered all first-party application code, route handlers, Server Actions, configuration, scripts, tests, SQL schema, and local migrations. Generated build output, dependency source, and binary media were inventoried rather than reviewed line by line; dependency metadata and security-relevant Supabase SSR defaults were inspected separately.

Live checks covered Supabase tables, policies, function privileges, Storage buckets, the Supabase Security Advisor, public HTTP headers, CORS behavior, source-map exposure, and selected unauthenticated endpoints. The audit deliberately did not create fake orders, upload malicious files, mutate production data, or run integration tests that point at production.

Two limitations matter:

- Vercel rejected environment-variable enumeration with `403`, so the production value of `STAFF_TEST_LOGIN_ENABLED` could not be confirmed after two safe attempts. This is marked Partial, not assumed safe or unsafe.
- `gitleaks` was not installed. Git history was instead scanned across 69 commits for env filenames and high-confidence secret prefixes. No match was found, but this is not equivalent to a dedicated entropy-aware scanner.

## Pass 1: architecture and data flow

### Architecture

- Next.js 16.3 App Router hosted on Vercel.
- Supabase Auth, PostgreSQL, Row Level Security (RLS), and Storage. RLS is a database rule that decides which rows each signed-in or anonymous client may access.
- Server-only Supabase service-role client for privileged writes.
- Resend for transactional email.
- Cash/free ticket reservations, with HMAC-SHA256 signed QR tokens. HMAC is a keyed signature that makes a modified token fail verification.
- Browser QR scanning through ZXing.
- No active inbound Stripe webhook and no AI/LLM feature in this release candidate.

### Entry-point inventory

The production build contains 54 page routes, 15 route handlers, 22 modules containing `"use server"`, 5 layouts, and one Next.js Proxy. The main trust boundaries are:

| Flow | Untrusted input | Server boundary | Sensitive effect |
|---|---|---|---|
| Public checkout | event slug, ticket type, name, email | `app/[slug]/checkout/actions.ts` | order, ticket, QR, email |
| Recruitment/contact | form fields and spreadsheet import | public Server Actions and protected import routes | personal data, staff notifications |
| Account/staff access | Supabase cookies and redirect path | `proxy.ts`, layouts, action/route guards | member, board, scanner, and admin access |
| Ticket/attendance scanning | QR token | protected routes plus atomic Postgres RPCs | check-in, payment, audit records |
| Media library | admin form files or direct Storage API | admin Server Action or Storage RLS | public website assets |
| Scheduled notifications | bearer secret | `/api/notifications/due` | outbound email |

The local release candidate and live deployment are not perfectly reproducible from Git: 27 of 32 local migrations are untracked, and live `/dev/*` behavior does not match the current source guard. Live database and HTTP findings are therefore identified as live evidence; code findings describe the inspected local release candidate.

## Pass 2: all 41 checklist verdicts

### Section 1: Environment Variables and Secret Management

#### 1.1 - Hardcoded secrets: ✅ PASS

No real key, token, password, connection string, or webhook secret was found in tracked source or the scanned Git history. Test-looking values are placeholders or fixtures. Server secrets are read from environment variables, for example `web/lib/supabase/admin.ts:8-11` and `web/lib/qr-token.ts:5-9`.

#### 1.2 - `.gitignore` coverage: ✅ PASS

Root `.gitignore:3-4` ignores `.env` and `.env.local`; `web/.gitignore:34` ignores `.env*`. No env file appeared in Git history. The ignored local `.env.local` was checked only for variable names, placeholder markers, and prefix classification; secret values were not printed into the audit log.

#### 1.3 - Public prefix leaks: ✅ PASS

Only intentionally public values use `NEXT_PUBLIC_`, including the Supabase URL and anon key. The service-role key, Resend key, QR signing secret, cron secret, and staff-test credentials have no public prefix and are referenced only by server-side modules.

#### 1.4 - Console/error leaks: ⚠️ PARTIAL

Client-visible responses are generally generic and no secret is printed. Server code does log raw Supabase or email-provider error objects, for example `web/app/(club)/contact/actions.ts:45,62`, and the client error boundary logs the received error object. These logs are operationally useful, but should be structured and redacted before sending them to a third-party log drain.

#### 1.5 - Build artifact exposure: ✅ PASS

`web/next.config.ts` does not enable `productionBrowserSourceMaps`. A live request for a production JavaScript `.map` returned `403`, so source maps were not publicly retrievable.

#### 1.6 - Startup validation: ❌ FAIL

There is no central environment schema or startup check. Several modules fail only when first used, and `/api/keep-warm` becomes public when `CRON_SECRET` is absent. The live endpoint returned `200` without authorization. See Finding #1.

### Section 2: Database Security

#### 2.1 - RLS enabled: ✅ PASS

Live catalog inspection found RLS enabled on all 41 application tables in the `public` schema. This result was checked against the live database, not inferred only from local SQL. The policy model follows the official [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

#### 2.2 - RLS policies exist: ✅ PASS

All 41 live public tables have at least one policy. Tables without a client `INSERT` policy intentionally deny client inserts because writes go through server code; adding universal SELECT/INSERT policies would make those tables less secure, not more secure.

#### 2.3 - `WITH CHECK` clauses: ⚠️ PARTIAL

Client-writable ownership and profile policies use `WITH CHECK`, and authenticated profile updates are column-restricted. One legacy `applicants_update` policy omits an explicit `WITH CHECK`; PostgreSQL reuses its `USING` expression for updates when `WITH CHECK` is absent, so no ownership bypass was demonstrated. It should still be made explicit to prevent future misunderstanding.

#### 2.4 - Policy identity source: ✅ PASS

Ownership is based on `auth.uid()` or the verified JWT email claim. No policy trusts editable `user_metadata` for authorization. The email policy is used to link prior tickets to the same authenticated email, not to grant staff roles.

#### 2.5 - Service-role key isolation: ✅ PASS

`web/lib/supabase/admin.ts:4-11` rejects browser execution and reads the service-role key without a public prefix. No Client Component imports the admin module, and no production client bundle exposure was found. Adding `import "server-only"` would be useful hardening but is not a current leak.

#### 2.6 - Storage bucket policies: ❌ FAIL

Policies exist, but they are too broad: every active operational staff role can write, overwrite, and delete the public `media` bucket, while the bucket has no MIME or size constraint. This bypasses the admin-only upload action. See Finding #2.

#### 2.7 - SQL injection: ✅ PASS

Application queries use the parameterizing Supabase client. Dynamic filters are passed as values rather than concatenated SQL. Reviewed RPC calls accept typed parameters, and no raw application SQL execution from user strings was found.

#### 2.8 - `SECURITY DEFINER` functions: ⚠️ PARTIAL

Live public definer functions are executable only by `service_role`, and nearly all security-sensitive functions use an empty `search_path` plus internal permission checks. `admin_set_event_status` still uses `search_path=public`; its current execute grants prevent a client exploit, but it should be schema-qualified and set to an empty path. The stale baseline in `web/supabase/schema.sql:149-159` also does not represent the hardened live helpers. See Finding #11 for reproducibility risk.

### Section 3: Authentication and Session Management

#### 3.1 - Auth middleware exists: ✅ PASS

`web/proxy.ts:8-103` refreshes Supabase cookies and covers protected prefixes. Sensitive layouts, pages, routes, and actions repeat the authoritative server-side identity and permission checks, so Proxy is not the sole control.

#### 3.2 - Default-deny routing: ⚠️ PARTIAL

`web/proxy.ts:4-6` uses a blocklist of protected route prefixes. Current routes were inventoried and protected, but a newly added staff route would be public until somebody remembers to update the list. A public-route allowlist or protected route-group layout would fail safer.

#### 3.3 - `getUser()` vs `getSession()`: ✅ PASS

Security-sensitive server operations use `supabase.auth.getUser()` through the shared authorization helpers. Proxy uses `getSession()` only for cookie refresh and navigation hints, with a code comment explicitly warning that downstream pages/actions must verify authorization.

#### 3.4 - Auth callback handler: ❌ FAIL

The callback safely exchanges the code and does not log tokens, but its `next` validation accepts a backslash payload that URL normalization turns into an external origin. The same validator pattern is reused elsewhere. See Finding #4.

#### 3.5 - Session storage: ⚠️ PARTIAL

Sessions are stored in cookies, not `localStorage` or `sessionStorage`, with SameSite Lax defaults. Supabase SSR deliberately leaves its auth cookie readable by the browser client so token refresh works; therefore it is not `httpOnly`, contrary to the checklist's ideal. This is the provider's documented [SSR model](https://supabase.com/docs/guides/auth/server-side/advanced-guide), but it increases the importance of preventing XSS and deploying a CSP.

#### 3.6 - Protected API routes: ⚠️ PARTIAL

All inspected APIs that read or modify member, candidate, ticket, attendance, or admin data authenticate and authorize on the server. Public APIs are intentional and either token-protected or return public data. The staff-test login can accept any `.vercel.app` hostname when enabled; because Vercel environment access returned `403`, its production flag remains unverified. Production must explicitly force it off.

#### 3.7 - OAuth security: ⬚ N/A

No third-party OAuth login flow is implemented. Supabase email/password and code-exchange flows are used.

#### 3.8 - Password reset flows: ✅ PASS

Reset uses Supabase's one-time code exchange over HTTPS in `web/app/auth/password/confirm/route.ts:4-15`; the app does not persist or log the token. Expiry and single use are enforced by Supabase Auth.

### Section 4: Server-Side Validation

#### 4.1 - Schema validation: ❌ FAIL

Most routes and actions use Zod, and imports have strong row/file limits. Public checkout and contact schemas omit maximum lengths, while the global Server Action parser allows 64 MB. This leaves avoidable resource-consumption and stored-data abuse. See Finding #5.

#### 4.2 - Identity from session: ✅ PASS

Authenticated writes derive the actor from `getUser()` and server-side profile/permission lookup. User-supplied IDs are treated as target resource IDs and checked against permissions; no sensitive write trusts a body `userId` as the actor.

#### 4.3 - Input sanitization: ❌ FAIL

HTML rendering is handled correctly: email templates call `escapeHtml`, React escapes normal output, and dynamic immersive markup is escaped before `dangerouslySetInnerHTML`. However, the attendance CSV does not neutralize spreadsheet formulas in member-controlled values. See Finding #6.

#### 4.4 - HTTP method enforcement: ⚠️ PARTIAL

Application state changes use Server Actions or POST endpoints. `/api/notifications/due` uses GET to send queued emails, but requires a secret bearer token and is intended for cron. POST with the same authentication would reduce accidental triggering and make intent clearer.

#### 4.5 - Error information leaks: ✅ PASS

Public route/action responses use generic messages; stack traces, SQL details, file paths, and env values remain server-side. `web/lib/dashboard/api.ts` also normalizes permission failures. Raw provider errors in server logs are covered under 1.4.

#### 4.6 - Webhook signature verification: ⬚ N/A

The current release candidate has no inbound Stripe, GitHub, or similar webhook. The old Stripe webhook code is deleted locally and no webhook route appears in the production build manifest.

### Section 5: Dependency and Package Security

#### 5.1 - Audit results: ❌ FAIL

`npm audit --omit=dev` reports one High advisory from the registry: transitive `nanoid@3.3.17`, GHSA-2v37-7h3g-55p8 / CWE-835. The app does not call the vulnerable generator directly, so practical severity here is Low. See Finding #7.

#### 5.2 - Hallucinated packages: ✅ PASS

All 18 direct production packages are established packages with matching names, maintainers, release histories, and substantial registry use. No suspicious newly published or typo-squatted dependency was found.

#### 5.3 - Lockfile committed: ✅ PASS

`web/package-lock.json` is tracked in Git, and exact versions are used for several high-value packages. Reproducibility is weakened by the dirty tree/migration problem, not by a missing JavaScript lockfile.

#### 5.4 - Outdated packages: ⚠️ PARTIAL

Several safe patch/minor upgrades are available, including Next.js 16.3.1, Supabase SSR 0.12.4, and Supabase JS 2.112.3. No direct auth or cryptography CVE was found, but dependency update automation and CI security gates are absent.

#### 5.5 - Unused dependencies: ❌ FAIL

`gsap` and `lenis` are declared packages but are not imported by first-party source. The application instead serves separate vendored files under `public/imersiv/vendor/`. Keeping both copies adds unnecessary supply-chain and maintenance surface. See Finding #8.

### Section 6: Rate Limiting

#### 6.1 - Expensive operations: ❌ FAIL

Anonymous checkout, contact, and recruitment submissions can write to Supabase and trigger Resend without a durable per-client limit. Checkout abuse also consumes ticket inventory. Honeypots do not stop a targeted bot. See Findings #3 and #9.

#### 6.2 - Auth endpoints: ⚠️ PARTIAL

Supabase applies provider-side limits to auth endpoints, but the application has no extra anti-automation layer, CAPTCHA escalation, or per-account abuse telemetry. The live Security Advisor also reports [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) disabled.

#### 6.3 - Implementation check: ⚠️ PARTIAL

Protected scanning endpoints correctly use an atomic PostgreSQL-backed limiter in `web/lib/dashboard/rate-limit.ts:6-24`; it fails closed on database errors. That reliable implementation is not applied to the public endpoints listed in 6.1.

### Section 7: CORS Configuration

#### 7.1 - API route CORS: ✅ PASS

No sensitive endpoint sends `Access-Control-Allow-Origin: *`. A live preflight from a malicious Origin returned no ACAO/credentials/method allowance. Same-origin browser requests are the intended model; authentication and authorization remain the real server-side controls.

#### 7.2 - Credentials mode: ⬚ N/A

The app does not enable credentialed cross-origin API access, so there is no `Access-Control-Allow-Credentials` and origin pairing to review.

### Section 8: File Upload Security

#### 8.1 - Server-side validation: ❌ FAIL

The admin Server Action enforces per-file/batch size, MIME allowlists, and image decode/re-encoding at `web/app/(staff)/admin/media/actions.ts:110-170`. Direct authenticated Storage writes bypass all of those checks because the bucket itself has no constraints. See Finding #2.

#### 8.2 - Storage permissions: ❌ FAIL

The `media` bucket is intentionally public for reads, but write/update/delete access is granted to every operational staff role instead of the admin role used by the application. See Finding #2.

#### 8.3 - Execution prevention: ✅ PASS

Uploads go to Supabase object storage, not an executable application directory. The normal image path decodes and re-encodes content with Sharp, randomized names prevent path selection, and the server uses `upsert: false`.

## Detailed FAIL findings

The boxes below use application-specific severity. For example, the registry labels Finding #7 High, but SavaPass does not call the affected function, so its practical application severity is Low.

┌─────────────────────────────────────────────────────────┐  
│ FINDING #1                                              │  
├──────────┬──────────────────────────────────────────────┤  
│ Severity │ LOW                                          │  
│ Category │ Environment validation / insecure default    │  
│ Location │ `web/app/api/keep-warm/route.ts:10-18`        │  
│ CWE      │ CWE-1188 (Initialization with Insecure Default) │  
├──────────┴──────────────────────────────────────────────┤  
│ What's wrong:                                           │

Required environment variables are validated independently, only when a code path first uses them. More concretely, the keep-warm endpoint treats its authentication secret as optional and silently becomes public when the secret is missing. The live endpoint returned `200` without a bearer token.

│ Why it matters:                                         │

An attacker can repeatedly make the production server query Supabase. The query is small and returns no data, so this is Low severity, but the fail-open pattern can create unnecessary traffic and hides a deployment mistake.

│ The vulnerable code:                                    │

```ts
const secret = process.env.CRON_SECRET;
if (secret) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
```

│ The fix:                                                │

```ts
// web/lib/env.ts
import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  QR_SIGNING_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().min(20),
  CRON_SECRET: z.string().min(32),
});

export const env = serverEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  QR_SIGNING_SECRET: process.env.QR_SIGNING_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
});

// web/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./lib/env");
}

// in web/app/api/keep-warm/route.ts
import { env } from "@/lib/env";

const auth = request.headers.get("authorization");
if (auth !== `Bearer ${env.CRON_SECRET}`) {
  return NextResponse.json({ ok: false }, { status: 401 });
}
```

│ Effort: ~30 minutes                                     │  
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐  
│ FINDING #2                                              │  
├──────────┬──────────────────────────────────────────────┤  
│ Severity │ HIGH                                         │  
│ Category │ Storage authorization bypass                 │  
│ Location │ `web/supabase/schema.sql:302-307`             │  
│ CWE      │ CWE-862 (Missing Authorization)              │  
├──────────┴──────────────────────────────────────────────┤  
│ What's wrong:                                           │

The live `media` bucket is public for reads, has no `file_size_limit` or `allowed_mime_types`, and lets any active staff role insert, update, and delete. Live `private.is_staff()` includes scanner, interviewer, and statistics assignments. The application upload action is admin-only and validates files, but an authenticated user can call Supabase Storage directly with the public anon key and their normal JWT.

│ Why it matters:                                         │

A compromised low-privilege operational account can upload arbitrary public content, overwrite website assets, delete the media library, or consume Storage bandwidth. This turns a narrow scanner/interviewer compromise into public-site defacement.

│ The vulnerable code:                                    │

```sql
create policy "media staff insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and is_staff());
create policy "media staff update" on storage.objects for update to authenticated using (bucket_id = 'media' and is_staff()) with check (bucket_id = 'media' and is_staff());
create policy "media staff delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and is_staff());
```

│ The fix:                                                │

The current admin action uploads with `service_role`, which bypasses RLS. Therefore client write policies are unnecessary and should be removed. Bucket-level limits remain useful defense in depth.

```sql
-- New migration. Do not edit an already-applied migration.
drop policy if exists "media staff insert" on storage.objects;
drop policy if exists "media staff update" on storage.objects;
drop policy if exists "media staff delete" on storage.objects;

update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif',
      'video/mp4', 'video/webm'
    ]::text[]
where id = 'media';
```

Retest direct insert/update/delete with scanner, interviewer, statistics, board, and admin JWTs. All direct client writes should fail; the protected admin Server Action should still work.

│ Effort: ~15 minutes                                     │  
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐  
│ FINDING #3                                              │  
├──────────┬──────────────────────────────────────────────┤  
│ Severity │ HIGH                                         │  
│ Category │ Ticket inventory race and availability abuse │  
│ Location │ `web/app/[slug]/checkout/actions.ts:67-116`   │  
│ CWE      │ CWE-362 (Concurrent Execution with Shared Resource) │  
├──────────┴──────────────────────────────────────────────┤  
│ What's wrong:                                           │

Checkout counts tickets, compares the count to capacity, and inserts later in separate database operations. This is a time-of-check/time-of-use race: multiple requests can all see the same available seat and then all insert. Reserved tickets expire after 48 hours in their token metadata, but no scheduled job changes their database status to `expired`, so an abandoned reservation can keep consuming capacity indefinitely.

│ Why it matters:                                         │

An anonymous bot can reserve all tickets without paying, and concurrent requests can oversell the venue. The practical impact is blocked legitimate sales, manual cleanup, revenue loss, and conflict at the door.

│ The vulnerable code:                                    │

```ts
const stats = await getEventStats(event.id);
const sold = stats?.sold ?? 0;
if (sold >= event.capacity) {
  return { errors: { general: "Ne pare rău, biletele s-au terminat." } };
}

const { count: typeSold } = await supabaseAdmin
  .from("tickets")
  .select("id", { count: "exact", head: true })
  .eq("ticket_type_id", ticketType.id)
  .in("status", ["reserved", "paid", "checked_in"]);
if ((typeSold ?? 0) >= ticketType.capacity) {
  return { errors: { ticket_type_id: "Acest tip de bilet este epuizat." } };
}

const isFree = ticketType.price_bani === 0;
const paidAt = isFree ? new Date().toISOString() : null;

const { data: order, error: orderErr } = await supabaseAdmin
  .from("orders")
  .insert({
    event_id: event.id,
    ticket_type_id: ticketType.id,
    buyer_name: name,
    buyer_email: email.toLowerCase(),
    quantity: 1,
    amount_bani: ticketType.price_bani,
    currency: "ron",
    status: isFree ? "paid" : "pending",
    paid_at: paidAt,
  })
  .select()
  .single();
```

│ The fix:                                                │

The durable minimum is a database invariant. This trigger serializes reservations per event, releases stale reservations, and rechecks both capacities inside the same database transaction as the ticket insert.

```sql
create or replace function private.enforce_ticket_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_capacity integer;
  v_type_capacity integer;
  v_event_sold integer;
  v_type_sold integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.event_id::text, 0)
  );

  select e.capacity, tt.capacity
    into v_event_capacity, v_type_capacity
  from public.events e
  join public.event_ticket_types tt
    on tt.event_id = e.id
  where e.id = new.event_id and tt.id = new.ticket_type_id
  for update of e, tt;

  if not found then raise exception 'ticket_type_not_found'; end if;

  update public.tickets
  set status = 'expired'
  where event_id = new.event_id
    and status = 'reserved'
    and expires_at <= pg_catalog.now();

  select count(*)::integer into v_event_sold
  from public.tickets
  where event_id = new.event_id
    and status in ('reserved', 'paid', 'checked_in');

  select count(*)::integer into v_type_sold
  from public.tickets
  where ticket_type_id = new.ticket_type_id
    and status in ('reserved', 'paid', 'checked_in');

  if v_event_sold >= v_event_capacity then
    raise exception 'event_sold_out';
  end if;
  if v_type_sold >= v_type_capacity then
    raise exception 'ticket_type_sold_out';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_ticket_capacity() from public;

drop trigger if exists tickets_capacity_guard on public.tickets;
create trigger tickets_capacity_guard
before insert on public.tickets
for each row execute function private.enforce_ticket_capacity();
```

Then move order plus ticket creation into one service-role-only RPC and add an idempotency key. Finding #9's public rate limiter is also required so a bot cannot legitimately consume every available slot one request at a time.

│ Effort: ~60-120 minutes                                 │  
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐  
│ FINDING #4                                              │  
├──────────┬──────────────────────────────────────────────┤  
│ Severity │ MEDIUM                                       │  
│ Category │ Open redirect                                │  
│ Location │ `web/app/conta/confirm/route.ts:6-15`         │  
│ CWE      │ CWE-601 (URL Redirection to Untrusted Site)  │  
├──────────┴──────────────────────────────────────────────┤  
│ What's wrong:                                           │

The callback accepts any value starting with one slash but not two. A value such as `/\\evil.example/path` passes that test. WHATWG URL normalization treats backslashes as slashes for HTTPS URLs, so `new URL()` resolves it to `https://evil.example/path`. The same weak predicate exists in `web/lib/staff-routes.ts:5-6` and the account login page.

│ Why it matters:                                         │

An attacker can send a legitimate-looking SavaPass login link that redirects the victim to an attacker-controlled phishing page immediately after authentication. The Supabase session itself was not shown to leak, so this is Medium rather than High.

│ The vulnerable code:                                    │

```ts
const requestedNext = request.nextUrl.searchParams.get("next");
const safeNext = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
  ? requestedNext
  : "/conta";

return NextResponse.redirect(new URL(safeNext, request.url));
```

│ The fix:                                                │

```ts
// web/lib/safe-local-path.ts
const INTERNAL_ORIGIN = "https://savapass.invalid";

export function safeLocalPath(value: string | null | undefined, fallback = "/conta") {
  if (!value?.startsWith("/")) return fallback;
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return fallback;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}

// web/app/conta/confirm/route.ts
const safeNext = safeLocalPath(
  request.nextUrl.searchParams.get("next"),
  "/conta",
);
return NextResponse.redirect(new URL(safeNext, request.nextUrl.origin));
```

Use this one helper in the callback, login page, and `staffRedirectForRole`, then add tests for `//evil`, `/\\evil`, encoded backslashes, absolute URLs, and control characters.

│ Effort: ~20 minutes                                     │  
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐  
│ FINDING #5                                              │  
├──────────┬──────────────────────────────────────────────┤  
│ Severity │ MEDIUM                                       │  
│ Category │ Unbounded public input                       │  
│ Location │ `web/app/(club)/contact/actions.ts:7-11`      │  
│ CWE      │ CWE-400 (Uncontrolled Resource Consumption)  │  
├──────────┴──────────────────────────────────────────────┤  
│ What's wrong:                                           │

Public contact and checkout strings have minimum validation but no maximum length. At the same time, `web/next.config.ts:21-24` raises the global Server Action body limit to 64 MB for the admin media library. A public request can therefore make Next.js parse a much larger body than these small forms need before Zod rejects or stores it.

│ Why it matters:                                         │

An unauthenticated attacker can submit oversized strings, consume request memory and database storage, produce oversized operational emails, and amplify Finding #9. Platform limits reduce the blast radius but do not make the application boundary safe.

│ The vulnerable code:                                    │

```ts
const schema = z.object({
  name: z.string().min(2, "Introdu numele"),
  email: z.string().email("Email invalid"),
  message: z.string().min(10, "Scrie un mesaj mai detaliat"),
});

// next.config.ts
serverActions: {
  bodySizeLimit: "64mb",
},
```

│ The fix:                                                │

```ts
// Contact
const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5_000),
});

// Checkout
const schema = z.object({
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  ticket_type_id: z.string().uuid("Alege un tip de bilet."),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  gdpr: z.literal("on", { error: "Trebuie să fii de acord" }),
});
```

Because Next.js applies `bodySizeLimit` globally, move the large admin media upload to a dedicated protected upload route or signed-upload flow, then lower the Server Action limit to `1mb`. Until that move, reject oversized `Content-Length` at Proxy/WAF for `/contact`, `/devino-membru`, and `*/checkout`; Zod maximums still protect stored data when transfer encoding has no length header.

│ Effort: ~30-120 minutes                                 │  
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐  
│ FINDING #6                                              │  
├──────────┬──────────────────────────────────────────────┤  
│ Severity │ MEDIUM                                       │  
│ Category │ CSV formula injection                        │  
│ Location │ `web/app/api/board/attendance/export/route.ts:6,20` │  
│ CWE      │ CWE-1236 (Improper Neutralization of Formula Elements in CSV) │  
├──────────┴──────────────────────────────────────────────┤  
│ What's wrong:                                           │

CSV quoting prevents broken columns, but it does not prevent formulas. A normal member can control profile values such as their name or grade; if a value begins with `=`, `+`, `-`, or `@`, Excel or another spreadsheet may evaluate it when a board member opens the export.

│ Why it matters:                                         │

A malicious member can place a phishing link or external request into a trusted board export. Modern spreadsheet safeguards limit some older command-execution payloads, so the realistic impact is phishing and data/metadata disclosure.

│ The vulnerable code:                                    │

```ts
function csvCell(value: unknown) { const text = value == null ? "" : String(value); return `"${text.replaceAll('"', '""')}"`; }
```

│ The fix:                                                │

```ts
function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
```

Add unit cases for every dangerous prefix, including whitespace before the formula character.

│ Effort: ~5 minutes                                      │  
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐  
│ FINDING #7                                              │  
├──────────┬──────────────────────────────────────────────┤  
│ Severity │ LOW (registry advisory: HIGH)                 │  
│ Category │ Vulnerable transitive dependency              │  
│ Location │ `web/package-lock.json:6061-6064`              │  
│ CWE      │ CWE-835 (Loop with Unreachable Exit Condition) │  
├──────────┴──────────────────────────────────────────────┤  
│ What's wrong:                                           │

The lockfile contains `nanoid@3.3.17`, affected by [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8). A zero-size request can cause an infinite loop in the affected generator. It is transitive through PostCSS and the application does not call Nano ID or pass attacker-controlled generator sizes, so exploitability in SavaPass is currently Low.

│ Why it matters:                                         │

The current path is probably unreachable, but a future direct use could turn it into denial of service. The High audit result also prevents a clean dependency security gate.

│ The vulnerable code:                                    │

```json
"node_modules/nanoid": {
  "version": "3.3.17",
  "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.17.tgz"
}
```

│ The fix:                                                │

```json
{
  "overrides": {
    "nanoid": "3.3.18"
  }
}
```

Then run `npm install`, `npm audit --omit=dev`, the tests, and the production build. Remove the override later when the parent dependency naturally resolves a fixed version.

│ Effort: ~5 minutes                                      │  
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐  
│ FINDING #8                                              │  
├──────────┬──────────────────────────────────────────────┤  
│ Severity │ LOW                                          │  
│ Category │ Unnecessary dependency surface               │  
│ Location │ `web/package.json:33-34`                      │  
│ CWE      │ CWE-829 (Inclusion of Functionality from Untrusted Control Sphere) │  
├──────────┴──────────────────────────────────────────────┤  
│ What's wrong:                                           │

`gsap` and `lenis` are installed as application dependencies but are not imported by first-party source. The immersive page instead serves separate vendored copies from `public/imersiv/vendor/`.

│ Why it matters:                                         │

Unused packages still run installation scripts, receive transitive updates, occupy the lockfile, and create future review work. No malicious behavior was found; this is attack-surface reduction.

│ The vulnerable code:                                    │

```json
"gsap": "^3.15.0",
"lenis": "^1.3.23"
```

│ The fix:                                                │

```powershell
npm uninstall gsap lenis
npm run typecheck
npm run build
```

Keep the vendored browser files only if they are the intentional source of truth, and record their versions/checksums in the dependency update process.

│ Effort: ~5 minutes                                      │  
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐  
│ FINDING #9                                              │  
├──────────┬──────────────────────────────────────────────┤  
│ Severity │ MEDIUM                                       │  
│ Category │ Missing durable public rate limiting         │  
│ Location │ `web/app/(club)/contact/actions.ts:21-65`     │  
│ CWE      │ CWE-770 (Allocation of Resources Without Limits) │  
├──────────┴──────────────────────────────────────────────┤  
│ What's wrong:                                           │

Anonymous checkout, contact, and membership submission paths perform database writes and can send Resend email without a server-side rate limit. Contact has a honeypot, but a targeted script can leave that field empty. The existing durable limiter protects scanner/dashboard operations only.

│ Why it matters:                                         │

An attacker can consume Resend quota, spam staff and applicants, fill recruitment records, create operational noise, and combine this with Finding #3 to block ticket sales. Platform-wide limits are not a substitute for endpoint-specific abuse limits.

│ The vulnerable code:                                    │

```ts
try {
  await sendEmail({
    to: "membri@interactsava.ro",
    replyTo: email,
    subject: `Mesaj nou de contact — ${name}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0F172A">
        <p style="font-size:15px;margin:0 0 8px"><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}) a trimis un mesaj prin formularul de contact:</p>
        <p style="font-size:15px;line-height:1.6;white-space:pre-wrap;margin:0">${escapeHtml(message)}</p>
      </div>
    `,
  });
} catch (err) {
  console.error("Contact notify email failed:", err);
}
```

│ The fix:                                                │

Reuse the project's successful PostgreSQL counter pattern, but key public requests by a server-side HMAC of a platform-trusted IP and normalized email. Never store raw IP addresses in the rate-limit table.

```sql
create table public.public_rate_limits (
  key_hash text not null,
  scope text not null,
  window_started_at timestamptz not null,
  attempts integer not null default 1 check (attempts > 0),
  updated_at timestamptz not null default now(),
  primary key (key_hash, scope, window_started_at)
);

alter table public.public_rate_limits enable row level security;
revoke all on public.public_rate_limits from public, anon, authenticated;
grant all on public.public_rate_limits to service_role;

create policy public_rate_limits_client_deny
on public.public_rate_limits for all to anon, authenticated
using (false) with check (false);

create or replace function public.consume_public_rate_limit(
  p_key_hash text,
  p_scope text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_attempts integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then return false; end if;
  v_window := pg_catalog.to_timestamp(
    floor(extract(epoch from pg_catalog.clock_timestamp()) / p_window_seconds)
    * p_window_seconds
  );

  insert into public.public_rate_limits
    (key_hash, scope, window_started_at, attempts)
  values (left(p_key_hash, 64), left(p_scope, 80), v_window, 1)
  on conflict (key_hash, scope, window_started_at)
  do update set attempts = public.public_rate_limits.attempts + 1,
                updated_at = pg_catalog.now()
  returning attempts into v_attempts;

  return v_attempts <= p_limit;
end;
$$;

revoke all on function public.consume_public_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_public_rate_limit(text, text, integer, integer)
  to service_role;
```

```ts
// web/lib/public-rate-limit.ts
import "server-only";
import { createHmac } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function consumePublicRateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowSeconds: number,
) {
  const secret = process.env.PUBLIC_RATE_LIMIT_SECRET;
  if (!secret) return false; // fail closed
  const keyHash = createHmac("sha256", secret)
    .update(`${scope}\0${identity}`)
    .digest("hex");
  const { data, error } = await supabaseAdmin.rpc("consume_public_rate_limit", {
    p_key_hash: keyHash,
    p_scope: scope,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  return !error && data === true;
}
```

Apply separate IP and normalized-email limits before any insert or email, return `429`, and add Turnstile only after repeated denials. Add `PUBLIC_RATE_LIMIT_SECRET` to Finding #1's environment schema.

│ Effort: ~120-180 minutes                                │  
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐  
│ FINDING #10                                             │  
├──────────┬──────────────────────────────────────────────┤  
│ Severity │ MEDIUM                                       │  
│ Category │ Missing browser security headers             │  
│ Location │ `web/next.config.ts:3-31`                     │  
│ CWE      │ CWE-693 (Protection Mechanism Failure)       │  
├──────────┴──────────────────────────────────────────────┤  
│ What's wrong:                                           │

The live site sends HSTS but not Content Security Policy, clickjacking protection, MIME sniffing protection, Referrer Policy, or Permissions Policy. `next.config.ts` defines no response headers.

│ Why it matters:                                         │

Pages can be framed for clickjacking, bearer-style candidate URLs have no explicit referrer policy, and a future HTML/script injection would have fewer browser-side limits. This does not create XSS by itself, so severity is Medium.

│ The vulnerable code:                                    │

```ts
const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "shzyvrojbtbczqqoilip.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    // Dashboard navigations reuse already-visited dynamic pages briefly, so
    // switching between member/board screens is instant instead of refetching.
    staleTimes: {
      dynamic: 30,
    },
    serverActions: {
      // The media library accepts compressed photo batches and one short web
      // video at a time. Each file is still validated to 25 MB in the action.
      bodySizeLimit: "64mb",
    },
    // The public landing is measured as a cold first visit. Inlining avoids two
    // render-blocking stylesheet requests; mobile containment keeps its layout
    // cost bounded while the rest of the app still shares the same build.
    inlineCss: true,
  },
};
```

│ The fix:                                                │

This baseline avoids script directives that could break Next.js inline runtime code. A nonce-based `script-src` can be added separately after a report-only test.

```ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // existing settings...
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
```

Verify headers on a public page, login, ticket, candidate-token page, and scanner. Preserve `camera=(self)` because the scanner needs camera access.

│ Effort: ~10 minutes                                     │  
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐  
│ FINDING #11                                             │  
├──────────┬──────────────────────────────────────────────┤  
│ Severity │ MEDIUM                                       │  
│ Category │ Database/deployment authorization drift      │  
│ Location │ `web/supabase/schema.sql:149-156`             │  
│ CWE      │ CWE-284 (Improper Access Control)            │  
├──────────┴──────────────────────────────────────────────┤  
│ What's wrong:                                           │

Only 5 of 32 local migration files are tracked. The checked-in baseline schema contains obsolete authorization helpers where every profile is considered staff, while later local/live migrations harden that logic. The live `/dev/tokens` and `/dev/rezervare-cash` routes also return `200` although current source intends to hide the cash demo in production. A clean checkout of Git cannot reproduce the audited system.

│ Why it matters:                                         │

This is not an active live authorization bypass. It is a realistic recovery and deployment risk: rebuilding from the stale schema can turn every normal member into staff for RLS policies, while incident response cannot prove which code/schema was deployed.

│ The vulnerable code:                                    │

```sql
create or replace function public.is_staff()
  returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists (select 1 from profiles where id = auth.uid()); $$;
```

│ The fix:                                                │

The hardened helper already exists in a later migration; make the migration chain the only source of truth, commit every reviewed migration, regenerate the baseline, and test it only against a disposable local/test database.

```sql
create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.membership_status = 'active'
      and (
        p.role is not null
        or exists (
          select 1 from public.profile_roles pr
          where pr.profile_id = p.id
        )
      )
  );
$$;
```

```powershell
# Review first, then commit all migrations that match live production.
git add web/supabase/migrations/*.sql web/supabase/schema.sql

# Run only against Supabase local or a disposable test project, never production.
npx supabase migration list --linked
npx supabase db reset
npm run typecheck
npm test
npm run build
```

Add a CI job that starts a disposable database from tracked migrations and fails if generated schema/types differ. Deploy only from a clean commit and require `/dev/*` to return `404` in production smoke tests.

│ Effort: ~120-240 minutes                                │  
└─────────────────────────────────────────────────────────┘

## 1. Security Posture Rating

### 🟠 NEEDS WORK

SavaPass is not broadly insecure: secrets, live table RLS, server-side identity checks, QR signing, HTML escaping, and atomic scan/payment operations are handled well. The rating is Needs Work because two practical High-severity paths remain: a low-privilege staff account can modify public media directly, and an anonymous bot/concurrent traffic can block or oversell ticket inventory. There are no confirmed Critical findings or active anonymous database data leaks.

## 2. Critical and High Findings

No Critical finding was found.

| Priority | Finding | Immediate action |
|---:|---|---|
| High | #2: direct Storage authorization bypass | Remove all authenticated client write policies from `media` and add bucket limits. |
| High | #3: non-atomic, abuseable ticket reservation | Enforce capacity inside Postgres, expire stale reservations, add idempotency and public rate limiting. |

These are the stop-and-fix items before unrestricted ticket sales. If public checkout must remain open during remediation, temporarily restrict sales volume/manual approvals and monitor reservation counts.

## 3. Quick Wins

Fixes taking less than 10 minutes:

1. Neutralize CSV formula prefixes, Finding #6, about 5 minutes.
2. Pin transitive `nanoid` to 3.3.18 and refresh the lockfile, Finding #7, about 5 minutes.
3. Remove unused `gsap` and `lenis` packages after a build check, Finding #8, about 5 minutes.
4. In the Supabase dashboard, enable leaked-password protection, then test staff login. This closes a Partial hardening gap, not a numbered FAIL finding.

Finding #10 is approximately 10 minutes and is the next quickest improvement.

## 4. Prioritized Remediation Plan

Ordered first by severity, then by expected effort:

1. **#2 High, 15 min:** remove direct `media` writes and constrain the bucket.
2. **#3 High, 60-120 min:** enforce atomic inventory, expiry, and idempotency.
3. **#6 Medium, 5 min:** neutralize CSV formulas.
4. **#10 Medium, 10 min:** add safe baseline browser security headers.
5. **#4 Medium, 20 min:** centralize and test local redirect validation.
6. **#5 Medium, 30-120 min:** cap public fields and isolate large media request bodies.
7. **#9 Medium, 120-180 min:** apply durable limits to checkout/contact/recruitment.
8. **#11 Medium, 120-240 min:** commit/reconcile migrations, test a clean rebuild, and deploy from clean Git.
9. **#7 Low, 5 min:** update `nanoid` and rerun the audit.
10. **#8 Low, 5 min:** remove unused dependencies.
11. **#1 Low, 30 min:** add central fail-fast environment validation and require the cron secret.

After fixes #2, #3, and #9, run a concurrency test against a disposable Supabase project: with capacity 10 and 100 simultaneous reservation attempts, exactly 10 should succeed and the rest should receive sold-out or `429` responses.

## 5. What's Already Done Right

- No real secret was found in source or the scanned Git history; secret variables are server-only.
- All 41 live public tables have RLS and intentional policies.
- Staff authorization is repeated inside sensitive pages/actions/routes and uses verified `getUser()` identity.
- Profile column grants prevent users from changing role, status, email, or ID through the client API.
- Ticket and member QR formats are purpose-separated, HMAC-signed, schema-validated, and compared timing-safely.
- Ticket check-in, cash confirmation, and attendance use atomic database RPCs with duplicate handling.
- Price, currency, role, and actor identity are derived server-side.
- User values placed into HTML email or immersive markup are escaped.
- File uploads through the intended admin action have role, MIME, size, random-name, and image-decode controls.
- Sensitive APIs returned `401` without authorization; CORS did not expose wildcard credentialed access.
- Production source maps were inaccessible and HTTPS/HSTS are active.
- A PostgreSQL-backed, fail-closed rate limiter already exists for dashboard scan operations and can serve as the model for public limits.
- The lockfile is committed, packages are legitimate, and the project passes typecheck, build, lint without errors, and all 22 selected safe tests.

## 6. Checklist Summary

```text
1.1 ✅  1.2 ✅  1.3 ✅  1.4 ⚠️  1.5 ✅  1.6 ❌
2.1 ✅  2.2 ✅  2.3 ⚠️  2.4 ✅  2.5 ✅  2.6 ❌  2.7 ✅  2.8 ⚠️
3.1 ✅  3.2 ⚠️  3.3 ✅  3.4 ❌  3.5 ⚠️  3.6 ⚠️  3.7 ⬚  3.8 ✅
4.1 ❌  4.2 ✅  4.3 ❌  4.4 ⚠️  4.5 ✅  4.6 ⬚
5.1 ❌  5.2 ✅  5.3 ✅  5.4 ⚠️  5.5 ❌
6.1 ❌  6.2 ⚠️  6.3 ⚠️
7.1 ✅  7.2 ⬚
8.1 ❌  8.2 ❌  8.3 ✅
```

Totals: 18 Pass, 10 Partial, 10 Fail, 3 N/A, covering all 41 checklist items.

## Verification evidence

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass with 0 errors and 5 pre-existing warnings |
| Selected non-mutating tests | 22/22 pass |
| `npm run build` | Pass, 81 pages generated |
| `npm audit --omit=dev` | 1 registry High: transitive `nanoid@3.3.17`; practical app severity Low |
| Git secret/history scan | 69 commits, no high-confidence secret prefix or env filename |
| Live table RLS | 41/41 public tables enabled; 41/41 have policies |
| Supabase Security Advisor | 1 warning: leaked-password protection disabled |
| Live Storage | `media` public; no MIME/size limit; operational staff can insert/update/delete |
| Live unauthenticated protected APIs | selected board/member/notification endpoints returned `401` |
| Live CORS malicious preflight | no permissive ACAO/credential headers |
| Live source map request | `403` |
| Live browser headers | HSTS present; CSP/XFO/nosniff/referrer/permissions headers absent |
| Live `/api/keep-warm` without bearer | `200`, confirming fail-open behavior |
| Live `/dev/tokens`, `/dev/rezervare-cash` | `200`, confirming source/deployment drift |

## Retest gate

Before calling the app ready for public sales, verify all of the following on a disposable test project and then with read-only production checks:

- direct Storage insert/update/delete fails for scanner, interviewer, statistics, board, admin, and anonymous clients;
- the admin media action still accepts a valid file and rejects invalid MIME/oversize content;
- capacity cannot be exceeded under concurrency and expired reservations are released automatically;
- checkout/contact/recruitment return `429` at the documented threshold and do not send email after denial;
- open-redirect payloads remain on the SavaPass origin;
- CSV formula strings open as literal text;
- `npm audit --omit=dev` has no High/Critical result;
- all migrations rebuild a disposable database from a clean commit;
- production `/dev/*` returns `404`, staff-test login is explicitly disabled, and the security headers are present.
