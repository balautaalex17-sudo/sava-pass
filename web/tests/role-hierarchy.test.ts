import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  canAssignOperationalRoles,
  canManagePrimaryRole,
  canUseAdministrativePermission,
} from "../lib/dashboard/role-hierarchy";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Super Admin can manage every primary role", () => {
  assert.equal(canManagePrimaryRole("admin", null, "board"), true);
  assert.equal(canManagePrimaryRole("admin", "board", "admin"), true);
  assert.equal(canManagePrimaryRole("admin", "admin", null), true);
});

test("Board can manage only roles strictly below Board", () => {
  assert.equal(canManagePrimaryRole("board", null, "statistici"), true);
  assert.equal(canManagePrimaryRole("board", "statistici", null), true);
  assert.equal(canManagePrimaryRole("board", null, "board"), false);
  assert.equal(canManagePrimaryRole("board", "board", null), false);
  assert.equal(canManagePrimaryRole("board", null, "admin"), false);
  assert.equal(canManagePrimaryRole("board", "admin", null), false);
});

test("lower roles cannot administer roles or receive delegated escalation permissions", () => {
  for (const role of [null, "scanner", "interviewer", "statistici"] as const) {
    assert.equal(canManagePrimaryRole(role, null, null), false);
    assert.equal(canAssignOperationalRoles(role), false);
    assert.equal(canUseAdministrativePermission(role, "manage_members"), false);
    assert.equal(canUseAdministrativePermission(role, "manage_staff_assignments"), false);
    assert.equal(canUseAdministrativePermission(role, "manage_permissions"), false);
  }

  assert.equal(canAssignOperationalRoles("board"), true);
  assert.equal(canUseAdministrativePermission("board", "manage_members"), true);
  assert.equal(canUseAdministrativePermission("board", "manage_staff_assignments"), true);
  assert.equal(canUseAdministrativePermission("board", "manage_permissions"), false);
  assert.equal(canUseAdministrativePermission("admin", "manage_permissions"), true);
});

test("every role-changing server action rechecks the hierarchy", () => {
  const membersAction = source("app/(dashboard)/board/membri/actions.ts");
  const staffAction = source("app/(dashboard)/board/echipa/actions.ts");
  const permissionsAction = source("app/(dashboard)/board/permisiuni/actions.ts");
  const migration = source("supabase/migrations/20260829182823_enforce_role_hierarchy.sql");

  assert.match(membersAction, /canManagePrimaryRole\(viewer\.profile\.role/);
  assert.match(staffAction, /canAssignOperationalRoles\(viewer\.profile\.role\)/);
  assert.match(staffAction, /canManagePrimaryRole\(viewer\.profile\.role, target\.role, nextRole\)/);
  assert.match(permissionsAction, /canUseAdministrativePermission\(viewer\.profile\.role, "manage_permissions"\)/);
  assert.match(migration, /v_actor_role <> 'admin'::public\.staff_role/);
  assert.match(migration, /raise exception 'unauthorized_board_assignment'/);
});
