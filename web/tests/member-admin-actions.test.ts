import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { canManagePrimaryRole } from "../lib/dashboard/role-hierarchy";
import { renderMemberInvitationEmail } from "../lib/member-invitation-email";
import type { SendEmailArgs } from "../lib/email";
import type { StaffRole } from "../lib/roles";

// Execute the real actions and invitation helpers with an explicit import
// allowlist. No environment file, network client, or email provider is loaded.
function loadSource<T>(path: string, imports: Record<string, unknown>): T {
  const filename = resolve(process.cwd(), path);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    URL,
    require(name: string) {
      assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
      return imports[name];
    },
  }, { filename });
  return exports as T;
}

const memberId = "a0655d15-cead-4f99-a245-4cead6ac9350";
const viewerId = "b0655d15-cead-4f99-a245-4cead6ac9350";
const values = {
  fullName: "Ana Popescu",
  email: "ana@example.com",
  phone: "",
  grade: "",
  membershipStatus: "active",
  role: null,
};
const profile = { id: memberId, full_name: values.fullName, email: values.email, role: null, membership_status: "active" };

function fixture(options: {
  existing?: boolean;
  confirmed?: boolean;
  profile?: { role: StaffRole | null; membership_status: string; email: string };
  viewerRole?: StaffRole | null;
  forbidden?: boolean;
  saveFails?: boolean;
  codeFails?: boolean;
  emailFails?: boolean;
  mismatchedUser?: boolean;
} = {}) {
  const events: string[] = [];
  const emails: SendEmailArgs[] = [];
  let saved: Record<string, unknown> | null = null;
  let codeHash: string | null = null;
  const user = {
    id: options.mismatchedUser ? viewerId : memberId,
    email: values.email,
    confirmed_at: options.confirmed ? "2026-09-08T10:00:00Z" : null,
  };
  const admin = {
    auth: { admin: {
      async listUsers() { events.push("auth.lookup"); return { data: { users: options.existing ? [user] : [] }, error: null }; },
      async generateLink() { events.push("auth.create"); return { data: { user }, error: null }; },
      async deleteUser() { events.push("auth.delete"); return { error: null }; },
    } },
    from(table: string) {
      assert.equal(table, "profiles");
      const query = {
        select() { return query; },
        eq() { return query; },
        async maybeSingle() { return { data: options.profile ?? null, error: null }; },
        async insert(row: Record<string, unknown>) {
          events.push("profile.insert");
          if (!options.saveFails) saved = row;
          return { error: options.saveFails ? new Error("insert failed") : null };
        },
        update(row: Record<string, unknown>) {
          events.push("profile.update");
          saved = row;
          return { eq: async () => ({ error: null }) };
        },
      };
      return query;
    },
    async rpc(name: string, args: { p_email: string; p_code_hash: string }) {
      assert.equal(name, "issue_member_activation_code");
      assert.equal(args.p_email, values.email);
      events.push("code.issue");
      codeHash = args.p_code_hash;
      return { data: !options.codeFails, error: null };
    },
  };
  const imports: Record<string, unknown> = {
    "server-only": {},
    "node:crypto": crypto,
    "zod": { z },
    "next/cache": { revalidatePath() {} },
    "@/lib/env": { serverEnv: { QR_SIGNING_SECRET: "disposable-unit-test-secret-with-32-characters" } },
    "@/lib/dashboard/auth": { async requirePermission(permission: string) {
      assert.equal(permission, "manage_members");
      if (options.forbidden) throw new Error("forbidden");
      return { profile: { id: viewerId, role: options.viewerRole === undefined ? "board" : options.viewerRole } };
    } },
    "@/lib/dashboard/role-hierarchy": { canManagePrimaryRole },
    "@/lib/supabase/admin": { supabaseAdmin: admin },
    "@/lib/server-log": { logServerError() {} },
    "@/lib/audit": { async logAudit() { events.push("audit"); } },
    "@/lib/site-url": { resolveSiteUrl: () => "https://savapass.example" },
    "@/lib/member-invitation-email": { renderMemberInvitationEmail },
    "@/lib/email": { async sendEmail(email: SendEmailArgs) {
      events.push("email.send");
      emails.push(email);
      return { ok: !options.emailFails };
    } },
  };
  imports["@/lib/member-activation-code"] = loadSource("lib/member-activation-code.ts", imports);
  imports["@/lib/dashboard/member-auth"] = loadSource("lib/dashboard/member-auth.ts", imports);
  const actions = loadSource<typeof import("../app/(dashboard)/board/membri/actions")>("app/(dashboard)/board/membri/actions.ts", imports);
  return { actions, events, emails, get saved() { return saved; }, get codeHash() { return codeHash; } };
}

