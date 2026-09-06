"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "./auth";
import { absenceRequestSchema, absenceReviewSchema, canReviewAbsences } from "./attendance";
import { resultObject } from "./scan-results";
import { consumeDashboardRateLimit } from "./rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";

const messages: Record<string, string> = {
  unauthorized: "Nu ai dreptul să efectuezi această acțiune.",
  not_found: "Ședința sau cererea nu mai există.",
  not_absent: "Motivarea este disponibilă doar pentru o absență după închiderea prezenței.",
  already_requested: "Ai trimis deja o cerere pentru această ședință.",
  already_reviewed: "Cererea a fost deja soluționată. Reîncarcă lista pentru a vedea decizia.",
  self_review: "Propria cerere trebuie soluționată de alt membru al board-ului.",
};

function refreshAttendance() {
  for (const path of ["/board/prezenta", "/membru", "/membru/prezenta", "/membru/intalniri"]) revalidatePath(path);
}

export async function submitAbsenceRequest(input: unknown) {
  try {
    const viewer = await requirePermission("view_own_attendance");
    const parsed = absenceRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." };
    if (!await consumeDashboardRateLimit(viewer.profile.id, "absence_request", 10)) {
      return { ok: false, message: "Ai trimis prea multe cereri. Încearcă din nou într-un minut." };
    }
    const { data, error } = await supabaseAdmin.rpc("submit_absence_request", {
      p_meeting_id: parsed.data.meetingId, p_member_id: viewer.profile.id, p_reason: parsed.data.reason,
    });
    if (error) throw error;
    const result = String(resultObject(data).result);
    if (result !== "submitted") return { ok: false, message: messages[result] ?? "Cererea nu a fost acceptată." };
    refreshAttendance();
    return { ok: true, message: "Cererea a fost trimisă board-ului." };
  } catch {
    return { ok: false, message: "Cererea nu a putut fi salvată. Încearcă din nou." };
  }
}

export async function reviewAbsenceRequest(input: unknown) {
  try {
    const viewer = await requirePermission("view_attendance_roster");
    if (!canReviewAbsences(viewer.profile.role)) return { ok: false, message: messages.unauthorized };
    const parsed = absenceReviewSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." };
    const { data, error } = await supabaseAdmin.rpc("review_absence_request", {
      p_request_id: parsed.data.requestId, p_actor_id: viewer.profile.id,
      p_decision: parsed.data.decision, p_note: parsed.data.note,
    });
    if (error) throw error;
    const result = String(resultObject(data).result);
    if (result !== "reviewed") return { ok: false, message: messages[result] ?? "Decizia nu a putut fi salvată." };
    refreshAttendance();
    return { ok: true, message: parsed.data.decision === "approved" ? "Motivarea a fost acceptată." : "Motivarea a fost respinsă." };
  } catch {
    return { ok: false, message: "Decizia nu a putut fi salvată. Încearcă din nou." };
  }
}
