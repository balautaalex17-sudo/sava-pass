import "server-only";

import { createNotification } from "@/lib/notifications";
import { logServerError } from "@/lib/server-log";

interface TicketNotificationInput {
  orderId: string;
  ticketId: string;
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  eventStartsAt: string;
  ticketUrl: string;
}

/** Confirmation now, reminder 24 hours before the event when there is time. */
export async function notifyTicketIssued(input: TicketNotificationInput) {
  const common = {
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName,
    orderId: input.orderId,
    ticketId: input.ticketId,
    variables: { event_title: input.eventTitle, ticket_url: input.ticketUrl },
  };

  const confirmations = await Promise.all([
    createNotification({ ...common, channel: "email", templateKey: "ticket_confirmation" }),
    createNotification({ ...common, channel: "in_app", templateKey: "ticket_confirmation" }),
  ]);
  for (const result of confirmations) {
    if (!result.ok) {
      logServerError("ticket_confirmation_notification_failed", new Error(result.error), {
        ticketId: input.ticketId,
      });
    }
  }

  const reminderAt = new Date(input.eventStartsAt).getTime() - 24 * 60 * 60 * 1000;
  if (reminderAt <= Date.now() + 5 * 60 * 1000) return;
  const reminder = {
    ...common,
    templateKey: "event_reminder",
    scheduledFor: new Date(reminderAt).toISOString(),
    variables: {
      event_title: input.eventTitle,
      event_time: new Date(input.eventStartsAt).toLocaleString("ro-RO", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bucharest" }),
      ticket_url: input.ticketUrl,
    },
  };
  const reminders = await Promise.all([
    createNotification({ ...reminder, channel: "email" }),
    createNotification({ ...reminder, channel: "in_app" }),
  ]);
  for (const result of reminders) {
    if (!result.ok) {
      logServerError("ticket_reminder_notification_failed", new Error(result.error), {
        ticketId: input.ticketId,
      });
    }
  }
}
