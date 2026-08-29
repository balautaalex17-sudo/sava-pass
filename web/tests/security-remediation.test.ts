import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { csvCell } from "../lib/csv";
import { safeLocalPath } from "../lib/safe-local-path";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("local redirects cannot escape through slash or backslash normalization", () => {
  assert.equal(safeLocalPath("/admin?tab=team#member", "/conta"), "/admin?tab=team#member");
  assert.equal(safeLocalPath("//evil.example/path", "/conta"), "/conta");
  assert.equal(safeLocalPath("/\\evil.example/path", "/conta"), "/conta");
  assert.equal(safeLocalPath("/%5c%5cevil.example/path", "/conta"), "/conta");
  assert.equal(safeLocalPath("https://evil.example", "/conta"), "/conta");
  assert.equal(safeLocalPath("/admin\r\nLocation:https://evil.example", "/conta"), "/conta");
});

test("CSV cells remain text when opened in spreadsheet software", () => {
  assert.equal(csvCell("=HYPERLINK(\"https://evil.example\")"), "\"'=HYPERLINK(\"\"https://evil.example\"\")\"");
  assert.equal(csvCell("  +1+1"), "\"'  +1+1\"");
  assert.equal(csvCell("normal value"), "\"normal value\"");
});

test("security boundaries stay present in configuration and migrations", () => {
  const nextConfig = projectFile("next.config.ts");
  const proxy = projectFile("proxy.ts");
  const baseline = projectFile("supabase/migrations/20260610000000_initial_ticketing_schema.sql");
  const migration = projectFile("supabase/migrations/20260819143420_security_audit_remediation.sql");
  const devTokens = projectFile("app/dev/tokens/page.tsx");
  const staffTestAccess = projectFile("lib/staff-test-access.ts");
  const testDatabaseGuard = projectFile("tests/safe-test-database.ts");

  assert.match(nextConfig, /bodySizeLimit: "1mb"/);
  assert.match(nextConfig, /eetuijxhkpaqggegppek\.supabase\.co/);
  assert.match(nextConfig, /Content-Security-Policy/);
  assert.match(nextConfig, /X-Content-Type-Options/);
  assert.match(proxy, /auth\.getUser\(\)/);
  assert.match(proxy, /MAX_PUBLIC_ACTION_BYTES/);
  assert.match(proxy, /pathname\.startsWith\("\/dev\/"\)/);
  assert.match(migration, /drop policy if exists "media staff insert"/);
  assert.match(migration, /insert into storage\.buckets/);
  assert.match(migration, /'media-staging'/);
  assert.match(migration, /create or replace function public\.reserve_public_ticket/);
  assert.match(migration, /create or replace function public\.consume_public_rate_limit/);
  assert.match(migration, /set search_path = ''/);
  assert.doesNotMatch(baseline, /create policy applicants_insert/);
  assert.match(baseline, /to_regprocedure\('private\.is_staff\(\)'\)/);
  assert.match(devTokens, /process\.env\.NODE_ENV !== "development"/);
  assert.match(staffTestAccess, /VERCEL_ENV !== "production"/);
  assert.match(staffTestAccess, /hostname === deploymentHostname/);
  assert.doesNotMatch(staffTestAccess, /endsWith\([^)]*\.vercel\.app/);
  assert.match(testDatabaseGuard, /PRODUCTION_PROJECT_REF = "shzyvrojbtbczqqoilip"/);
  assert.match(testDatabaseGuard, /SUPABASE_TEST_PROJECT_REF/);

  for (const integrationTest of [
    "tests/application-evaluations.test.ts",
    "tests/member-invitation-auth.test.ts",
    "tests/members-dashboard-database.test.ts",
    "tests/operational-roles-public-controls.test.ts",
    "tests/staff-test-login.test.ts",
  ]) {
    assert.match(projectFile(integrationTest), /import "\.\/safe-test-database"/);
  }
});
