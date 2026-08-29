import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/types";
import "./safe-test-database";

const projectFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const roles = ["admin", "board", "scanner", "interviewer"] as const;

test("staff test entry is gated on the server and restricted to preview hosts", () => {
  const gate = projectFile("lib/staff-test-access.ts");
  const action = projectFile("app/devino-membru/staff-actions.ts");

  assert.match(gate, /STAFF_TEST_LOGIN_ENABLED === "true"/);
  assert.match(gate, /VERCEL_ENV !== "preview"/);
  assert.match(gate, /VERCEL_ENV !== "production"/);
  assert.match(gate, /hostname === deploymentHostname/);
  assert.match(gate, /timingSafeEqual/);
  assert.match(action, /allowPublicAction/);
  assert.match(action, /isStaffTestAccessAllowed/);
  assert.match(action, /isStaffTestCodeValid/);
  assert.match(action, /hasRequestedRole/);
  assert.match(action, /profile_roles/);
  assert.match(action, /profile\.membership_status !== "active"/);
});

test("each staff role has its own active Supabase test account", async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(url && anonKey && serviceKey, "Supabase test environment is missing");

  const admin: SupabaseClient<Database> = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const role of roles) {
    const prefix = `STAFF_TEST_${role.toUpperCase()}`;
    const email = process.env[`${prefix}_EMAIL`];
    const password = process.env[`${prefix}_PASSWORD`];
    assert.ok(email && password, `Missing ${role} test credentials`);

    const roleClient: SupabaseClient<Database> = createClient<Database>(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await roleClient.auth.signInWithPassword({ email, password });
    assert.ifError(error);
    assert.ok(data.user, `${role} account could not sign in`);
    assert.equal(data.user.app_metadata.savapass_test_account, true);

    const [{ data: profile, error: profileError }, { data: assignments, error: assignmentsError }] = await Promise.all([
      admin
        .from("profiles")
        .select("role, membership_status")
        .eq("id", data.user.id)
        .single(),
      admin
        .from("profile_roles")
        .select("role")
        .eq("profile_id", data.user.id),
    ]);
    assert.ifError(profileError);
    assert.ifError(assignmentsError);
    const effectiveRoles = new Set([
      ...(profile.role ? [profile.role] : []),
      ...(assignments ?? []).map((assignment) => assignment.role),
    ]);
    assert.equal(effectiveRoles.has(role), true);
    if (role === "admin" || role === "board") assert.equal(profile.role, role);
    assert.equal(profile.membership_status, "active");
    await roleClient.auth.signOut();
  }
});