test("adding a member saves the profile before emailing its matching private activation code", async () => {
  const f = fixture();
  const result = await f.actions.saveMember({ ...values, email: " Ana@Example.com " });
  assert.equal(result.ok, true);
  assert.equal(result.tone, "success");
  assert.match(result.message, /ana@example\.com/);
  assert.deepEqual(f.events, ["auth.lookup", "auth.create", "profile.insert", "code.issue", "email.send", "audit"]);
  assert.equal(f.saved?.email, values.email);
  assert.equal(f.emails.length, 1);
  assert.equal(f.emails[0].to, values.email);
  const code = f.emails[0].text?.match(/Cod de activare: (\d{12})/)?.[1];
  assert.ok(code);
  assert.equal(f.codeHash, crypto.createHmac("sha256", "disposable-unit-test-secret-with-32-characters")
    .update(`member-activation-v1\0${values.email}\0${code}`).digest("hex"));
  assert.match(f.emails[0].text!, /https:\/\/savapass\.example\/invite\?email=ana%40example.com/);
  assert.equal(JSON.stringify(result).includes(code), false);
});

test("duplicate member adds leave the previous activation code and profile untouched", async () => {
  const f = fixture({ existing: true, profile });
  const result = await f.actions.saveMember(values);
  assert.equal(result.ok, false);
  assert.match(result.message, /deja un profil/);
  assert.deepEqual(f.events, ["auth.lookup"]);
});

test("saving a new profile never falls back to an upsert when another request inserts it", async () => {
  const f = fixture({ existing: true, saveFails: true });
  assert.equal((await f.actions.saveMember(values)).ok, false);
  assert.deepEqual(f.events, ["auth.lookup", "profile.insert"]);
});

test("failed profile creation removes only the newly created Auth user and sends no code", async () => {
  const f = fixture({ saveFails: true });
  assert.equal((await f.actions.saveMember(values)).ok, false);
  assert.deepEqual(f.events, ["auth.lookup", "auth.create", "profile.insert", "auth.delete"]);
});

for (const failure of ["codeFails", "emailFails"] as const) {
  test(`${failure} preserves the saved member and explains how to retry`, async () => {
    const f = fixture({ [failure]: true });
    const result = await f.actions.saveMember(values);
    assert.equal(result.ok, true);
    assert.equal(result.tone, "warning");
    assert.ok(f.saved);
    assert.match(result.message, /Retrimite codul/);
    assert.equal(f.events.includes("auth.delete"), false);
    assert.equal(f.emails.length, failure === "codeFails" ? 0 : 1);
  });
}

test("existing confirmed accounts keep their login without receiving a fresh credential", async () => {
  const f = fixture({ existing: true, confirmed: true });
  assert.equal((await f.actions.saveMember(values)).ok, true);
  assert.deepEqual(f.events, ["auth.lookup", "profile.insert", "audit"]);
});

test("invalid inputs and forbidden roles are rejected before account creation", async () => {
  for (const input of [
    { ...values, email: "invalid" }, { ...values, fullName: " " },
    { ...values, role: "board" }, { ...values, role: "admin" },
    { ...values, membershipStatus: "suspended" },
    { ...values, membershipStatus: "recruit", role: "statistici" },
  ]) {
    const f = fixture();
    assert.equal((await f.actions.saveMember(input)).ok, false);
    assert.deepEqual(f.events, []);
  }
  const f = fixture({ forbidden: true });
  assert.equal((await f.actions.saveMember(values)).ok, false);
  assert.equal((await f.actions.resendMemberInvitation({ id: memberId })).ok, false);
  assert.deepEqual(f.events, []);
});

test("editing an existing member updates their profile without issuing a new code", async () => {
  const f = fixture({ existing: true, profile });
  assert.equal((await f.actions.saveMember({ ...values, id: memberId, grade: "XI B" })).ok, true);
  assert.deepEqual(f.events, ["profile.update", "audit"]);
  assert.equal(f.saved?.grade, "XI B");
  const missing = fixture();
  assert.equal((await missing.actions.saveMember({ ...values, id: memberId })).ok, false);
  assert.deepEqual(missing.events, []);
});

test("resending checks identity and role before replacing a code", async () => {
  for (const role of ["board", "admin"] as const) {
    const f = fixture({ existing: true, profile: { ...profile, role } });
    assert.equal((await f.actions.resendMemberInvitation({ id: memberId })).ok, false);
    assert.deepEqual(f.events, []);
  }
  const mismatch = fixture({ existing: true, profile, mismatchedUser: true });
  assert.equal((await mismatch.actions.resendMemberInvitation({ id: memberId })).ok, false);
  assert.deepEqual(mismatch.events, ["auth.lookup"]);
});

test("eligible members can receive a replacement code while confirmed or inactive accounts cannot", async () => {
  const f = fixture({ existing: true, profile });
  assert.equal((await f.actions.resendMemberInvitation({ id: memberId })).ok, true);
  assert.deepEqual(f.events, ["auth.lookup", "code.issue", "email.send", "audit"]);
  for (const options of [{ confirmed: true }, { profile: { ...profile, membership_status: "inactive" } }]) {
    const blocked = fixture({ existing: true, profile, ...options });
    assert.equal((await blocked.actions.resendMemberInvitation({ id: memberId })).ok, false);
    assert.equal(blocked.events.includes("code.issue"), false);
    assert.equal(blocked.emails.length, 0);
  }
});

test("new recruits receive the recruit activation email", async () => {
  const f = fixture();
  assert.equal((await f.actions.saveMember({ ...values, membershipStatus: "recruit" })).ok, true);
  assert.match(f.emails[0].subject, /recrut/);
});
