"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/dashboard/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Numele este prea scurt.").max(100),
  phone: z.string().trim().max(30).optional(),
  grade: z.string().trim().max(30).optional(),
}).strict();

export type MemberProfileInput = z.infer<typeof profileSchema>;

export async function updateMemberProfile(input: unknown) {
  try {
    const viewer = await requirePermission("update_own_profile");
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Date invalide." };
    const { error } = await supabaseAdmin.from("profiles").update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone?.trim() || null,
      grade: parsed.data.grade?.trim() || null,
    }).eq("id", viewer.profile.id);
    if (error) throw error;
    revalidatePath("/membru", "layout");
    return { ok: true as const, message: "Profilul a fost salvat." };
  } catch {
    return { ok: false as const, message: "Profilul nu a putut fi salvat." };
  }
}
