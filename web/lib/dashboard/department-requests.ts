import { z } from "zod";
import type { Tables } from "@/lib/supabase/types";
import { MEMBER_DEPARTMENT_THRESHOLD, type MemberDepartment } from "./member-departments";

export type DepartmentRequest = Tables<"member_department_requests">;
export const DEPARTMENT_REQUEST_LABELS: Record<string, string> = {
  pending: "În așteptare", approved: "Aprobată", rejected: "Respinsă",
};
export const departmentRequestSchema = z.object({
  reason: z.string().trim().min(10, "Scrie un motiv de cel puțin 10 caractere.").max(2000),
}).strict();
export const departmentReviewSchema = z.object({
  requestId: z.uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(1000).default(""),
  acceptImbalance: z.boolean().default(false),
}).strict();
export function canReviewDepartmentRequests(role: string | null) {
  return role === "board" || role === "admin";
}
export function departmentBalanceWarning(department: MemberDepartment) {
  return `Peste ${MEMBER_DEPARTMENT_THRESHOLD}% dintre toți membrii activi sunt deja în ${department.toUpperCase()}. Calculul include și membrii fără departament, dar exclude Board și Super Admin. Poți aproba transferul ca excepție; echilibrul echipelor va fi afectat.`;
}
