// Real account/recruitment actions with disposable in-memory adapters. Never
// loads env files, contacts Auth/Drive, or sends email. SQL atomicity/RLS are
// covered separately in recruit-accounts-database.sql.
import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import test, { beforeEach } from "node:test";
import { build } from "esbuild";

const root = process.cwd();
const req = createRequire(resolve(root, "package.json"));
const f = {};
globalThis.__recruitFixture = f;
globalThis.fetch = async () => { throw new Error("Live access is forbidden in recruit tests"); };
beforeEach(() => {
  const board = { id: randomUUID(), full_name: "Board fixture", email: "board@example.com", role: "board", membership_status: "active" };
  Object.assign(f, { board, viewer: { profile: board }, claims: { sub: board.id }, users: [],
    tables: { profiles: [board], membership_applications: [], interviews: [], application_status_events: [], profile_roles: [], profile_permission_overrides: [], role_permissions: [] },
    emails: [], notifications: [], trace: [], deleted: [], failRpc: false, failEmail: false, ambiguousCommit: false,
  });
});

f.from = (table) => {
  assert.ok(table in f.tables, `Unexpected table ${table}`);
  const predicates = []; let operation = "select", input, single = false;
  const q = {
    select() { return q; }, eq(k, v) { predicates.push(r => r[k] === v); return q; },
    neq(k, v) { predicates.push(r => r[k] !== v); return q; }, in(k, values) { predicates.push(r => values.includes(r[k])); return q; },
    update(v) { operation = "update"; input = v; return q; }, insert(v) { operation = "insert"; input = v; return q; },
    upsert(v) { operation = "upsert"; input = v; return q; }, maybeSingle() { single = true; return q; }, single() { single = true; return q; },
    then(resolve) {
      let rows = f.tables[table].filter(r => predicates.every(p => p(r)));
      if (operation === "insert" || operation === "upsert") {
        const existing = operation === "upsert" && f.tables[table].find(r => r.id === input.id);
        if (existing) { Object.assign(existing, input); rows = [existing]; }
        else { const created = { id: randomUUID(), ...input }; f.tables[table].push(created); rows = [created]; }
      }
      if (operation === "update") rows.forEach(r => Object.assign(r, input));
      resolve({ data: single ? rows[0] ?? null : rows, error: null, count: rows.length });
    },
  };
  return q;
};
f.rpc = async (name, args) => {
  f.trace.push(name);
  if (name === "issue_member_activation_code") return { data: true, error: null };
  assert.equal(name, "accept_recruit_application");
  if (f.failRpc) return { data: null, error: new Error("fixture DB failure") };
  const application = f.tables.membership_applications.find(r => r.id === args.p_application_id);
  if (application.status !== args.p_expected_status) return { data: null, error: null };
  let profile = f.tables.profiles.find(r => r.id === args.p_user_id);
  if (!profile) {
    profile = { id: args.p_user_id, full_name: application.full_name, email: application.email, role: null, membership_status: "recruit" };
    f.tables.profiles.push(profile);
  }
  application.status = "accepted";
  if (f.ambiguousCommit) return { data: null, error: new Error("fixture lost response") };
  return { data: profile.membership_status, error: null };
};
f.admin = {
  async listUsers() { f.trace.push("listUsers"); return { data: { users: f.users }, error: null }; },
  async generateLink({ type, email }) {
    assert.equal(type, "invite");
    const user = { id: randomUUID(), email, confirmed_at: null };
    f.users.push(user); f.trace.push("generateLink");
    return { data: { user }, error: null };
  },
  async deleteUser(id) { f.deleted.push(id); f.users = f.users.filter(r => r.id !== id); return { error: null }; },
};
const adapters = {
  "server-only": "",
  "@/lib/env": "export const serverEnv={QR_SIGNING_SECRET:'disposable-recruit-test-key-no-production-access'}",
  "@/lib/dashboard/auth": `export async function requirePermission(){const f=globalThis.__recruitFixture;if(!f.viewer || f.viewer.profile.membership_status!=='active' || !['admin','board'].includes(f.viewer.profile.role))throw Error('UNAUTHORIZED');return f.viewer}`,
  "@/lib/supabase/admin": `const f=globalThis.__recruitFixture;export const supabaseAdmin={from:(...a)=>f.from(...a),rpc:(...a)=>f.rpc(...a),auth:{admin:f.admin}}`,
  "@/lib/supabase/server": `export async function createClient(){return {auth:{getClaims:async()=>({data:{claims:globalThis.__recruitFixture.claims}})}}}`,
  "@/lib/email": `export async function sendEmail(input){const f=globalThis.__recruitFixture;f.trace.push('sendEmail');f.emails.push(input);return {ok:!f.failEmail}}`,
  "@/lib/notifications": `export async function createNotification(input){const f=globalThis.__recruitFixture;f.notifications.push(input);return {ok:true}};export async function deliverNotification(){return {ok:true}}`,
  "@/lib/audit": "export async function logAudit(){}",
  "@/lib/server-log": "export function logServerError(){}",
  "@/lib/site-url": "export function resolveSiteUrl(){return 'https://fixture.example'}",
  "next/cache": "export function revalidatePath(){}",
  "next/navigation": "export function redirect(path){throw new Error('REDIRECT:'+path)}",
};
const bundle = await build({
  stdin: { contents: 'export * from "./app/(dashboard)/board/inscrieri/actions"; export * from "./app/(dashboard)/board/membri/actions"; export * from "./lib/dashboard/recruit-account"; export {getDashboardViewer,requirePermission as realRequirePermission,requirePagePermission} from "./lib/dashboard/auth"; export {default as RecruitPage} from "./app/conta/recrut/page";', loader: "ts", resolveDir: root },
  bundle: true, write: false, platform: "node", format: "cjs", tsconfig: resolve(root, "tsconfig.json"),
  plugins: [{ name: "no-live-access", setup(build) {
    build.onResolve({ filter: /.*/ }, a => {
      if (a.path === "./RecruitHome") return { path: "home", namespace: "fixture" };
      // The recruit page uses the actual viewer function under test.
      if (a.path === "@/lib/dashboard/auth" && /[\\/]recrut[\\/]page\.tsx$/.test(a.importer)) return { path: resolve(root, "lib/dashboard/auth.ts") };
      return Object.hasOwn(adapters, a.path) ? { path: a.path, namespace: "fixture" } : undefined;
    });
    build.onLoad({ filter: /.*/, namespace: "fixture" }, a => ({ contents: a.path === "home" ? "export function RecruitHome(){return null}" : adapters[a.path], loader: "js" }));
  } }],
});
const fixtureModule = new Module(resolve(root, "tests/recruit.fixture.cjs"));
fixtureModule.filename = resolve(root, "tests/recruit.fixture.cjs"); fixtureModule.paths = req.resolve.paths(".");
fixtureModule._compile(bundle.outputFiles[0].text, fixtureModule.filename);
const actions = fixtureModule.exports;

