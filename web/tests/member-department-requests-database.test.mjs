// Disposable Postgres fixtures only. No env file or live database access.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

test("department change requests protect ownership, reviews and balance exceptions", {
  skip: !process.env.PGLITE_MODULE_PATH && "Requires an explicitly supplied local PGlite engine",
}, async (t) => {
  const { PGlite } = await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH)).href);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema private;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create table public.profiles(id uuid primary key, full_name text, role text, membership_status text);
    create table public.profile_roles(profile_id uuid references public.profiles, role text);
    create table public.audit_logs(actor_id uuid, action text, entity_type text, entity_id text, metadata jsonb);
    create function private.has_permission(text) returns boolean language sql as $$
      select exists(select 1 from public.profiles where id=auth.uid() and membership_status='active') $$;
    grant usage on schema public, auth, private to anon, authenticated, service_role;
    grant all on all tables in schema public to service_role;
    grant select on public.profiles to authenticated;
  `);
  for (const file of ["20260912183532_member_departments_hr_pr.sql", "20260912190804_member_department_change_requests.sql", "20260912192301_member_department_threshold_75.sql", "20260913134036_member_department_all_active_members.sql"]) {
    await db.exec(readFileSync(resolve("supabase/migrations", file), "utf8"));
  }
  const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
  const submit = async (n=7, reason="Vreau să ajut la comunicare.") => (await db.query("select public.submit_member_department_request($1,$2) value", [id(n), reason])).rows[0].value;
  const review = async (request, decision="approved", actor=100, accept=false, note="") => (await db.query("select public.review_member_department_request($1,$2,$3,$4,$5) value", [request, id(actor), decision, note, accept])).rows[0].value;
  const request = async (n=7) => (await db.query("select * from public.member_department_requests where member_id=$1 order by created_at desc", [id(n)])).rows[0];
  const department = async (n=7) => (await db.query("select member_department from public.profiles where id=$1", [id(n)])).rows[0].member_department;
  async function seed(hr=7, pr=3) {
    await db.exec("reset role; truncate public.member_department_requests, public.audit_logs, public.profile_roles, public.profiles;");
    for (let n=0; n<hr+pr; n++) await db.query("insert into public.profiles values($1,'Test member',null,'active',$2)", [id(n), n<hr ? "hr" : "pr"]);
    for (const [n,role,status,dept] of [[100,"board","active",null],[101,"admin","active",null],[102,"board","inactive",null],[103,null,"recruit","hr"],[104,null,"active",null]]) {
      await db.query("insert into public.profiles values($1,'Test account',$2,$3,$4)", [id(n),role,status,dept]);
    }
    await db.exec("set role service_role");
  }
  await t.test("submission keeps the current department, deduplicates and records a reason", async () => {
    await seed();
    assert.equal((await submit()).result,"submitted");
    assert.equal(await department(),"pr");
    assert.equal((await submit()).result,"already_requested");
    const row=await request();
    assert.equal(row.status,"pending"); assert.equal(row.from_department,"pr"); assert.equal(row.to_department,"hr");
    assert.equal((await db.query("select count(*)::int n from public.audit_logs")).rows[0].n,1);
  });
  await t.test("exactly 75% can be approved, but the next approval requires a warning acknowledgement", async () => {
    await seed(9,2); await submit(9); await submit(10); // 9 / (9+2+1 unassigned) = 75%.
    assert.equal((await review((await request(9)).id)).result,"reviewed");
    assert.equal(await department(9),"hr");
    const second=(await request(10)).id;
    const warning=await review(second);
    assert.equal(warning.result,"balance_warning"); assert.equal(warning.blockedDepartment,"hr");
    assert.equal(await department(10),"pr"); assert.equal((await request(10)).status,"pending");
    assert.equal((await review(second,"approved",100,true,"Excepție aprobată")).result,"reviewed");
    assert.equal(await department(10),"hr");
    const audit=(await db.query("select metadata from public.audit_logs where entity_id=$1 and action='department.reviewed'",[second])).rows[0];
    assert.equal(audit.metadata.balance_override,true);
  });
  await t.test("either majority accepts requests and Board can override its warning", async () => {
    for (const majority of ["hr","pr"]) {
      await seed(majority==="hr"?9:1,majority==="pr"?9:1); // 9/11 > 75%, including the unassigned member.
      const n=majority==="hr"?9:0;
      assert.equal((await submit(n)).result,"submitted");
      const row=await request(n);
      assert.equal((await review(row.id)).result,"balance_warning");
      assert.equal((await review(row.id,"approved",101,true)).result,"reviewed");
      assert.equal(await department(n),majority);
    }
  });
  await t.test("unassigned members prevent a false transfer warning and eligibility is recounted at approval", async () => {
    for (const majority of ["hr", "pr"]) {
      await seed(majority==="hr"?8:2,majority==="pr"?8:2); // 8/11, not 8/10.
      const n=majority==="hr"?8:0;
      await submit(n);
      assert.equal((await review((await request(n)).id)).result,"reviewed");
      assert.equal(await department(n),majority);

      await seed(majority==="hr"?8:2,majority==="pr"?8:2);
      await submit(n);
      await db.query("update public.profiles set membership_status='inactive' where id=$1",[id(104)]);
      const pending=(await request(n)).id;
      assert.equal((await review(pending)).result,"balance_warning"); // Now 8/10.
      assert.equal((await request(n)).status,"pending");
      assert.equal((await review(pending,"approved",100,true)).result,"reviewed");
    }
  });
  await t.test("rejection preserves department and allows a later request; decisions cannot be overwritten", async () => {
    await seed(); await submit(); const row=await request();
    assert.equal((await review(row.id,"rejected",100,false,"Discutăm din nou luna viitoare.")).result,"reviewed");
    assert.equal(await department(),"pr");
    assert.equal((await request()).review_note,"Discutăm din nou luna viitoare.");
    assert.equal((await review(row.id)).result,"already_reviewed");
    assert.equal((await submit()).result,"submitted");
  });
  await t.test("excluded or unassigned members cannot submit; ordinary members and inactive Board cannot review", async () => {
    await seed();
    for(const n of [100,101,102,103,104,999]) assert.equal((await submit(n)).result,"ineligible");
    await submit(); const row=await request();
    for(const n of [0,7,102,103,999]) assert.equal((await review(row.id,"approved",n,true)).result,"unauthorized");
    assert.equal((await request()).status,"pending");
  });
  await t.test("role or department changes invalidate approval but still allow rejection", async () => {
    for(const change of ["role='board'","membership_status='inactive'","member_department='hr'"]) {
      await seed(); await submit(); const row=await request();
      await db.query(`update public.profiles set ${change} where id=$1`,[id(7)]);
      assert.equal((await review(row.id,"approved",100,true)).result,"stale_request");
      assert.equal((await review(row.id,"rejected")).result,"reviewed");
    }
    await seed(); await submit(); const row=await request();
    await db.query("update public.profiles set role='board' where id=$1",[id(7)]);
    assert.equal((await review(row.id,"approved",7,true)).result,"self_review");
  });
  await t.test("invalid input never writes and only eligible members count toward balance", async () => {
    await seed();
    for(const reason of [null,"short","a".repeat(2001)]) assert.equal((await submit(7,reason)).result,"invalid");
    await db.query("update public.profiles set member_department='hr' where id in ($1,$2)",[id(100),id(101)]);
    const balance=(await db.query("select public.get_member_department_balance() value")).rows[0].value;
    assert.deepEqual(balance,{hr:7,pr:3,blockedDepartment:null});
    await submit(); const row=await request();
    assert.equal((await review(row.id,"pending")).result,"invalid");
    assert.equal((await review(row.id,"approved",100,false,"x".repeat(1001))).result,"invalid");
  });
  await t.test("browser roles cannot write or call privileged functions; members only read their own requests", async () => {
    await seed(); await submit(7); await submit(8); const row=await request();
    for(const role of ["anon","authenticated"]) {
      await db.exec(`reset role; set role ${role}`);
      await assert.rejects(submit(),{code:"42501"}); await assert.rejects(review(row.id),{code:"42501"});
      await assert.rejects(db.query("update public.member_department_requests set status='approved'"),{code:"42501"});
      await assert.rejects(db.query("delete from public.member_department_requests"),{code:"42501"});
      await assert.rejects(db.query("insert into public.member_department_requests(member_id,from_department,to_department,reason) values($1,'pr','hr','Invalid direct write')",[id(7)]),{code:"42501"});
    }
    for(const [n,expected] of [[7,1],[0,0],[100,2],[101,2],[102,0]]) {
      await db.query("select set_config('test.uid',$1,false)",[id(n)]);
      assert.equal((await db.query("select * from public.member_department_requests")).rows.length,expected);
    }
  });
});
