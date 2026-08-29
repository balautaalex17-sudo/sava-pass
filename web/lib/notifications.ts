import "server-only";

import { sendEmail } from "@/lib/email";
import { logServerError } from "@/lib/server-log";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  createTicketQrAttachment,
  extractTicketEmailDetails,
  renderNotificationEmail,
  TICKET_QR_CONTENT_ID,
} from "@/lib/ticket-email";
import type { Json } from "@/lib/supabase/types";

export type NotificationChannel = "email" | "in_app" | "sms";

interface NotificationInput {
  templateKey?: string;
  recipientEmail: string;
  recipientName?: string | null;
  variables?: Record<string, string | number | null | undefined>;
  channel?: NotificationChannel;
  subject?: string;
  body?: string;
  applicationId?: string | null;
  interviewId?: string | null;
  orderId?: string | null;
  ticketId?: string | null;
  createdBy?: string | null;
  scheduledFor?: string;
  metadata?: Json;
}

function applyVariables(template: string, variables: NotificationInput["variables"] = {}) {
  return template.replace(/{{\s*([a-z0-9_]+)\s*}}/gi, (_match, key: string) => {
    const value = variables[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

/** Store every message first, then deliver it. This makes retries and status visible to admins. */
export async function createNotification(input: NotificationInput) {
  const channel = input.channel ?? "email";
  let subject = input.subject ?? null;
  let body = input.body ?? "";

  if (input.templateKey) {
    const { data: template, error: templateError } = await supabaseAdmin
      .from("notification_templates")
      .select("subject_template, body_template, active")
      .eq("key", input.templateKey)
      .maybeSingle();

    if (templateError) {
      logServerError("notification_template_read_failed", templateError, { templateKey: input.templateKey });
      return { ok: false as const, error: `Șablonul ${input.templateKey} nu a putut fi citit.` };
    }
    if (!template) {
      logServerError("notification_template_missing", new Error("template_missing"), { templateKey: input.templateKey });
      return { ok: false as const, error: `Șablonul ${input.templateKey} nu există.` };
    }
    if (!template.active) {
      logServerError("notification_template_inactive", new Error("template_inactive"), { templateKey: input.templateKey });
      return { ok: false as const, error: `Șablonul ${input.templateKey} este dezactivat.` };
    }
    if (template.active) {
      subject = applyVariables(template.subject_template ?? "", input.variables) || subject;
      body = applyVariables(template.body_template, input.variables);
    }
  }

  if (!body.trim()) return { ok: false as const, error: "Mesajul este gol." };

  const scheduledFor = input.scheduledFor ?? new Date().toISOString();
  const shouldSendNow = new Date(scheduledFor).getTime() <= Date.now() + 1_000;

  if (input.ticketId && input.templateKey) {
    const { data: existing } = await supabaseAdmin
      .from("notifications")
      .select("id, status")
      .eq("ticket_id", input.ticketId)
      .eq("template_key", input.templateKey)
      .eq("channel", channel)
      .maybeSingle();

    if (existing) {
      if ((existing.status === "failed" || existing.status === "queued") && shouldSendNow) {
        return deliverNotification(existing.id);
      }
      return { ok: true as const, id: existing.id, status: existing.status };
    }
  }

  const { data: notification, error } = await supabaseAdmin
    .from("notifications")
    .insert({
      application_id: input.applicationId ?? null,
      interview_id: input.interviewId ?? null,
      order_id: input.orderId ?? null,
      ticket_id: input.ticketId ?? null,
      recipient_email: input.recipientEmail.toLowerCase(),
      recipient_name: input.recipientName ?? null,
      channel,
      template_key: input.templateKey ?? null,
      subject,
      body,
      status: "queued",
      scheduled_for: scheduledFor,
      created_by: input.createdBy ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error || !notification) {
    // A concurrent retry can win the unique ticket/template insert. Reuse it
    // instead of reporting a false failure or sending a duplicate.
    if (input.ticketId && input.templateKey && error?.code === "23505") {
      const { data: existing } = await supabaseAdmin
        .from("notifications")
        .select("id, status")
        .eq("ticket_id", input.ticketId)
        .eq("template_key", input.templateKey)
        .eq("channel", channel)
        .maybeSingle();
      if (existing) return { ok: true as const, id: existing.id, status: existing.status };
    }

    logServerError("notification_insert_failed", error);
    return { ok: false as const, error: "Notificarea nu a putut fi salvată." };
  }

  if (!shouldSendNow) return { ok: true as const, id: notification.id, status: "queued" as const };
  return deliverNotification(notification.id);
}

export async function deliverNotification(
  id: string,
  options: { alreadyClaimed?: boolean; allowSentRetry?: boolean } = {},
) {
  if (!options.alreadyClaimed) {
    const claimableStatuses = options.allowSentRetry
      ? ["queued", "failed", "sent"]
      : ["queued", "failed"];
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("notifications")
      .update({ status: "sending", updated_at: new Date().toISOString(), last_error: null })
      .eq("id", id)
      .in("status", claimableStatuses)
      .select("id")
      .maybeSingle();
    if (claimError) {
      logServerError("notification_delivery_claim_failed", claimError);
      return { ok: false as const, id, error: "Notificarea nu a putut fi revendicată pentru trimitere." };
    }
    if (!claimed) {
      return { ok: false as const, id, error: "Notificarea este deja în curs sau a fost trimisă." };
    }
  }

  const { data: notification, error: notificationError } = await supabaseAdmin
    .from("notifications")
    .select("id, recipient_email, channel, subject, body, attempts")
    .eq("id", id)
    .maybeSingle();

  if (notificationError || !notification) {
    logServerError("notification_delivery_read_failed", notificationError, { notificationId: id });
    await supabaseAdmin.from("notifications").update({
      status: "failed",
      last_error: "Notificarea nu a putut fi citită după revendicare.",
    }).eq("id", id).eq("status", "sending");
    return { ok: false as const, id, error: "Notificarea nu a putut fi citită." };
  }

  if (notification.channel === "sms") {
    await supabaseAdmin.from("notifications").update({
      status: "failed",
      attempts: notification.attempts + 1,
      last_error: "Integrarea SMS nu este configurată încă.",
    }).eq("id", id);
    return { ok: false as const, id, error: "Integrarea SMS nu este configurată încă." };
  }

  if (notification.channel === "in_app") {
    await supabaseAdmin.from("notifications").update({
      status: "sent",
      attempts: notification.attempts + 1,
      sent_at: new Date().toISOString(),
      last_error: null,
    }).eq("id", id);
    return { ok: true as const, id, status: "sent" as const };
  }

  const ticketEmail = extractTicketEmailDetails(notification.body);
  let ticketQrAttachment = null;
  if (ticketEmail) {
    try {
      ticketQrAttachment = await createTicketQrAttachment(ticketEmail.qrToken);
    } catch (error) {
      logServerError("ticket_email_qr_generation_failed", error);
    }
  }

  const result = await sendEmail({
    to: notification.recipient_email,
    subject: notification.subject || "Mesaj SavaPass",
    html: renderNotificationEmail(
      notification.body,
      ticketQrAttachment ? TICKET_QR_CONTENT_ID : undefined,
    ),
    text: notification.body,
    idempotencyKey: `notification-${notification.id}-attempt-${notification.attempts + 1}`,
    ...(ticketQrAttachment ? { attachments: [ticketQrAttachment] } : {}),
  });

  const { error: statusError } = await supabaseAdmin.from("notifications").update({
    status: result.ok ? "sent" : "failed",
    provider_id: result.id ?? null,
    attempts: notification.attempts + 1,
    sent_at: result.ok ? new Date().toISOString() : null,
    last_error: result.error ?? null,
  }).eq("id", id);
  if (statusError) {
    logServerError("notification_delivery_status_update_failed", statusError, {
      notificationId: id,
      providerId: result.id ?? null,
      delivered: result.ok,
    });
  }

  return result.ok
    ? { ok: true as const, id, status: "sent" as const }
    : { ok: false as const, id, error: result.error ?? "Trimiterea a eșuat." };
}

export async function deliverDueNotifications(limit = 50) {
  const { data, error } = await supabaseAdmin.rpc("claim_due_notifications", {
    p_limit: Math.max(1, Math.min(limit, 100)),
  });
  if (error) {
    logServerError("notification_claim_failed", error);
    return [];
  }

  const results = [];
  for (const item of data ?? []) {
    results.push(await deliverNotification(item.id, { alreadyClaimed: true }));
  }
  return results;
}