function candidate(status = "interview_completed", email = "recruit@example.com") {
  const application = { id: randomUUID(), full_name: "Ana Recrut", email, phone: "0700000000", grade: "X A", status };
  f.tables.membership_applications.push(application);
  return application;
}
function accept(application) { return actions.runRecruitmentBatchAction({ action: "accept", applicationIds: [application.id] }); }

test("final acceptance creates a recruit and sends an activation code only after the profile is saved", async () => {
  const application = candidate();
  const result = await accept(application);
  assert.equal(result.ok, true);
  assert.deepEqual(result.processedIds, [application.id]);
  assert.equal(f.tables.profiles[1].membership_status, "recruit");
  assert.equal(f.tables.profiles[1].role, null);
  assert.match(f.emails[0].subject, /Contul tău de recrut/);
  assert.match(f.emails[0].text, /galeria foto/);
  assert.match(f.emails[0].text, /Cod de activare: \d{12}/);
  assert.ok(f.trace.indexOf("accept_recruit_application") < f.trace.indexOf("sendEmail"));
  assert.ok(f.trace.indexOf("accept_recruit_application") < f.trace.indexOf("issue_member_activation_code"));
  await accept(application);
  assert.equal(f.users.length, 1);
  assert.equal(f.emails.length, 1);
});

test("submission and interview selection do not grant a recruit account", async () => {
  const application = candidate("submitted");
  assert.equal((await accept(application)).ok, false);
  const selected = await actions.updateApplicationOperations({ applicationId: application.id, status: "selected_for_interview", reviewerId: f.board.id });
  assert.equal(selected.ok, true);
  assert.equal(f.users.length, 0);
  assert.equal(f.emails.length, 0);
  assert.equal(f.trace.length, 0);
});

