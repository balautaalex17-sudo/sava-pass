"use server";

import { z } from "zod";

import {
  RECRUITMENT_MIN_ANSWER_CHARACTERS,
  RECRUITMENT_QUESTIONS,
  type RecruitmentQuestionKey,
} from "@/lib/recruitment-spec";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { allowPublicAction } from "@/lib/public-rate-limit";
import { logServerError } from "@/lib/server-log";
import { supabaseAdmin } from "@/lib/supabase/admin";

const answer = z
  .string()
  .trim()
  .min(RECRUITMENT_MIN_ANSWER_CHARACTERS, `Scrie un răspuns de cel puțin ${RECRUITMENT_MIN_ANSWER_CHARACTERS} de caractere`)
  .max(3000, "Răspunsul poate avea cel mult 3000 de caractere");

const schema = z.object({
  full_name: z.string().trim().min(2, "Introdu numele complet").max(120),
  email: z.string().trim().email("Email invalid").max(254),
  phone: z.string().trim().min(6, "Introdu un număr de telefon valid").max(40),
  grade: z.string().trim().min(1, "Introdu clasa și specializarea").max(120),
  about_you: answer,
  mistake: answer,
  team_priority: answer,
  club_exchange: answer,
  promote_event: answer,
  team_organization: answer,
  gdpr: z.literal("on", { error: "Trebuie să fii de acord" }),
});

export interface MembershipState {
  ok?: boolean;
  errors?: Partial<Record<"full_name" | "email" | "phone" | "grade" | RecruitmentQuestionKey | "gdpr" | "general", string>>;
}

export async function submitApplication(_prev: MembershipState, form: FormData): Promise<MembershipState> {
  const honeypot = form.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") return { ok: true };

  const parsed = schema.safeParse({
    full_name: form.get("full_name"),
    email: form.get("email"),
    phone: form.get("phone"),
    grade: form.get("grade"),
    ...Object.fromEntries(RECRUITMENT_QUESTIONS.map(({ key }) => [key, form.get(key)])),
    gdpr: form.get("gdpr"),
  });

  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      errors: {
        full_name: fields.full_name?.[0],
        email: fields.email?.[0],
        phone: fields.phone?.[0],
        grade: fields.grade?.[0],
        ...Object.fromEntries(RECRUITMENT_QUESTIONS.map(({ key }) => [key, fields[key]?.[0]])),
        gdpr: fields.gdpr?.[0],
      },
    };
  }

  const normalizedEmail = parsed.data.email.toLocaleLowerCase("ro");
  const allowed = await allowPublicAction({
    scope: "membership-application",
    subject: normalizedEmail,
    ipLimit: 3,
    subjectLimit: 2,
    windowSeconds: 24 * 60 * 60,
  });
  if (!allowed) {
    return { errors: { general: "Prea multe încercări. Încearcă din nou mai târziu." } };
  }

  const answers = Object.fromEntries(RECRUITMENT_QUESTIONS.map(({ key }) => [key, parsed.data[key]]));
  const now = new Date().toISOString();
  const { data: campaign } = await supabaseAdmin
    .from("recruitment_campaigns")
    .select("id")
    .eq("status", "open")
    .lte("opens_at", now)
    .gte("closes_at", now)
    .order("opens_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!campaign) {
    const { data: latestCampaign } = await supabaseAdmin
      .from("recruitment_campaigns")
      .select("closed_message")
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { errors: { general: latestCampaign?.closed_message ?? "Înscrierile nu sunt deschise în acest moment." } };
  }

  const { data: activeForm } = await supabaseAdmin
    .from("recruitment_forms")
    .select("id")
    .eq("status", "active")
    .or(`campaign_id.eq.${campaign.id},campaign_id.is.null`)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeForm) return { errors: { general: "Formularul de înscriere nu este configurat." } };

  const { data: application, error } = await supabaseAdmin
    .from("membership_applications")
    .insert({
      campaign_id: campaign.id,
      form_id: activeForm.id,
      full_name: parsed.data.full_name,
      email: normalizedEmail,
      phone: parsed.data.phone,
      grade: parsed.data.grade,
      motivation: parsed.data.club_exchange,
      answers: { version: 2, ...answers },
      status: "submitted",
      submitted_at: now,
      source: "web",
    })
    .select("id")
    .single();

  if (error || !application) {
    if (error?.message === "application_limit_reached") {
      return { errors: { general: "Perioada de înscriere s-a încheiat deoarece a fost atins numărul maxim de aplicații." } };
    }
    if (error?.message === "recruitment_closed") {
      return { errors: { general: "Înscrierile nu mai sunt deschise." } };
    }
    logServerError("membership_application_insert_failed", error);
    return { errors: { general: "Ceva a mers greșit. Încearcă din nou." } };
  }

  await supabaseAdmin.from("application_status_events").insert({
    application_id: application.id,
    from_status: null,
    to_status: "submitted",
    note: "Aplicația a fost trimisă.",
    visible_to_candidate: true,
  });

  const variables = { first_name: parsed.data.full_name.split(" ")[0] || parsed.data.full_name };
  const [notificationResult] = await Promise.all([
    createNotification({ templateKey: "application_submitted", recipientEmail: normalizedEmail, recipientName: parsed.data.full_name, variables, applicationId: application.id }),
    logAudit({ action: "application.submitted", entityType: "membership_application", entityId: application.id, metadata: { source: "web", form_version: 2 } }),
  ]);
  if (!notificationResult.ok) {
    logServerError("application_confirmation_email_failed", new Error(notificationResult.error), {
      applicationId: application.id,
    });
  }

  return { ok: true };
}
