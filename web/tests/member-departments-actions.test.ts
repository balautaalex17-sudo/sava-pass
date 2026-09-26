import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as departments from "../lib/dashboard/member-departments";

// Execute real server actions with allowlisted, disposable dependencies only.
function fixture({ role = null, status = "active", department = null, signedIn = true, response = { result: "selected", department: "hr" }, databaseError = false }: {
  role?: string | null; status?: string; department?: string | null;
  signedIn?: boolean; response?: Record<string, unknown>; databaseError?: boolean;
} = {}) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const invalidations: string[] = [];
  const viewer = signedIn ? {
    user: { id: "signed-in-member" }, roles: role ? [role] : [],
    profile: { role, membership_status: status, member_department: department },
  } : null;
  const imports: Record<string, unknown> = {
    "next/navigation": { redirect(path: string) { throw new Error(`redirect:${path}`); } },
    "next/cache": { revalidatePath(path: string) { invalidations.push(path); } },
    "@/lib/dashboard/auth": { async getDashboardViewer() { return viewer; } },
    "@/lib/dashboard/member-departments": departments,
    "@/lib/supabase/admin": { supabaseAdmin: { async rpc(name: string, args: Record<string, unknown>) {
      calls.push({ name, args });
      return { data: response, error: databaseError ? new Error("Database unavailable") : null };
    } } },
    "@/lib/server-log": { logServerError() {} },
  };
  function load<T>(path: string): T {
    const filename = resolve(path);
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
    });
    const exports = {};
    runInNewContext(outputText, { exports, require(name: string) {
      assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
      return imports[name];
    } }, { filename });
    return exports as T;
  }
  return {
    calls, invalidations,
    action: load<typeof import("../app/conta/departament/actions")>("app/conta/departament/actions.ts").chooseMemberDepartment,
  };
}
function form(department: string) {
  const data = new FormData(); data.set("department", department);
  data.set("profile_id", "another-member"); return data;
}

test("selection uses the authenticated identity and returns success without navigating away", async () => {
  const f = fixture();
  const result = await f.action({ message: "" }, form("hr"));
  assert.equal(result.department, "hr");
  assert.equal(f.calls[0].name, "select_member_department");
  assert.equal(f.calls[0].args.p_profile_id, "signed-in-member");
  assert.equal(f.calls[0].args.p_department, "hr");
  assert.deepEqual(f.invalidations, ["/"]);
});
test("signed-out, Board, Super Admin, recruits and invalid input never reach the database", async () => {
  const guest = fixture({ signedIn: false });
  await assert.rejects(guest.action({ message: "" }, form("hr")), /redirect:\/conta\/login/);
  assert.equal(guest.calls.length, 0);
  for (const config of [{ role: "board" }, { role: "admin" }, { status: "recruit" }, { status: "inactive" }]) {
    const f = fixture(config);
    assert.ok((await f.action({ message: "" }, form("hr"))).message);
    assert.equal(f.calls.length, 0);
  }
  const invalid = fixture();
  assert.match((await invalid.action({ message: "" }, form("admin"))).message, /Alege HR sau PR/);
  assert.equal(invalid.calls.length, 0);
});
test("stale availability returns the blocked explanation and fresh button state", async () => {
  const f = fixture({ response: { result: "blocked", hr: 8, pr: 2, blockedDepartment: "hr" } });
  const state = await f.action({ message: "" }, form("hr"));
  assert.equal(state.options?.blockedDepartment, "hr");
  assert.match(state.message, /peste 75%/);
  assert.match(state.message, /Alege PR/);
  assert.equal(f.invalidations.length, 0);
});
test("database failures allow a retry and do not report success", async () => {
  const f = fixture({ databaseError: true });
  assert.match((await f.action({ message: "" }, form("hr"))).message, /Încearcă din nou/);
  assert.equal(f.invalidations.length, 0);
});
test("repeat submissions close the popup without changing the saved department", async () => {
  const f = fixture({ department: "pr", response: { result: "already_selected", department: "pr" } });
  assert.equal((await f.action({ message: "" }, form("hr"))).department, "pr");
});
