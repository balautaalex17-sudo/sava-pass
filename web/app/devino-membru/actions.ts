"use server";
import { z } from "zod";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

const schema = z.object({
  full_name: z.string().min(2, "Introdu numele complet"),
  email: z.string().email("Email invalid"),
  phone: z.string().min(6, "Introdu un număr de telefon valid"),
  grade: z.string().optional(),
  motivation: z.string().min(10, "Spune-ne pe scurt de ce vrei să te alături"),
  strength: z.string().optional(),
  availability: z.string().optional(),
  gdpr: z.literal("on", { error: "Trebuie să fii de acord" }),
});

export interface MembershipState {
  ok?: boolean;
  errors?: {
    full_name?: string;
    email?: string;
    phone?: string;
    motivation?: string;
    gdpr?: string;
    general?: string;
  };
}

export async function submitApplication(_prev: MembershipState, form: FormData): Promise<MembershipState> {
  // Honeypot: a hidden field only bots fill. If set, silently accept and drop the
  // submission — don't tip off the bot, don't write to the table or send mail.
  const honeypot = form.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { ok: true };
  }

  const parsed = schema.safeParse({
    full_name: form.get("full_name"),
    email: form.get("email"),
    phone: form.get("phone"),
    grade: form.get("grade") || undefined,
    motivation: form.get("motivation"),
    strength: form.get("strength") || undefined,
    availability: form.get("availability") || undefined,
    gdpr: form.get("gdpr"),
  });

  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      errors: {
        full_name: f.full_name?.[0],
        email: f.email?.[0],
        phone: f.phone?.[0],
        motivation: f.motivation?.[0],
        gdpr: f.gdpr?.[0],
      },
    };
  }

  const { full_name, email, phone, grade, motivation, strength, availability } = parsed.data;

  // Storage is the source of truth: if the insert fails, nothing is lost and we surface an error.
  const { error } = await supabaseAdmin.from("membership_applications").insert({
    full_name,
    email: email.toLowerCase(),
    phone,
    grade,
    motivation,
    strength,
    availability,
    source: "web",
  });

  if (error) {
    console.error("Membership application insert failed:", error);
    return { errors: { general: "Ceva a mers greșit. Încearcă din nou." } };
  }

  // Confirmation email is best-effort — a failed send must NOT fail the application.
  try {
    await resend.emails.send({
      from: "SavaPass <noreply@savapass.ro>",
      to: email,
      subject: "Am primit aplicația ta — Interact Sf. Sava",
      html: buildEmailHtml(full_name.split(" ")[0] || full_name),
    });
  } catch (err) {
    console.error("Membership confirmation email failed:", err);
  }

  return { ok: true };
}

function buildEmailHtml(firstName: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0F172A">
      <h1 style="font-size:22px;margin:0 0 14px">Salut, ${escapeHtml(firstName)}.</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 14px">
        Am primit aplicația ta pentru noua generație de membri Interact Sf. Sava. Mulțumim că vrei să fii de partea cealaltă a serii.
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 14px">
        Urmează un scurt interviu — îți scriem în câteva zile cu un slot, online sau în liceu.
      </p>
      <p style="font-size:13px;line-height:1.6;color:#64748B;margin:24px 0 0">
        Interact Sf. Sava · Curtea Veche, București
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}
