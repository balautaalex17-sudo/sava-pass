"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/dashboard/auth";
import { revalidatePublicRecruitmentState } from "@/lib/recruitment-public";
import {
  RECRUITMENT_QUESTIONS,
  type RecruitmentQuestionKey,
} from "@/lib/recruitment-spec";
import { supabaseAdmin } from "@/lib/supabase/admin";

const campaignSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(3).max(120),
  intro: z.string().trim().min(10).max(1000),
  closedMessage: z.string().trim().min(8).max(500),
  status: z.enum(["draft", "open", "closed"]),
  opensAt: z.string().min(1),
  closesAt: z.string().min(1),
}).strict();

const questionSchema = z.string().trim().min(10).max(500);

export type RecruitmentCampaignState = { ok?: boolean; message?: string };

export async function saveRecruitmentCampaign(
  _previous: RecruitmentCampaignState,
  formData: FormData,
): Promise<RecruitmentCampaignState> {
  try {
    const viewer = await requirePermission("manage_recruitment_campaigns");
    const parsed = campaignSchema.safeParse({
      id: formData.get("id"),
      title: formData.get("title"),
      intro: formData.get("intro"),
      closedMessage: formData.get("closedMessage"),
      status: formData.get("status"),
      opensAt: formData.get("opensAt"),
      closesAt: formData.get("closesAt"),
    });
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." };

    const questions = {} as Record<RecruitmentQuestionKey, string>;
    for (const [index, question] of RECRUITMENT_QUESTIONS.entries()) {
      const questionResult = questionSchema.safeParse(formData.get(`question_${question.key}`));
      if (!questionResult.success) {
        return {
          ok: false,
          message: `Întrebarea ${index + 1} trebuie să aibă între 10 și 500 de caractere.`,
        };
      }
      questions[question.key] = questionResult.data;
    }

    const opensAt = new Date(parsed.data.opensAt);
    const closesAt = new Date(parsed.data.closesAt);
    if (!Number.isFinite(opensAt.getTime()) || !Number.isFinite(closesAt.getTime()) || closesAt <= opensAt) {
      return { ok: false, message: "Data închiderii trebuie să fie după data deschiderii." };
    }

    const { data: previous } = await supabaseAdmin
      .from("recruitment_campaigns")
      .select("status")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (!previous) return { ok: false, message: "Campania nu mai există." };

    const { data: activeForm } = await supabaseAdmin
      .from("recruitment_forms")
      .select("id, version")
      .eq("campaign_id", parsed.data.id)
      .eq("status", "active")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!activeForm) return { ok: false, message: "Formularul activ nu este configurat." };

    const { error } = await supabaseAdmin.rpc("configure_recruitment_campaign", {
      p_actor_id: viewer.profile.id,
      p_campaign_id: parsed.data.id,
      p_closed_message: parsed.data.closedMessage,
      p_closes_at: closesAt.toISOString(),
      p_intro: parsed.data.intro,
      p_opens_at: opensAt.toISOString(),
      p_status: parsed.data.status,
      p_title: parsed.data.title,
    });
    if (error) throw error;

    const { data: activeFormId, error: questionsError } = await supabaseAdmin.rpc(
      "version_recruitment_questions",
      {
        p_campaign_id: parsed.data.id,
        p_questions: questions,
      },
    );
    if (questionsError || !activeFormId) throw questionsError ?? new Error("Form version missing");
    const questionsChanged = activeFormId !== activeForm.id;

    await Promise.all([
      logAudit({
        actorId: viewer.profile.id,
        action: "recruitment.public_state_changed",
        entityType: "recruitment_campaign",
        entityId: parsed.data.id,
        metadata: { previous_status: previous.status, status: parsed.data.status },
      }),
      ...(questionsChanged ? [logAudit({
        actorId: viewer.profile.id,
        action: "recruitment.questions_changed",
        entityType: "recruitment_form",
        entityId: activeFormId,
        metadata: { previous_form_id: activeForm.id, previous_version: activeForm.version },
      })] : []),
    ]);

    revalidatePublicRecruitmentState();
    revalidatePath("/board/formular-inscrieri");
    revalidatePath("/devino-membru");
    revalidatePath("/");
    return {
      ok: true,
      message: questionsChanged
        ? "Starea și întrebările formularului au fost actualizate."
        : "Starea formularului public a fost actualizată.",
    };
  } catch {
    return { ok: false, message: "Formularul public nu a putut fi actualizat." };
  }
}
