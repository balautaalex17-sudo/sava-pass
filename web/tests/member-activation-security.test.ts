import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const projectFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("member activation codes have no time expiry and remain private single-use credentials", () => {
  const migration = projectFile(
    "supabase/migrations/20260829122513_permanent_member_activation_codes.sql",
  );

  assert.match(migration, /create table private\.member_activation_codes/);
  assert.doesNotMatch(migration, /expires_at/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table private\.member_activation_codes from public, anon, authenticated/);
  assert.match(migration, /claim_member_activation_code/);
  assert.match(migration, /finish_member_activation_code/);
  assert.match(migration, /release_member_activation_code/);
  assert.match(migration, /grant execute on function public\.issue_member_activation_code[^;]+to service_role/);
  assert.doesNotMatch(migration, /grant execute[^;]+to anon|grant execute[^;]+to authenticated/);
});

test("activation is rate-limited, hashed, and exchanged for a server-side session", () => {
  const code = projectFile("lib/member-activation-code.ts");
  const action = projectFile("app/invite/actions.ts");
  const client = projectFile("app/invite/InviteClient.tsx");

  assert.match(code, /MEMBER_ACTIVATION_CODE_LENGTH = 12/);
  assert.match(code, /createHmac\("sha256"/);
  assert.match(code, /member-activation-v1/);
  assert.match(action, /allowPublicAction/);
  assert.match(action, /subjectLimit: 8/);
  assert.match(action, /claim_member_activation_code/);
  assert.match(action, /auth\.verifyOtp/);
  assert.match(action, /finish_member_activation_code/);
  assert.match(client, /Codul nu expiră și poate fi folosit o singură dată/);
});
