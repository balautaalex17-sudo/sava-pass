"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/dashboard/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  RECRUITMENT_QUESTIONS,
  formRatingForScore,
  interviewLegacyRatingForScore,
  interviewScoreTotal,
} from "@/lib/recruitment-spec";

const evaluationSchema = z.object({
  applicationId: z.string().uuid(),
  questionScores: z.record(z.string(), z.coerce.number()),
  baseScore: z.coerce.number().min(0).max(6),
  comment: z.string().trim().max(5000).default(""),
}).strict();

export type ApplicationEvaluationInput = z.infer<typeof evaluationSchema>;

export async function saveApplicationEvaluation(input: unknown) {
  try {
    const viewer = await requirePermission("evaluate_recruitment_forms");
    const parsed = evaluationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false as const,
        message: "Completează punctajele celor 6 întrebări.",
      };
    }

    const expectedKeys = RECRUITMENT_QUESTIONS.map((question) => question.key);
    const actualKeys = Object.keys(parsed.data.questionScores).sort();
    if (actualKeys.join("|") !== [...expectedKeys].sort().join("|")) {
      return { ok: false as const, message: "Evaluarea trebuie să conțină exact cele 6 întrebări." };
    }
    if (Object.values(parsed.data.questionScores).some((score) => ![0, 0.5, 1].includes(score))) {
      return { ok: false as const, message: "Fiecare întrebare trebuie notată cu 0, 0,5 sau 1." };
    }
    const baseScore = Object.values(parsed.data.questionScores).reduce((total, score) => total + score, 0);

    const { data: application } = await supabaseAdmin
      .from("membership_applications")
      .select("id")
      .eq("id", parsed.data.applicationId)
      .maybeSingle();
    if (!application) {
      return { ok: false as const, message: "Formularul nu mai este disponibil." };
    }

    // Clientul autentificat aplică și politica RLS, nu doar verificarea din acțiune.
    const supabase = await createClient();
    const { data: evaluation, error } = await supabase
      .from("application_evaluations")
      .upsert(
        {
          application_id: parsed.data.applicationId,
          reviewer_id: viewer.profile.id,
          rating: formRatingForScore(baseScore),
          comment: parsed.data.comment,
          question_scores: parsed.data.questionScores,
          base_score: baseScore,
        },
        { onConflict: "application_id,reviewer_id" },
      )
      .select("rating, comment, question_scores, base_score, updated_at")
      .single();
    if (error) throw error;

    await logAudit({
      actorId: viewer.profile.id,
      action: "recruitment.application_evaluation_saved",
      entityType: "membership_application",
      entityId: parsed.data.applicationId,
      metadata: { rating: formRatingForScore(baseScore), base_score: baseScore },
    });

    revalidatePath("/board/interviuri");
    return {
      ok: true as const,
      message: "Evaluarea formularului a fost salvată.",
      evaluation,
    };
  } catch {
    return {
      ok: false as const,
      message: "Evaluarea formularului nu a putut fi salvată. Încearcă din nou.",
    };
  }
}

const interviewIdSchema = z.object({
  interviewId: z.string().uuid(),
}).strict();

const interviewEvaluationSchema = z.object({
  evaluationId: z.string().uuid(),
  categoryScores: z.object({
    situations: z.number().int().min(1).max(5),
    personality: z.number().int().min(1).max(5),
    creativity: z.number().int().min(1).max(5),
  }).strict(),
  comment: z.string().trim().max(5000).optional(),
}).strict();

export type InterviewEvaluationInput = z.infer<typeof interviewEvaluationSchema>;

/** Add one persistent, incomplete anonymous score row for a live interview. */
export async function addInterviewEvaluation(input: unknown) {
  try {
    const viewer = await requirePermission("evaluate_interview_candidates");
    if (!viewer.isAdminEquivalent) {
      return { ok: false as const, message: "Doar Board-ul poate evalua interviurile." };
    }

    const parsed = interviewIdSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: "Interviul nu este valid." };
    }

    const { data: interview } = await supabaseAdmin
      .from("interviews")
      .select("id")
      .eq("id", parsed.data.interviewId)
      .neq("status", "cancelled")
      .maybeSingle();
    if (!interview) return { ok: false as const, message: "Interviul nu mai este disponibil." };

    const { data: evaluation, error } = await supabaseAdmin
      .from("interview_evaluations")
      .insert({
        interview_id: parsed.data.interviewId,
        interviewer_id: null,
        rating: "yellow",
        comment: "Fără observații.",
        question_scores: {},
        category_scores: {},
        selected_sets: {},
        score: null,
        red_flag: false,
      })
      .select("id")
      .single();
    if (error) throw error;

    await logAudit({
      actorId: viewer.profile.id,
      action: "recruitment.interview_evaluation_added",
      entityType: "interview",
      entityId: parsed.data.interviewId,
      metadata: { evaluation_id: evaluation.id },
    });
    revalidatePath("/board/interviuri");
    revalidatePath("/admin/interviuri");
    return { ok: true as const, message: "Rândul anonim a fost adăugat.", id: evaluation.id };
  } catch {
    return { ok: false as const, message: "Rândul anonim nu a putut fi adăugat. Încearcă din nou." };
  }
}