test("confirmed accounts are reused and existing member access is preserved", async () => {
  const existing = { id: randomUUID(), email: "existing@example.com", confirmed_at: "2026-01-01" };
  f.users.push(existing);
  f.tables.profiles.push({ ...existing, full_name: "Existing Board", role: "board", membership_status: "active" });
  assert.equal((await accept(candidate("interview_completed", existing.email))).ok, true);
  assert.equal(f.tables.profiles[1].membership_status, "active");
  assert.equal(f.tables.profiles[1].role, "board");
  assert.equal(f.emails.length, 0);
  assert.match(f.notifications[0].variables.result_message, /aceeași parolă/);
  assert.equal(f.users.length, 1);
});

test("failed acceptance removes only a newly created, unused Auth account", async () => {
  f.failRpc = true;
  const application = candidate();
  assert.equal((await accept(application)).ok, false);
  assert.equal(application.status, "interview_completed");
  assert.equal(f.users.length, 0);
  assert.equal(f.emails.length, 0);
  assert.equal(f.deleted.length, 1);
});

test("concurrent acceptance issues one activation code, so a losing request cannot invalidate it", async () => {
  const application = candidate();
  f.users.push({ id: randomUUID(), email: application.email, confirmed_at: null });
  const results = await Promise.all([
    actions.acceptRecruitAccount({ ...application }, f.board.id, f.board.id),
    actions.acceptRecruitAccount({ ...application }, f.board.id, f.board.id),
  ]);
  assert.equal(results.filter(r => r.changed).length, 1);
  assert.equal(f.trace.filter(name => name === "issue_member_activation_code").length, 1);
  assert.equal(f.emails.length, 1);
});

test("an uncertain response never deletes a committed recruit account", async () => {
  f.ambiguousCommit = true;
  await accept(candidate());
  assert.equal(f.tables.profiles[1].membership_status, "recruit");
  assert.equal(f.users.length, 1);
  assert.equal(f.deleted.length, 0);
});

test("failed emails can be resent by Board and promotion preserves account identity", async () => {
  f.failEmail = true;
  const application = candidate();
  const result = await accept(application);
  assert.deepEqual(result.processedIds, [application.id]);
  assert.equal(result.ok, false);
  const recruit = f.tables.profiles[1];
  f.failEmail = false;
  assert.equal((await actions.resendMemberInvitation({ id: recruit.id })).ok, true);
  assert.match(f.emails[1].subject, /recrut/);
  const promoted = await actions.saveMember({ id: recruit.id, fullName: recruit.full_name, email: recruit.email, membershipStatus: "active", role: null });
  assert.equal(promoted.ok, true);
  assert.equal(recruit.membership_status, "active");
  assert.equal(f.users.length, 1);
});

test("recruits cannot accept applicants, manage members or enter member-only pages", async () => {
  await accept(candidate());
  const recruit = f.tables.profiles[1];
  f.viewer = { profile: recruit }; f.claims = { sub: recruit.id };
  const previousEmails = f.emails.length;
  assert.equal((await accept(candidate())).ok, false);
  assert.equal((await actions.saveMember({ id: recruit.id, fullName: recruit.full_name, email: recruit.email, membershipStatus: "active", role: null })).ok, false);
  assert.equal(f.emails.length, previousEmails);
  const viewer = await actions.getDashboardViewer();
  assert.equal(viewer.permissions.size, 0);
  await assert.rejects(actions.realRequirePermission("manage_members"), /INACTIVE_MEMBER/);
  await assert.rejects(actions.requirePagePermission("view_member_dashboard"), /REDIRECT:\/conta\/recrut/);
  assert.ok(await actions.RecruitPage());
  recruit.membership_status = "active";
  await assert.rejects(actions.RecruitPage(), /REDIRECT:\/membru/);
  f.claims = null;
  await assert.rejects(actions.RecruitPage(), /REDIRECT:\/conta\/login/);
});

test("duplicate email creation cannot overwrite another profile or grant administrative roles to recruits", async () => {
  f.users.push({ id: f.board.id, email: f.board.email, confirmed_at: "2026-01-01" });
  const input = { fullName: "New recruit", email: f.board.email, membershipStatus: "recruit", role: null };
  assert.equal((await actions.saveMember(input)).ok, false);
  assert.equal(f.board.membership_status, "active");
  assert.equal(f.board.role, "board");
  assert.equal((await actions.saveMember({ ...input, email: "fresh@example.com", role: "statistici" })).ok, false);
});
