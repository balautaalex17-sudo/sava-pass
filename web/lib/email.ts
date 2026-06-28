import "server-only";
import { Resend } from "resend";

/**
 * Sender shown on transactional emails. Override with RESEND_FROM (a mailbox on
 * a Resend-verified domain) so swapping domains needs no code change. The default
 * keeps local/dev behavior unchanged until a domain is verified.
 */
export const EMAIL_FROM = process.env.RESEND_FROM?.trim() || "SavaPass <noreply@savapass.ro>";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Best-effort transactional send. NEVER throws: a Resend failure (outage, rate
 * limit, rejected recipient) must not break the caller's flow — the order /
 * application is the source of truth. Callers may inspect the result but must not
 * depend on it for control flow.
 */
export async function sendEmail({ to, subject, html, replyTo }: SendEmailArgs): Promise<SendEmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    if (error) {
      console.error("Email send failed:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("Email send threw:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
