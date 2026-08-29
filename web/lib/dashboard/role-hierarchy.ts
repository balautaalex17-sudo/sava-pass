import type { StaffRole } from "@/lib/roles";
import type { PermissionKey } from "@/lib/dashboard/permissions";

export type PrimaryRole = StaffRole | null;

const ROLE_LEVEL: Record<StaffRole | "member", number> = {
  member: 0,
  scanner: 1,
  interviewer: 1,
  statistici: 2,
  board: 3,
  admin: 4,
};

const BOARD_ADMINISTRATION_PERMISSIONS = new Set<PermissionKey>([
  "manage_members",
  "manage_staff_assignments",
]);

/**
 * Super Admin may manage every primary role. Board may only manage profiles
 * below Board and may never grant Board or Super Admin.
 */
export function canManagePrimaryRole(
  actorRole: PrimaryRole,
  currentRole: PrimaryRole,
  nextRole: PrimaryRole,
): boolean {
  if (actorRole === "admin") return true;
  if (actorRole !== "board") return false;

  return ROLE_LEVEL[currentRole ?? "member"] < ROLE_LEVEL.board
    && ROLE_LEVEL[nextRole ?? "member"] < ROLE_LEVEL.board;
}

export function canAssignOperationalRoles(actorRole: PrimaryRole): boolean {
  return actorRole === "admin" || actorRole === "board";
}

/** Permission mappings can never delegate access-control administration upward. */
export function canUseAdministrativePermission(
  actorRole: PrimaryRole,
  permission: PermissionKey,
): boolean {
  if (permission === "manage_permissions") return actorRole === "admin";
  if (BOARD_ADMINISTRATION_PERMISSIONS.has(permission)) {
    return actorRole === "admin" || actorRole === "board";
  }
  return true;
}
