"use server";

import { z } from "zod";

import { prepareAuthEmail, sendPreparedAuthEmail } from "@/lib/auth-email";
import { createNotification } from "@/lib/notifications";
import { normalizeRomanianPhone } from "@/lib/phone";
import { allowPublicAction } from "@/lib/public-rate-limit";
import { logServerError, logServerInfo } from "@/lib/server-log";
import { resolveSiteUrl } from "@/lib/site-url";
import { supabaseAdmin } from "@/lib/supabase/admin";

const emailLookupSchema = z.object({
  method: z.literal("email"),
  contact: z.string().trim().email("Introdu o adresă de email validă.").max(254),
});

const phoneLookupSchema = z.object({
  method: z.literal("phone"),
  contact: z.string().trim().min(9, "Introdu un număr de telefon valid.").max(24),
});

const lookupSchema = z.discriminatedUnion("method", [emailLookupSchema, phoneLookupSchema]);

export type TicketAccessState = {
  status: "idle" | "sent" | "error";
  message?: string;
  fieldError?: string;
};

export async function requestTicketAccess(
  _previous: TicketAccessState,
  formData: FormData,
): Promise<TicketAccessState> {
  const parsed = lookupSchema.safeParse({
    method: formData.get("method"),
    contact: formData.get("contact"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldError: parsed.error.issues[0]?.message ?? "Verifică datele introduse.",
    };
  }

  const method = parsed.data.method;
  const normalizedContact = method === "email"
    ? parsed.data.contact.toLocaleLowerCase("ro")
    : normalizeRomanianPhone(parsed.data.contact);

  if (!normalizedContact) {
    return {
      status: "error",
      fieldError: "Folosește un număr românesc, de exemplu 0722 123 456.",
    };
  }

  const allowed = await allowPublicAction({
    scope: "ticket-access",
    subject: normalizedContact,
    ipLimit: 8,
    subjectLimit: 3,
    windowSeconds: 15 * 60,
  });
  if (!allowed) {
    return {
      status: "error",
      message: "Ai cerut prea multe linkuri. Așteaptă câteva minute și încearcă din nou.",
    };
  }

  const query = supabaseAdmin
    .from("tickets")
    .select("id, order_id, holder_email, holder_name, qr_token, events(title)")
    .order("issued_at", { ascending: false })
    .limit(1);

  const { data: ticket, error: lookupError } = method === "email"
    ? await query.eq("holder_email", normalizedContact).maybeSingle()
    : await query.eq("holder_phone", normalizedContact).maybeSingle();

  if (lookupError) {
    logServerError("ticket_access_lookup_failed", lookupError, { method });
    return {
      status: "error",
      message: "Biletele nu pot fi verificate momentan. Încearcă din nou în câteva minute.",
    };
  }

  // Use the same confirmation state for a miss so the form cannot be used to
  // discover which email addresses or phone numbers bought tickets.
  if (!ticket?.holder_email) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    logServerInfo("ticket_access_completed", { method, emailAccepted: false });
    return { status: "sent" };
  }

  const callback = new URL("/conta/confirm", resolveSiteUrl());
  callback.searchParams.set("next", "/conta");

  const prepared = await prepareAuthEmail({
    kind: "magiclink",
    email: ticket.holder_email,
    redirectTo: callback.toString(),
  });

  if (!prepared.ok) {
    logServerError("ticket_access_link_failed", new Error(prepared.error), { method });
  }

  const siteUrl = resolveSiteUrl();
  const ticketUrl = new URL(`/bilet/${ticket.qr_token}`, siteUrl).toString();
  const eventTitle = ticket.events?.title ?? "evenimentul tău";
  const body = [
    `Biletul pentru ${eventTitle} este gata: ${ticketUrl}`,
    ...(prepared.ok ? [`Vezi toate biletele: ${prepared.email.actionUrl}`] : []),
  ].join("\n");

  const ticketEmail = await createNotification({
    recipientEmail: ticket.holder_email,
    recipientName: ticket.holder_name,
    channel: "email",
    subject: "Biletul tău SavaPass",
    body,
    orderId: ticket.order_id,
    ticketId: ticket.id,
    metadata: { purpose: "ticket_access" },
  });

  if (!ticketEmail.ok && prepared.ok) {
    logServerError("ticket_access_email_failed", new Error(ticketEmail.error), { method });
    const fallback = await sendPreparedAuthEmail(prepared.email);
    if (fallback.ok) {
      logServerInfo("ticket_access_completed", {
        method,
        emailAccepted: true,
        providerMessageId: fallback.id ?? "unknown",
        delivery: "auth_fallback",
      });
      return { status: "sent" };
    }
  }

  if (!ticketEmail.ok) {
    logServerError("ticket_access_email_failed", new Error(ticketEmail.error), { method });
    return {
      status: "error",
      message: "Linkul nu a putut fi trimis. Încearcă din nou în câteva minute.",
    };
  }

  logServerInfo("ticket_access_completed", {
    method,
    emailAccepted: true,
    notificationId: ticketEmail.id,
    delivery: "ticket_with_access",
  });
  return { status: "sent" };
}
