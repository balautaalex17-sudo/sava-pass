import type { Database } from "@/lib/supabase/types";

type StaffRole = Database["public"]["Enums"]["staff_role"];

function isSafeLocalPath(path: string | null | undefined): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//");
}

export function staffHomeForRole(role: StaffRole | null | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "scanner") return "/scanner";
  if (role === "statistici") return "/statistici";
  return "/conta";
}

export function staffRedirectForRole(role: StaffRole | null | undefined, requestedPath: string | null | undefined): string {
  if (!isSafeLocalPath(requestedPath)) return staffHomeForRole(role);
  if (role === "admin") return requestedPath;
  if (role === "scanner") return "/scanner";
  if (role === "statistici") return "/statistici";
  return "/conta";
}