/** Save one exact row. The actor can edit any anonymous or legacy row. */
export async function saveInterviewEvaluation(input: unknown) {
  try {
    const viewer = await requirePermission("evaluate_interview_candidates");
    if (!viewer.isAdminEquivalent) {
      return { ok: false as const, message: "Doar Board-ul poate evalua interviurile." };
    }

    const parsed = interviewEvaluationSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: "Alege un punctaj între 1 și 5 pentru fiecare criteriu." };
    }

    const score = interviewScoreTotal(parsed.data.categoryScores);
    const rating = interviewLegacyRatingForScore(score);
    const comment = parsed.data.comment?.trim() || "Fără observații.";
    const { data: evaluationRow } = await supabaseAdmin
      .from("interview_evaluations")
      .select("id, interview_id")
      .eq("id", parsed.data.evaluationId)
      .maybeSingle();
    if (!evaluationRow) return { ok: false as const, message: "Rândul de evaluare nu mai este disponibil." };

    const { data: interview } = await supabaseAdmin
      .from("interviews")
      .select("id")
      .eq("id", evaluationRow.interview_id)
      .neq("status", "cancelled")
      .maybeSingle();
    if (!interview) return { ok: false as const, message: "Interviul nu mai este disponibil." };

    const { data: evaluation, error } = await supabaseAdmin
      .from("interview_evaluations")
      .update({
        rating,
        comment,
        question_scores: {},
        category_scores: parsed.data.categoryScores,
        selected_sets: {},
        score,
        red_flag: false,
      })
      .eq("id", evaluationRow.id)
      .select("id, rating, comment, question_scores, category_scores, selected_sets, score, red_flag, updated_at")
      .single();
    if (error) throw error;

    await logAudit({
      actorId: viewer.profile.id,
      action: "recruitment.interview_evaluation_saved",
      entityType: "interview",
      entityId: evaluationRow.interview_id,
      metadata: { evaluation_id: evaluationRow.id, score, rating },
    });
    revalidatePath("/board/interviuri");
    revalidatePath("/admin/interviuri");
    return { ok: true as const, message: "Fișa de interviu a fost salvată.", evaluation };
  } catch {
    return { ok: false as const, message: "Fișa de interviu nu a putut fi salvată. Încearcă din nou." };
  }
}

/** Delete one exact row after a Board member confirms in the UI. */
export async function deleteInterviewEvaluation(input: unknown) {
  try {
    const viewer = await requirePermission("evaluate_interview_candidates");
    if (!viewer.isAdminEquivalent) {
      return { ok: false as const, message: "Doar Board-ul poate evalua interviurile." };
    }

    const parsed = z.object({ evaluationId: z.string().uuid() }).strict().safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: "Rândul de evaluare nu este valid." };
    }

    const { data: evaluationRow } = await supabaseAdmin
      .from("interview_evaluations")
      .select("id, interview_id")
      .eq("id", parsed.data.evaluationId)
      .maybeSingle();
    if (!evaluationRow) return { ok: false as const, message: "Rândul de evaluare nu mai este disponibil." };

    const { data: interview } = await supabaseAdmin
      .from("interviews")
      .select("id")
      .eq("id", evaluationRow.interview_id)
      .neq("status", "cancelled")
      .maybeSingle();
    if (!interview) return { ok: false as const, message: "Interviul nu mai este disponibil." };

    const { data: deletedEvaluation, error } = await supabaseAdmin
      .from("interview_evaluations")
      .delete()
      .eq("id", evaluationRow.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!deletedEvaluation) {
      return { ok: false as const, message: "Rândul de evaluare nu mai este disponibil." };
    }

    await logAudit({
      actorId: viewer.profile.id,
      action: "recruitment.interview_evaluation_deleted",
      entityType: "interview",
      entityId: evaluationRow.interview_id,
      metadata: { evaluation_id: evaluationRow.id },
    });
    revalidatePath("/board/interviuri");
    revalidatePath("/admin/interviuri");
    return { ok: true as const, message: "Rândul de evaluare a fost șters." };
  } catch {
    return { ok: false as const, message: "Rândul de evaluare nu a putut fi șters. Încearcă din nou." };
  }
}
