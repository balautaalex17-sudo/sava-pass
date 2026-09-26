import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as requests from "../lib/dashboard/department-requests";
import * as departments from "../lib/dashboard/member-departments";
import { resultObject } from "../lib/dashboard/scan-results";

function fixture({ role = null, status = "active", department = "hr", signedIn = true, response = { result: "submitted" }, databaseError = false, rateLimit = true }: {
  role?: string | null; status?: string; department?: string | null; signedIn?: boolean;
  response?: Record<string, unknown>; databaseError?: boolean; rateLimit?: boolean;
} = {}) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const invalidations: string[] = [];
  const viewer = { user: { id: "verified-identity" }, profile: { role, membership_status: status, member_department: department }, roles: role ? [role] : [] };
  const imports: Record<string, unknown> = {
    "next/cache": { revalidatePath(path: string) { invalidations.push(path); } },
    "./auth": { async requirePermission() { if (!signedIn || status !== "active") throw new Error("Unauthorized"); return viewer; } },
    "./department-requests": requests, "./member-departments": departments, "./scan-results": { resultObject },
    "./rate-limit": { async consumeDashboardRateLimit() { return rateLimit; } },
    "@/lib/server-log": { logServerError() {} },
    "@/lib/supabase/admin": { supabaseAdmin: { async rpc(name: string, args: Record<string, unknown>) {
      calls.push({ name, args }); return { data: response, error: databaseError ? new Error("Unavailable") : null };
    } } },
  };
  const filename = resolve("lib/dashboard/department-request-actions.ts");
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename });
  const exports = {};
  runInNewContext(outputText, { exports, require(name: string) { assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`); return imports[name]; } }, { filename });
  return { actions: exports as typeof import("../lib/dashboard/department-request-actions"), calls, invalidations };
}
const reviewInput = { requestId: "00000000-0000-4000-8000-000000000001", decision: "approved", note: "" };

test("member submits a reason with verified identity and no balance restriction", async () => {
  const f = fixture();
  assert.equal((await f.actions.submitDepartmentRequest({ reason: "  Vreau să contribui la PR.  " })).ok, true);
  assert.equal(f.calls[0].name, "submit_member_department_request");
  assert.equal(f.calls[0].args.p_member_id, "verified-identity");
  assert.equal(f.calls[0].args.p_reason, "Vreau să contribui la PR.");
  assert.deepEqual(f.invalidations, ["/membru/profil", "/board/cereri-departament"]);
});
test("excluded accounts, invalid or forged input, and rate limits cannot submit", async () => {
  for (const config of [{ role: "board" }, { role: "admin" }, { status: "recruit" }, { signedIn: false }, { department: null }, { rateLimit: false }]) {
    const f = fixture(config);
    assert.equal((await f.actions.submitDepartmentRequest({ reason: "Vreau să contribui la PR." })).ok, false);
    assert.equal(f.calls.length, 0);
  }
  for (const input of [{ reason: "short" }, { reason: "Vreau să contribui la PR.", memberId: "victim" }, { reason: "Vreau să contribui la PR.", department: "admin" }]) {
    const f = fixture(); assert.equal((await f.actions.submitDepartmentRequest(input)).ok, false); assert.equal(f.calls.length, 0);
  }
});
test("only Board and Super Admin can review even if another account has a permission override", async () => {
  for (const role of [null, "scanner", "interviewer"]) {
    const f = fixture({ role }); assert.equal((await f.actions.reviewDepartmentRequest(reviewInput)).ok, false); assert.equal(f.calls.length, 0);
  }
  for (const role of ["board", "admin"]) {
    const f = fixture({ role, response: { result: "reviewed" } });
    assert.equal((await f.actions.reviewDepartmentRequest(reviewInput)).ok, true);
    assert.equal(f.calls[0].args.p_actor_id, "verified-identity");
    assert.equal(f.calls[0].args.p_accept_imbalance, false);
    assert.deepEqual(f.invalidations, ["/"]);
  }
});
test("fresh balance warning requires acknowledgment without pretending approval succeeded", async () => {
  const f = fixture({ role: "board", response: { result: "balance_warning", hr: 8, pr: 2, blockedDepartment: "hr" } });
  const result = await f.actions.reviewDepartmentRequest(reviewInput);
  assert.equal(result.ok, false); assert.equal(result.balanceWarning, true); assert.match(result.message, /75%/);
  assert.equal(f.invalidations.length, 0);
  const confirmed = fixture({ role: "board", response: { result: "reviewed" } });
  assert.equal((await confirmed.actions.reviewDepartmentRequest({ ...reviewInput, acceptImbalance: true })).ok, true);
  assert.equal(confirmed.calls[0].args.p_accept_imbalance, true);
});
test("invalid review input and forged reviewer identities never reach the database", async () => {
  for (const input of [{ ...reviewInput, actorId: "someone-else" }, { ...reviewInput, decision: "pending" }, { ...reviewInput, acceptImbalance: "true" }, { ...reviewInput, note: "a".repeat(1001) }]) {
    const f = fixture({ role: "board" }); assert.equal((await f.actions.reviewDepartmentRequest(input)).ok, false); assert.equal(f.calls.length, 0);
  }
});
test("stale reviews, duplicates and database errors do not report success", async () => {
  for (const result of ["already_reviewed", "stale_request", "not_found", "self_review"]) {
    const f = fixture({ role: "board", response: { result } });
    assert.equal((await f.actions.reviewDepartmentRequest(reviewInput)).ok, false); assert.equal(f.invalidations.length, 0);
  }
  const duplicate = fixture({ response: { result: "already_requested" } });
  assert.match((await duplicate.actions.submitDepartmentRequest({ reason: "Vreau să contribui la PR." })).message, /deja o cerere/);
  const error = fixture({ role: "board", databaseError: true });
  assert.equal((await error.actions.reviewDepartmentRequest(reviewInput)).ok, false); assert.equal(error.invalidations.length, 0);
});
