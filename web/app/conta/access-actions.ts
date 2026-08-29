"use server";

import { z } from "zod";

import { sendAuthEmail } from "@/lib/auth-email";
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
    .select("holder_email")
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

  const emailResult = await sendAuthEmail({
    kind: "magiclink",
    email: ticket.holder_email,
    redirectTo: callback.toString(),
  });

  if (!emailResult.ok) {
    logServerError("ticket_access_email_failed", new Error(emailResult.error ?? "email_failed"), { method });
    return {
      status: "error",
      message: "Linkul nu a putut fi trimis. Încearcă din nou în câteva minute.",
    };
  }

  logServerInfo("ticket_access_completed", {
    method,
    emailAccepted: true,
    providerMessageId: emailResult.id ?? "unknown",
  });
  return { status: "sent" };
}
