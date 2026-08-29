import type { Database } from "@/lib/supabase/types";
import { safeLocalPath } from "@/lib/safe-local-path";

type StaffRole = Database["public"]["Enums"]["staff_role"];

export function staffHomeForRole(role: StaffRole | null | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "board") return "/board";
  if (role === "scanner") return "/board/scaneaza-bilete";
  if (role === "statistici") return "/statistici";
  if (role === "interviewer") return "/board/interviuri";
  return "/conta";
}

export function staffRedirectForRole(role: StaffRole | null | undefined, requestedPath: string | null | undefined): string {
  const requested = safeLocalPath(requestedPath, "");
  if (!requested) return staffHomeForRole(role);
  if (role === "admin") return requested;
  if (role === "board") return "/board";
  if (role === "scanner") return "/board/scaneaza-bilete";
  if (role === "statistici") return "/statistici";
  if (role === "interviewer") return "/board/interviuri";
  return "/conta";
}
