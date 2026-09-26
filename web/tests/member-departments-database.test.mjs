// Disposable in-memory Postgres only. Never loads env files or connects to Supabase.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

test("member department selection is balanced, permanent and server-only", {
  skip: !process.env.PGLITE_MODULE_PATH && "Requires an explicitly supplied local PGlite engine",
}, async (t) => {
  const { PGlite } = await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH)).href);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create table public.profiles(id uuid primary key, full_name text, role text, membership_status text);
    create table public.profile_roles(profile_id uuid references public.profiles, role text);
    grant usage on schema public to anon, authenticated, service_role;
    grant all on all tables in schema public to service_role;
    grant select on public.profiles to authenticated;
    grant update(full_name) on public.profiles to authenticated;
  `);
  await db.exec(readFileSync(resolve("supabase/migrations/20260912183532_member_departments_hr_pr.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20260912192301_member_department_threshold_75.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20260913134036_member_department_all_active_members.sql"), "utf8"));
  const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
  const options = async (n = 100) => (await db.query("select public.get_member_department_options($1) value", [id(n)])).rows[0].value;
  const select = async (department, n = 100) => (await db.query("select public.select_member_department($1, $2) value", [id(n), department])).rows[0].value;
  async function seed(hr, pr, unassigned = 2) {
    await db.exec("reset role; truncate public.profile_roles, public.profiles;");
    for (let n = 0; n < hr + pr; n++) {
      await db.query("insert into public.profiles(id,membership_status,member_department) values ($1,'active',$2)", [id(n), n < hr ? "hr" : "pr"]);
    }
    for (let n = 0; n < unassigned; n++) {
      await db.query("insert into public.profiles(id,membership_status) values ($1,'active')", [id(100 + n)]);
    }
    await db.exec("set role service_role");
  }
  await t.test("empty pool allows either choice; returning members cannot switch", async () => {
    await seed(0, 0);
    assert.equal((await options()).blockedDepartment, null);
    assert.equal((await select("hr")).result, "selected");
    assert.deepEqual(await select("pr"), { result: "already_selected", department: "hr" });
    assert.equal((await options(101)).blockedDepartment, null);
    assert.equal((await select("hr", 101)).result, "selected");
  });
  await t.test("unassigned members count even when nearly all chosen departments are the same", async () => {
    for (const majority of ["hr", "pr"]) {
      await seed(majority === "hr" ? 10 : 3, majority === "pr" ? 10 : 3, 40);
      const choice = await options();
      assert.equal(choice.blockedDepartment, null); // 10/53, not 10/13.
      assert.equal((await select(majority)).result, "selected");
    }
  });
  await t.test("strictly above 75% blocks either majority without assigning anything", async () => {
    for (const majority of ["hr", "pr"]) {
      await seed(majority === "hr" ? 7 : 0, majority === "pr" ? 7 : 0);
      assert.equal((await options()).blockedDepartment, majority);
      assert.equal((await select(majority)).result, "blocked");
      assert.equal((await db.query("select member_department from public.profiles where id=$1", [id(100)])).rows[0].member_department, null);
      assert.equal((await select(majority === "hr" ? "pr" : "hr")).result, "selected");
    }
  });
  await t.test("exactly 75% permits the choice, but the next submission recounts", async () => {
    for (const majority of ["hr", "pr"]) {
      await seed(majority === "hr" ? 6 : 0, majority === "pr" ? 6 : 0);
      assert.equal((await options()).blockedDepartment, null); // 6/8 = 75%.
      assert.equal((await options(101)).blockedDepartment, null);
      assert.equal((await select(majority)).result, "selected");
      assert.equal((await select(majority, 101)).result, "blocked"); // Recount: 7/8.
      assert.equal((await select(majority === "hr" ? "pr" : "hr", 101)).result, "selected");
    }
  });
  await t.test("Board, Super Admin, recruits and inactive members cannot choose or affect counts", async () => {
    await seed(7, 0);
    await db.exec("reset role");
    for (const [n, role, status] of [[200,"board","active"],[201,"admin","active"],[202,null,"recruit"],[203,null,"inactive"],[204,null,"suspended"],[205,null,"alumni"]]) {
      await db.query("insert into public.profiles(id,role,membership_status,member_department) values ($1,$2,$3,'hr')", [id(n), role, status]);
      assert.equal((await options(n)).result, "excluded");
      assert.equal((await select("pr", n)).result, "excluded");
      await db.query("update public.profiles set member_department=null where id=$1", [id(n)]);
      assert.equal((await options()).blockedDepartment, "hr"); // Excluded unassigned profiles do not dilute 7/9.
    }
    await db.query("insert into public.profile_roles values ($1,'board')", [id(0)]);
    assert.equal((await options()).hr, 6);
    assert.equal((await options()).pr, 0);
    assert.equal((await options()).blockedDepartment, null); // Operational Board is excluded: 6/8.
    assert.equal((await select("hr", 0)).result, "excluded");
  });
  await t.test("invalid choices and missing profiles never write", async () => {
    await seed(0, 0);
    for (const invalid of [null, "", "HR", "admin"]) assert.equal((await select(invalid)).result, "invalid_department");
    assert.equal((await select("hr", 999)).result, "excluded");
  });
  await t.test("browser roles cannot call selection RPCs or update the department directly", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`reset role; set role ${role}`);
      await assert.rejects(options(), { code: "42501" });
      await assert.rejects(select("hr"), { code: "42501" });
      await assert.rejects(db.query("update public.profiles set member_department='hr' where id=$1", [id(100)]), { code: "42501" });
    }
  });
});
