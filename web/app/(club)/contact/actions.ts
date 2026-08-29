"use server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/escape-html";
import { allowPublicAction } from "@/lib/public-rate-limit";
import { logServerError } from "@/lib/server-log";

const schema = z.object({
  name: z.string().trim().min(2, "Introdu numele").max(120, "Numele este prea lung"),
  email: z.string().trim().email("Email invalid").max(254, "Emailul este prea lung"),
  message: z.string().trim().min(10, "Scrie un mesaj mai detaliat").max(5000, "Mesajul este prea lung"),
});

export interface ContactState {
  ok?: boolean;
  errors?: { name?: string; email?: string; message?: string; general?: string };
}

/** Public contact submission. Mirrors the membership posture exactly: honeypot →
 * silent accept; storage is the source of truth; the staff notification email is
 * best-effort and must NEVER fail the submission. */
export async function submitContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const honeypot = form.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { ok: true };
  }

  const parsed = schema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    message: form.get("message"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { errors: { name: f.name?.[0], email: f.email?.[0], message: f.message?.[0] } };
  }

  const { name, email, message } = parsed.data;
  const normalizedEmail = email.toLocaleLowerCase("ro");
  const allowed = await allowPublicAction({
    scope: "contact",
    subject: normalizedEmail,
    ipLimit: 5,
    subjectLimit: 3,
    windowSeconds: 60 * 60,
  });
  if (!allowed) {
    return { errors: { general: "Prea multe mesaje trimise. Încearcă din nou mai târziu." } };
  }

  const { error } = await supabaseAdmin.from("contact_messages").insert({
    name,
    email: normalizedEmail,
    message,
  });
  if (error) {
    logServerError("contact_message_insert_failed", error);
    return { errors: { general: "Ceva a mers greșit. Încearcă din nou." } };
  }

  const delivery = await sendEmail({
      to: "membri@interactsava.ro",
      replyTo: email,
      subject: `Mesaj nou de contact — ${name}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0F172A">
          <p style="font-size:15px;margin:0 0 8px"><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}) a trimis un mesaj prin formularul de contact:</p>
          <p style="font-size:15px;line-height:1.6;white-space:pre-wrap;margin:0">${escapeHtml(message)}</p>
        </div>
      `,
    });
  if (!delivery.ok) {
    logServerError("contact_notification_failed", new Error(delivery.error ?? "email_failed"));
  }

  return { ok: true };
}
