"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/dashboard/auth";
import { resultObject } from "@/lib/dashboard/scan-results";
import { supabaseAdmin } from "@/lib/supabase/admin";

const correctionSchema = z.object({
  meetingId: z.string().uuid(),
  memberId: z.string().uuid(),
  newStatus: z.enum(["present", "reversed"]),
  reason: z.string().trim().min(3, "Motivul trebuie să aibă cel puțin 3 caractere.").max(500),
}).strict();

export async function correctAttendance(input: unknown) {
  try {
    const viewer = await requirePermission("correct_attendance");
    const parsed = correctionSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Date invalide." };
    const { data, error } = await supabaseAdmin.rpc("correct_meeting_attendance", {
      p_meeting_id: parsed.data.meetingId,
      p_member_id: parsed.data.memberId,
      p_new_status: parsed.data.newStatus,
      p_reason: parsed.data.reason,
      p_actor_id: viewer.profile.id,
    });
    if (error) throw error;
    const result = resultObject(data);
    if (result.result !== "corrected") return { ok: false as const, message: result.result === "not_found" ? "Nu există o prezență de anulat." : "Corecția nu a fost acceptată." };
    revalidatePath(`/board/prezenta?meeting=${parsed.data.meetingId}`);
    return { ok: true as const, message: "Corecția a fost înregistrată în audit." };
  } catch {
    return { ok: false as const, message: "Corecția nu a putut fi salvată." };
  }
}
