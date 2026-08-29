"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { requireStaffRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/admin";

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "submitted", "under_review", "selected_for_interview",
    "interview_completed", "accepted", "waiting_list", "rejected",
  ]),
  private_notes: z.string().max(8_000).optional(),
  result_message: z.string().max(2_000).optional(),
});

export interface ApplicationActionState {
  ok?: boolean;
  message?: string;
  error?: string;
}

const NOTIFICATION_FOR_STATUS: Record<string, string | undefined> = {
  accepted: "application_accepted",
  waiting_list: "application_waiting_list",
  rejected: "application_rejected",
};

export async function updateApplication(
  _previous: ApplicationActionState,
  form: FormData,
): Promise<ApplicationActionState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces la această acțiune." };

  const parsed = statusSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const { data: existing } = await supabaseAdmin
    .from("membership_applications")
    .select("id, full_name, email, status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!existing) return { error: "Aplicația nu există." };

  const { error } = await supabaseAdmin.from("membership_applications").update({
    status: parsed.data.status,
    private_notes: parsed.data.private_notes?.trim() || null,
    result_message: parsed.data.result_message?.trim() || null,
    reviewer_id: current.user.id,
  }).eq("id", existing.id);
  if (error) return { error: "Schimbarea nu a putut fi salvată." };

  if (existing.status !== parsed.data.status) {
    await supabaseAdmin.from("application_status_events").insert({
      application_id: existing.id,
      from_status: existing.status,
      to_status: parsed.data.status,
      note: parsed.data.result_message?.trim() || null,
      visible_to_candidate: true,
      actor_id: current.user.id,
    });
  }

  const templateKey = NOTIFICATION_FOR_STATUS[parsed.data.status];
  let notificationFailed = false;
  if (templateKey && existing.status !== parsed.data.status) {
    const variables = {
      first_name: existing.full_name.split(" ")[0] || existing.full_name,
      result_message: parsed.data.result_message?.trim() || "",
    };
    const result = await createNotification({ templateKey, recipientEmail: existing.email, recipientName: existing.full_name, variables, applicationId: existing.id, createdBy: current.user.id });
    notificationFailed = !result.ok;
  }

  await logAudit({
    actorId: current.user.id,
    action: existing.status === parsed.data.status ? "application.notes_updated" : "application.status_changed",
    entityType: "membership_application",
    entityId: existing.id,
    metadata: { from: existing.status, to: parsed.data.status },
  });

  revalidatePath("/admin/aplicatii");
  revalidatePath(`/admin/aplicatii/${existing.id}`);
  return {
    ok: true,
    message: notificationFailed
      ? "Aplicația a fost actualizată, dar emailul nu a plecat. Retrimite-l din Notificări."
      : "Aplicația a fost actualizată.",
  };
}
