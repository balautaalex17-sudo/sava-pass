"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { createNotification, deliverNotification } from "@/lib/notifications";
import { requireStaffRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface NotificationActionState { ok?: boolean; message?: string; error?: string }

const templateSchema = z.object({
  key: z.string().min(2),
  subject_template: z.string().max(300).optional(),
  body_template: z.string().min(3).max(10_000),
  active: z.enum(["on", "off"]),
});

export async function updateTemplate(_previous: NotificationActionState, form: FormData): Promise<NotificationActionState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces." };
  const parsed = templateSchema.safeParse({
    key: form.get("key"),
    subject_template: form.get("subject_template") || undefined,
    body_template: form.get("body_template"),
    active: form.get("active") === "on" ? "on" : "off",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const { error } = await supabaseAdmin.from("notification_templates").update({
    subject_template: parsed.data.subject_template || null,
    body_template: parsed.data.body_template,
    active: parsed.data.active === "on",
    updated_by: current.user.id,
  }).eq("key", parsed.data.key);
  if (error) return { error: "Șablonul nu a putut fi salvat." };

  await logAudit({ actorId: current.user.id, action: "notification_template.updated", entityType: "notification_template", entityId: parsed.data.key });
  revalidatePath("/admin/notificari");
  return { ok: true, message: "Șablon salvat." };
}

export async function sendTestNotification(_previous: NotificationActionState, form: FormData): Promise<NotificationActionState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces." };
  const email = z.string().email().safeParse(form.get("email"));
  const templateKey = z.string().min(2).safeParse(form.get("template_key"));
  if (!email.success || !templateKey.success) return { error: "Alege un șablon și un email valid." };

  const result = await createNotification({
    templateKey: templateKey.data,
    recipientEmail: email.data,
    recipientName: "Test SavaPass",
    createdBy: current.user.id,
    variables: {
      first_name: "Andrei",
      interview_time: "miercuri, 18:00",
      interview_place: "Liceul Sf. Sava · sala 12",
      result_message: "Acesta este un mesaj de test.",
      event_title: "Eveniment SavaPass",
      event_time: "vineri, 19:00",
      ticket_url: "https://savapass.ro/bilet/exemplu",
      ticket_message: "Programul evenimentului a fost actualizat.",
    },
    metadata: { test: true },
  });
  return result.ok ? { ok: true, message: "Mesajul de test a fost trimis." } : { error: result.error };
}

export async function resendNotification(_previous: NotificationActionState, form: FormData): Promise<NotificationActionState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces." };
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Notificare invalidă." };
  const result = await deliverNotification(id.data, { allowSentRetry: true });
  await logAudit({ actorId: current.user.id, action: "notification.resent", entityType: "notification", entityId: id.data });
  revalidatePath("/admin/notificari");
  return result.ok ? { ok: true, message: "Notificarea a fost retrimisă." } : { error: result.error };
}

export async function sendBulkNotifications(_previous: NotificationActionState, form: FormData): Promise<NotificationActionState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces." };
  const templateKey = z.string().min(2).safeParse(form.get("template_key"));
  const status = z.string().min(2).safeParse(form.get("application_status"));
  if (!templateKey.success || !status.success) return { error: "Alege șablonul și grupul." };

  const { data: applications } = await supabaseAdmin
    .from("membership_applications")
    .select("id, full_name, email")
    .eq("status", status.data)
    .order("created_at")
    .limit(100);
  if (!applications?.length) return { error: "Nu există candidați în grupul ales." };

  let sent = 0;
  for (const application of applications) {
    const result = await createNotification({
      templateKey: templateKey.data,
      recipientEmail: application.email,
      recipientName: application.full_name,
      applicationId: application.id,
      createdBy: current.user.id,
      variables: { first_name: application.full_name.split(" ")[0] || application.full_name, result_message: "" },
      metadata: { bulk: true, group_status: status.data },
    });
    if (result.ok) sent += 1;
  }

  await logAudit({ actorId: current.user.id, action: "notification.bulk_sent", entityType: "notification", metadata: { template: templateKey.data, group_status: status.data, recipients: sent } });
  revalidatePath("/admin/notificari");
  return { ok: true, message: `${sent} din ${applications.length} mesaje au fost acceptate pentru trimitere.` };
}
