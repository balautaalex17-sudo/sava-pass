import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type StaffRole = Database["public"]["Enums"]["staff_role"];

export const STAFF_ROLES = ["admin", "board", "scanner", "statistici", "interviewer"] as const satisfies readonly StaffRole[];
export const BOARD_ROLES = ["admin", "board"] as const satisfies readonly StaffRole[];
export const SCANNER_ROLES = ["admin", "scanner"] as const satisfies readonly StaffRole[];
export const STATS_ROLES = ["admin", "statistici"] as const satisfies readonly StaffRole[];
export const INTERVIEW_ROLES = ["admin", "interviewer"] as const satisfies readonly StaffRole[];

export function hasStaffRole(role: StaffRole | null | undefined, allowed: readonly StaffRole[]) {
  return !!role && allowed.includes(role);
}

export async function getCurrentUserRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, role: null, roles: [] as StaffRole[] };

  const [profileResult, operationalRolesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, membership_status")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profile_roles")
      .select("role")
      .eq("profile_id", user.id),
  ]);

  const profile = profileResult.data;
  const roles = new Set<StaffRole>();
  if (profile?.membership_status === "active") {
    if (profile.role) roles.add(profile.role);
    for (const assignment of operationalRolesResult.data ?? []) roles.add(assignment.role);
  }

  return {
    user,
    role: [...roles][0] ?? null,
    roles: [...roles],
  };
}

export async function requireStaffRole(allowed: readonly StaffRole[]) {
  const current = await getCurrentUserRole();
  if (!current.user || !current.roles.some((role) => allowed.includes(role))) return null;
  return current;
}
