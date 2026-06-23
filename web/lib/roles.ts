import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type StaffRole = Database["public"]["Enums"]["staff_role"];

export const STAFF_ROLES = ["admin", "scanner", "statistici"] as const satisfies readonly StaffRole[];
export const SCANNER_ROLES = ["admin", "scanner"] as const satisfies readonly StaffRole[];
export const STATS_ROLES = ["admin", "statistici"] as const satisfies readonly StaffRole[];

export function hasStaffRole(role: StaffRole | null | undefined, allowed: readonly StaffRole[]) {
  return !!role && allowed.includes(role);
}

export async function getCurrentUserRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, role: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { user, role: profile?.role ?? null };
}

export async function requireStaffRole(allowed: readonly StaffRole[]) {
  const current = await getCurrentUserRole();
  if (!current.user || !hasStaffRole(current.role, allowed)) return null;
  return current;
}
