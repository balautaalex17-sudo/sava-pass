// Disposable in-memory Postgres only. No env files or Supabase connections.
// Supply an installed @electric-sql/pglite/dist/index.js via PGLITE_MODULE_PATH.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

test("absence requests and reviews wait three hours after meeting end", {
  skip: !process.env.PGLITE_MODULE_PATH && "Requires an explicitly supplied local PGlite engine",
}, async (t) => {
  const { PGlite } = await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH)).href);
  const db = new PGlite();
  t.after(() => db.close());
  // Minimal dependencies for the real absence migrations and SQL assertions.
  // This exercises absence permissions, not the full portal permission system.
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema private;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
    create table public.profiles(id uuid primary key references auth.users, email text,
      full_name text, membership_status text, role text);
    create table public.meetings(id uuid primary key, title text, starts_at timestamptz,
      ends_at timestamptz not null, location text, attendance_opens_at timestamptz,
      attendance_closes_at timestamptz not null, status text, created_by uuid references public.profiles);
    create table public.meeting_attendance(id uuid default gen_random_uuid() primary key,
      meeting_id uuid references public.meetings, member_id uuid references public.profiles,
      checked_in_by uuid references public.profiles, status text not null default 'present');
    create table public.audit_logs(id uuid default gen_random_uuid() primary key,
      actor_id uuid references public.profiles, action text, entity_type text, entity_id text, metadata jsonb);
    create function private.profile_has_permission(profile_id uuid, permission_key text)
    returns boolean language sql stable as $$
      select exists(select 1 from public.profiles where id = profile_id
        and membership_status = 'active' and permission_key = 'view_own_attendance')
    $$;
    create function private.has_permission(permission_key text)
    returns boolean language sql stable as $$
      select private.profile_has_permission(auth.uid(), permission_key)
    $$;
    grant usage on schema public, auth, private to anon, authenticated, service_role;
    grant select on public.profiles to authenticated;
    grant all on all tables in schema public to service_role;
  `);
  const sql = (path) => readFileSync(resolve(path), "utf8");
  await db.exec(sql("supabase/migrations/20260906160416_attendance_absence_requests.sql"));
  const assertions = sql("tests/attendance-database.sql");
  await assert.rejects(db.exec(assertions), /Grace period blocks a request/);
  await db.exec("rollback");
  await db.exec(sql("supabase/migrations/20260910153059_attendance_after_meeting_end.sql"));
  await db.exec(assertions);
  assert.equal((await db.query("select count(*)::int as count from public.absence_requests")).rows[0].count, 0);
});
