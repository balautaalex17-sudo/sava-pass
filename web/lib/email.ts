import "server-only";
import { Resend, type Attachment } from "resend";
import { serverEnv } from "@/lib/env";
import { escapeHtml } from "@/lib/escape-html";
import { logServerError, logServerInfo } from "@/lib/server-log";

/**
 * Sender shown on transactional emails. Override with RESEND_FROM (a mailbox on
 * a Resend-verified domain) so swapping domains needs no code change. The default
 * keeps local/dev behavior unchanged until a domain is verified.
 */
export const EMAIL_FROM = serverEnv.RESEND_FROM
  || (process.env.NODE_ENV === "production" ? "" : "SavaPass <onboarding@resend.dev>");

const resend = new Resend(serverEnv.RESEND_API_KEY);

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Attachment[];
  idempotencyKey?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  errorCode?: string;
}

function providerError(error: { name?: string; message?: string }) {
  const code = error.name || "provider_error";
  const messages: Record<string, string> = {
    restricted_api_key: "Cheia Resend nu are permisiunea de a trimite emailuri.",
    validation_error: "Expeditorul sau destinatarul emailului nu este valid.",
    rate_limit_exceeded: "Resend a limitat temporar trimiterile. Mesajul poate fi retrimis.",
    missing_required_field: "Configurația emailului este incompletă.",
  };
  return { code, message: messages[code] ?? error.message ?? "Furnizorul de email a respins mesajul." };
}

/**
 * Best-effort transactional send. NEVER throws: a Resend failure (outage, rate
 * limit, rejected recipient) must not break the caller's flow — the order /
 * application is the source of truth. Callers may inspect the result but must not
 * depend on it for control flow.
 */
export async function sendEmail({ to, subject, html, text, replyTo, attachments, idempotencyKey }: SendEmailArgs): Promise<SendEmailResult> {
  try {
    if (!EMAIL_FROM) {
      const error = "RESEND_FROM lipsește în producție. Configurează o adresă de pe un domeniu verificat.";
      logServerError("email_sender_missing", new Error(error));
      return { ok: false, error, errorCode: "sender_missing" };
    }
    const intendedRecipients = Array.isArray(to) ? to.join(", ") : to;
    const isTestDelivery = Boolean(serverEnv.EMAIL_TEST_RECIPIENT);
    const deliveryNote = `<div style="margin:0 0 18px;padding:12px;border:1px solid #f59e0b;background:#fffbeb;color:#78350f;font-family:Arial,sans-serif;font-size:13px"><strong>STAGING</strong><br>Destinatar inițial: ${escapeHtml(intendedRecipients)}</div>`;
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: serverEnv.EMAIL_TEST_RECIPIENT || to,
      subject: isTestDelivery ? `[STAGING] ${subject}` : subject,
      html: isTestDelivery ? `${deliveryNote}${html}` : html,
      ...(text ? { text: isTestDelivery ? `STAGING\nDestinatar inițial: ${intendedRecipients}\n\n${text}` : text } : {}),
      ...(!isTestDelivery && replyTo ? { replyTo } : {}),
      ...(attachments?.length ? { attachments } : {}),
    }, ...(idempotencyKey ? [{ idempotencyKey }] : []));
    if (error) {
      logServerError("email_send_failed", error);
      const details = providerError(error);
      return { ok: false, error: details.message, errorCode: details.code };
    }
    logServerInfo("email_send_succeeded", {
      providerMessageId: data?.id ?? "unknown",
      recipientCount: Array.isArray(to) ? to.length : 1,
      testDelivery: isTestDelivery,
    });
    return { ok: true, id: data?.id };
  } catch (err) {
    logServerError("email_send_threw", err);
    return { ok: false, error: "Furnizorul de email nu este disponibil." };
  }
}
