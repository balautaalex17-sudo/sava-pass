import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/supabase/types";
import type { StaffRole } from "@/lib/roles";
import {
  MEMBER_BASELINE_PERMISSIONS,
  PERMISSIONS,
  isPermissionKey,
  type PermissionKey,
} from "@/lib/dashboard/permissions";
import { canUseAdministrativePermission } from "@/lib/dashboard/role-hierarchy";

export type DashboardProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "email"
  | "role"
  | "membership_status"
  | "member_ref"
  | "avatar_url"
  | "phone"
  | "grade"
>;

export interface DashboardViewer {
  user: {
    id: string;
    email?: string;
  };
  profile: DashboardProfile;
  roles: readonly StaffRole[];
  isAdminEquivalent: boolean;
  permissions: ReadonlySet<PermissionKey>;
  permissionKeys: readonly PermissionKey[];
}

export class DashboardAccessError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "UNAUTHORIZED" | "INACTIVE_MEMBER",
  ) {
    super(code);
    this.name = "DashboardAccessError";
  }
}

export const getDashboardViewer = cache(async (): Promise<DashboardViewer | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  const user = {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
  };

  // Profile, operational roles and permission overrides are all keyed by the
  // same user id, so they can be fetched in one parallel round trip.
  const [
    { data: profile, error: profileError },
    { data: operationalRoleRows, error: operationalRolesError },
    { data: overrides, error: overrideError },
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, email, role, membership_status, member_ref, avatar_url, phone, grade",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabaseAdmin
      .from("profile_roles")
      .select("role")
      .eq("profile_id", user.id),
    supabaseAdmin
      .from("profile_permission_overrides")
      .select("permission_key, allowed")
      .eq("profile_id", user.id),
  ]);

  if (profileError) throw profileError;
  if (operationalRolesError) throw operationalRolesError;
  if (overrideError) throw overrideError;
  if (!profile) return null;

  const roleSet = new Set<StaffRole>();
  if (profile.role) roleSet.add(profile.role);
  for (const row of operationalRoleRows ?? []) roleSet.add(row.role);
  const roles = [...roleSet];
  const isAdminEquivalent = roles.includes("admin") || roles.includes("board");

  const permissionKeys = new Set<PermissionKey>();
  if (profile.membership_status === "active") {
    for (const permission of MEMBER_BASELINE_PERMISSIONS) permissionKeys.add(permission);

    if (isAdminEquivalent) {
      for (const permission of PERMISSIONS) {
        if (canUseAdministrativePermission(profile.role, permission)) {
          permissionKeys.add(permission);
        }
      }
    } else {
      const roleKeys = ["member", ...roles];

      const { data: rolePermissions, error: roleError } = await supabaseAdmin
        .from("role_permissions")
        .select("permission_key")
        .in("role_key", roleKeys);
      if (roleError) throw roleError;

      for (const row of rolePermissions ?? []) {
        if (
          isPermissionKey(row.permission_key)
          && canUseAdministrativePermission(profile.role, row.permission_key)
        ) {
          permissionKeys.add(row.permission_key);
        }
      }

      for (const override of overrides ?? []) {
        if (!isPermissionKey(override.permission_key)) continue;
        if (!canUseAdministrativePermission(profile.role, override.permission_key)) continue;
        if (override.allowed) permissionKeys.add(override.permission_key);
        else if (!MEMBER_BASELINE_PERMISSIONS.includes(override.permission_key as (typeof MEMBER_BASELINE_PERMISSIONS)[number])) permissionKeys.delete(override.permission_key);
      }
    }
  }

  const keys = [...permissionKeys];
  return {
    user,
    profile,
    roles,
    isAdminEquivalent,
    permissions: permissionKeys,
    permissionKeys: keys,
  };
});

export async function requireDashboardViewer(): Promise<DashboardViewer> {
  const viewer = await getDashboardViewer();
  if (!viewer) throw new DashboardAccessError("UNAUTHENTICATED");
  if (viewer.profile.membership_status !== "active") {
    throw new DashboardAccessError("INACTIVE_MEMBER");
  }
  return viewer;
}

export async function requirePermission(
  permission: PermissionKey,
): Promise<DashboardViewer> {
  const viewer = await requireDashboardViewer();
  if (!viewer.permissions.has(permission)) {
    throw new DashboardAccessError("UNAUTHORIZED");
  }
  return viewer;
}

export async function requirePagePermission(
  permission: PermissionKey,
): Promise<DashboardViewer> {
  const viewer = await getDashboardViewer();
  if (!viewer) redirect(`/conta/login?next=${encodeURIComponent("/membru")}`);
  if (viewer.profile.membership_status !== "active") {
    redirect("/conta?acces=membru-inactiv");
  }
  if (!viewer.permissions.has(permission)) {
    redirect("/membru?acces=refuzat");
  }
  return viewer;
}

export async function requireAnyPagePermission(
  permissions: readonly PermissionKey[],
): Promise<DashboardViewer> {
  const viewer = await getDashboardViewer();
  if (!viewer) redirect(`/conta/login?next=${encodeURIComponent("/membru")}`);
  if (viewer.profile.membership_status !== "active") {
    redirect("/conta?acces=membru-inactiv");
  }
  if (!permissions.some((permission) => viewer.permissions.has(permission))) {
    redirect("/membru?acces=refuzat");
  }
  return viewer;
}

export function hasPermission(
  viewer: DashboardViewer,
  permission: PermissionKey,
): boolean {
  return viewer.permissions.has(permission);
}
