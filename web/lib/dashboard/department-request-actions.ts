"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "./auth";
import { canReviewDepartmentRequests, departmentBalanceWarning, departmentRequestSchema, departmentReviewSchema } from "./department-requests";
import { isDepartmentEligible, isMemberDepartment, parseDepartmentOptions } from "./member-departments";
import { resultObject } from "./scan-results";
import { consumeDashboardRateLimit } from "./rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logServerError } from "@/lib/server-log";

export interface DepartmentRequestResult { ok: boolean; message: string; balanceWarning?: boolean }
const messages: Record<string, string> = {
  unauthorized: "Doar Board-ul și Super Adminii pot evalua cererile.",
  ineligible: "Cererea este disponibilă doar membrilor activi care au ales HR sau PR.",
  already_requested: "Ai deja o cerere în așteptarea Board-ului.",
  already_reviewed: "Cererea a fost deja soluționată. Reîncarcă lista pentru a vedea decizia.",
  not_found: "Cererea nu mai există.",
  stale_request: "Rolul, statutul sau departamentul membrului s-a schimbat. Cererea poate fi respinsă, dar nu mai poate fi aprobată.",
  self_review: "Propria cerere trebuie evaluată de alt membru al Board-ului.",
};

export async function submitDepartmentRequest(input: unknown): Promise<DepartmentRequestResult> {
  try {
    const viewer = await requirePermission("update_own_profile");
    if (!isDepartmentEligible(viewer.profile, viewer.roles) || !isMemberDepartment(viewer.profile.member_department)) {
      return { ok: false, message: messages.ineligible };
    }
    const parsed = departmentRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." };
    if (!await consumeDashboardRateLimit(viewer.user.id, "department_request", 10)) {
      return { ok: false, message: "Ai trimis prea multe cereri. Încearcă din nou într-un minut." };
    }
    const { data, error } = await supabaseAdmin.rpc("submit_member_department_request", {
      p_member_id: viewer.user.id, p_reason: parsed.data.reason,
    });
    if (error) throw error;
    const result = String(resultObject(data).result);
    if (result !== "submitted") return { ok: false, message: messages[result] ?? "Cererea nu a putut fi salvată." };
    revalidatePath("/membru/profil"); revalidatePath("/board/cereri-departament");
    return { ok: true, message: "Cererea a fost trimisă Board-ului. Departamentul rămâne neschimbat până la aprobare." };
  } catch (error) {
    logServerError("department_request_failed", error);
    return { ok: false, message: "Cererea nu a putut fi salvată. Încearcă din nou." };
  }
}

export async function reviewDepartmentRequest(input: unknown): Promise<DepartmentRequestResult> {
  try {
    const viewer = await requirePermission("manage_members");
    if (!canReviewDepartmentRequests(viewer.profile.role)) return { ok: false, message: messages.unauthorized };
    const parsed = departmentReviewSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." };
    const { data, error } = await supabaseAdmin.rpc("review_member_department_request", {
      p_request_id: parsed.data.requestId, p_actor_id: viewer.user.id,
      p_decision: parsed.data.decision, p_note: parsed.data.note, p_accept_imbalance: parsed.data.acceptImbalance,
    });
    if (error) throw error;
    const result = String(resultObject(data).result);
    if (result === "balance_warning") {
      const department = parseDepartmentOptions(data)?.blockedDepartment;
      if (!department) throw new Error("Invalid balance warning");
      return { ok: false, balanceWarning: true, message: departmentBalanceWarning(department) };
    }
    if (result !== "reviewed") return { ok: false, message: messages[result] ?? "Decizia nu a putut fi salvată." };
    // Refresh the profile, HR/PR badges, member list and both request views.
    revalidatePath("/", "layout");
    return { ok: true, message: parsed.data.decision === "approved" ? "Cererea a fost aprobată. Departamentul a fost schimbat." : "Cererea a fost respinsă. Departamentul rămâne neschimbat." };
  } catch (error) {
    logServerError("department_review_failed", error);
    return { ok: false, message: "Decizia nu a putut fi salvată. Încearcă din nou." };
  }
}
