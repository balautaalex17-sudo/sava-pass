// A fresh in-memory Postgres engine only. No env files or Supabase connections.
// Set PGLITE_MODULE_PATH to an installed @electric-sql/pglite/dist/index.js.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

test("database enforces Super Admin interview invitations", {
  skip: !process.env.PGLITE_MODULE_PATH && "Requires an explicitly supplied local PGlite engine",
}, async (t) => {
  const { PGlite } = await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH)).href);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema private;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table public.profiles(id uuid primary key, role text, membership_status text);
    create table public.membership_applications(id int primary key, status text, reviewer_id uuid);
    create table public.interviews(id int primary key, application_id int, status text);
    create table public.notifications(id int primary key, template_key text, status text);
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant select, insert, update on all tables in schema public to anon, authenticated, service_role;
    -- Match the live self-profile read boundary while allowing test recruitment writes.
    alter table public.profiles enable row level security;
    create policy self_read on public.profiles for select to authenticated using (id = auth.uid());
    insert into public.profiles values
      ('00000000-0000-0000-0000-000000000001', 'board', 'active'),
      ('00000000-0000-0000-0000-000000000002', 'admin', 'active'),
      ('00000000-0000-0000-0000-000000000003', 'admin', 'suspended');
    insert into public.membership_applications values (1, 'submitted', null), (2, 'selected_for_interview', null);
    insert into public.interviews values (1, 2, 'scheduled'), (2, 1, 'cancelled');
    insert into public.notifications values (1, 'interview_invitation', 'failed');
  `);
  await db.exec(readFileSync(resolve("supabase/migrations/20260911185035_restrict_interview_invitations_to_super_admin.sql"), "utf8"));

  async function asUser(id) {
    await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${id}';`);
  }
  async function denied(sql) {
    await assert.rejects(db.exec(sql), (error) => error.code === "42501" && /Only Super Admin/.test(error.message));
  }

  await t.test("Board cannot insert or move applications into any interview stage", async () => {
    await asUser("00000000-0000-0000-0000-000000000001");
    for (const status of ["selected_for_interview", "interview_scheduled", "interview_completed"]) {
      await denied(`update public.membership_applications set status = '${status}' where id = 1`);
      await denied(`insert into public.membership_applications values (3, '${status}', null)`);
    }
    assert.equal((await db.query("select status from public.membership_applications where id = 1")).rows[0].status, "submitted");
  });
  await t.test("Board cannot create, retarget, or reactivate interviews", async () => {
    await denied("insert into public.interviews values (3, 1, 'scheduled')");
    await denied("update public.interviews set application_id = 1 where id = 1");
    await denied("update public.interviews set status = 'scheduled' where id = 2");
  });
  await t.test("Board cannot queue or retry an invitation", async () => {
    await denied("insert into public.notifications values (2, 'interview_invitation', 'queued')");
    await denied("update public.notifications set status = 'queued' where id = 1");
  });
  await t.test("Board can review, reassign, reject and complete selected candidates", async () => {
    await db.exec(`
      update public.membership_applications set status = 'under_review' where id = 1;
      update public.membership_applications set reviewer_id = auth.uid() where id = 2;
      update public.membership_applications set status = 'interview_completed' where id = 2;
      update public.interviews set status = 'completed' where id = 1;
      update public.membership_applications set status = 'rejected' where id = 1;
      insert into public.notifications values (2, 'application_rejected', 'queued');
    `);
  });
  await t.test("Super Admin can select, create and send invitations", async () => {
    await asUser("00000000-0000-0000-0000-000000000002");
    await db.exec(`
      update public.membership_applications set status = 'selected_for_interview' where id = 1;
      insert into public.interviews values (3, 1, 'scheduled');
      insert into public.notifications values (3, 'interview_invitation', 'queued');
      update public.notifications set status = 'queued' where id = 1;
    `);
  });
  await t.test("a suspended Super Admin and anonymous caller cannot invite", async () => {
    await asUser("00000000-0000-0000-0000-000000000003");
    await denied("insert into public.interviews values (4, 1, 'scheduled')");
    await db.exec("reset role; set role anon; set request.jwt.claim.sub = '';");
    await denied("insert into public.interviews values (4, 1, 'scheduled')");
  });
  await t.test("trusted server actions can still write after checking the caller", async () => {
    await db.exec(`reset role; set role service_role;
      insert into public.interviews values (4, 1, 'scheduled');
      insert into public.notifications values (4, 'interview_invitation', 'queued');
    `);
  });
});
