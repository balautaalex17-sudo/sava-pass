"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/dashboard/auth";
import { ensureInvitedAuthUser, sendMemberInvitation } from "@/lib/dashboard/member-auth";
import {
  classifyFormDecision,
  type ApplicationRating,
} from "@/lib/dashboard/recruitment-evaluations";
import { createNotification, deliverNotification } from "@/lib/notifications";
import { logServerError } from "@/lib/server-log";
import { supabaseAdmin } from "@/lib/supabase/admin";

const APPLICATION_STATUSES = [
  "submitted",
  "under_review",
  "selected_for_interview",
  "interview_scheduled",
  "interview_completed",
  "accepted",
  "waiting_list",
  "rejected",
] as const;

type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const applicationSchema = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(APPLICATION_STATUSES),
  reviewerId: z.string().uuid().nullable(),
}).strict();

const batchSchema = z.object({
  action: z.enum(["select_for_interview", "send_interview_email", "reject", "accept"]),
  applicationIds: z.array(z.string().uuid()).min(1).max(100),
}).strict();

type ApplicationRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  grade: string | null;
  status: string;
};

type TransitionResult = {
  changed: boolean;
  emailFailed: boolean;
  invitationSent: boolean;
  reason?: string;
};

const INTERVIEW_SOURCE_STATUSES = new Set<ApplicationStatus>([
  "submitted",
  "under_review",
]);

const ACCEPTANCE_SOURCE_STATUSES = new Set<ApplicationStatus>([
  "selected_for_interview",
  "interview_scheduled",
  "interview_completed",
  "waiting_list",
]);

const INTERVIEW_EMAIL_STATUSES = new Set<ApplicationStatus>([
  "selected_for_interview",
  "interview_scheduled",
  "interview_completed",
]);

const NOTIFICATION_FOR_STATUS: Partial<Record<ApplicationStatus, string>> = {
  accepted: "application_accepted",
  waiting_list: "application_waiting_list",
  rejected: "application_rejected",
};

async function getApplication(id: string) {
  const { data, error } = await supabaseAdmin
    .from("membership_applications")
    .select("id, full_name, email, phone, grade, status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as ApplicationRow | null;
}

async function provisionMemberAccount(application: ApplicationRow) {
  const ensured = await ensureInvitedAuthUser({
    email: application.email,
    fullName: application.full_name,
  });
  const userId = ensured.user.id;
  let profileSaved = false;

  try {
    const { data: existingProfile, error: profileReadError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (profileReadError) throw profileReadError;

    const profile = {
      full_name: application.full_name,
      email: application.email.toLocaleLowerCase("ro"),
      phone: application.phone || null,
      grade: application.grade,
      membership_status: "active",
    };

    const profileResult = existingProfile
      ? await supabaseAdmin.from("profiles").update(profile).eq("id", userId)
      : await supabaseAdmin.from("profiles").insert({
        id: userId,
        ...profile,
        role: null,
      });
    if (profileResult.error) throw profileResult.error;
    profileSaved = true;

    const delivery = ensured.invitation
      ? await sendMemberInvitation(ensured.invitation, null)
      : null;
    return {
      invitationSent: delivery?.ok ?? false,
      invitationEmailFailed: delivery ? !delivery.ok : false,
    };
  } catch (error) {
    if (ensured.authUserCreated && !profileSaved) {
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (cleanupError) logServerError("accepted_member_auth_cleanup_failed", cleanupError);
    }
    throw error;
  }
}

async function ensureInterviewRecord(applicationId: string) {
  const { data: existing, error: readError } = await supabaseAdmin
    .from("interviews")
    .select("id")
    .eq("application_id", applicationId)
    .neq("status", "cancelled")
    .maybeSingle();
  if (readError) throw readError;
  if (existing) return existing.id;

  const { data: created, error } = await supabaseAdmin
    .from("interviews")
    .insert({ application_id: applicationId, status: "scheduled" })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: concurrent } = await supabaseAdmin
        .from("interviews")
        .select("id")
        .eq("application_id", applicationId)
        .neq("status", "cancelled")
        .maybeSingle();
      return concurrent?.id ?? null;
    }
    throw error;
  }
  return created.id;
}

async function notifyCandidate(
  application: ApplicationRow,
  nextStatus: ApplicationStatus,
  actorId: string,
  interviewId: string | null,
) {
  const templateKey = NOTIFICATION_FOR_STATUS[nextStatus];
  if (!templateKey) return false;

  const variables = {
    first_name: application.full_name.split(" ")[0] || application.full_name,
    result_message: nextStatus === "rejected"
      ? "De această dată nu ai fost selectat(ă) pentru etapa următoare, dar îți mulțumim pentru interesul acordat clubului."
      : "",
  };
  const emailResult = await createNotification({
    templateKey,
    recipientEmail: application.email,
    recipientName: application.full_name,
    variables,
    applicationId: application.id,
    interviewId,
    createdBy: actorId,
  });

  return !emailResult.ok;
}

async function sendInterviewInvitation(
  application: ApplicationRow,
  actorId: string,
  interviewId: string,
  existingNotification?: { id: string; status: string },
) {
  if (existingNotification?.status === "failed") {
    return deliverNotification(existingNotification.id);
  }

  return createNotification({
    templateKey: "interview_invitation",
    recipientEmail: application.email,
    recipientName: application.full_name,
    variables: {
      first_name: application.full_name.split(" ")[0] || application.full_name,
    },
    applicationId: application.id,
    interviewId,
    createdBy: actorId,
    metadata: { manually_sent: true },
  });
}

async function transitionApplication(
  application: ApplicationRow,
  nextStatus: ApplicationStatus,
  actorId: string,
  reviewerId: string | null,
): Promise<TransitionResult> {
  if (application.status === nextStatus) {
    const { error } = await supabaseAdmin
      .from("membership_applications")
      .update({ reviewer_id: reviewerId })
      .eq("id", application.id);
    if (error) throw error;
    return { changed: false, emailFailed: false, invitationSent: false };
  }

  if (
    nextStatus === "selected_for_interview"
    && !INTERVIEW_SOURCE_STATUSES.has(application.status as ApplicationStatus)
  ) {
    return {
      changed: false,
      emailFailed: false,
      invitationSent: false,
      reason: "Candidatul nu mai este în etapa de evaluare inițială.",
    };
  }

  let invitationSent = false;
  let invitationEmailFailed = false;
  if (nextStatus === "accepted") {
    if (!ACCEPTANCE_SOURCE_STATUSES.has(application.status as ApplicationStatus)) {
      return {
        changed: false,
        emailFailed: false,
        invitationSent: false,
        reason: "Candidatul trebuie să ajungă mai întâi în etapa de interviu.",
      };
    }
    const invitation = await provisionMemberAccount(application);
    invitationSent = invitation.invitationSent;
    invitationEmailFailed = invitation.invitationEmailFailed;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("membership_applications")
    .update({ status: nextStatus, reviewer_id: reviewerId })
    .eq("id", application.id)
    .eq("status", application.status)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!updated) {
    return {
      changed: false,
      emailFailed: false,
      invitationSent,
      reason: "Aplicația a fost modificată între timp. Reîncarcă pagina.",
    };
  }

  let interviewId: string | null = null;
  if (nextStatus === "selected_for_interview") {
    interviewId = await ensureInterviewRecord(application.id);
  } else if (nextStatus === "accepted") {
    const { data: completedInterviews, error: interviewError } = await supabaseAdmin
      .from("interviews")
      .update({
        status: "completed",
        decision: "accepted",
        completed_at: new Date().toISOString(),
      })
      .eq("application_id", application.id)
      .neq("status", "cancelled")
      .select("id");
    if (interviewError) throw interviewError;
    interviewId = completedInterviews?.[0]?.id ?? null;
  }

  const { error: historyError } = await supabaseAdmin
    .from("application_status_events")
    .insert({
      application_id: application.id,
      actor_id: actorId,
      from_status: application.status,
      to_status: nextStatus,
      note: nextStatus === "accepted"
        ? "Candidatul a fost acceptat și contul de membru a fost activat."
        : nextStatus === "selected_for_interview"
          ? "Candidatul a fost selectat pentru interviu. Emailul nu a fost trimis automat."
          : nextStatus === "rejected"
            ? "Candidatul a fost anunțat că nu a avansat la etapa următoare."
          : "Actualizare din workspace-ul Board.",
      visible_to_candidate: true,
    });
  if (historyError) logServerError("recruitment_history_insert_failed", historyError);

  const statusEmailFailed = await notifyCandidate(
    application,
    nextStatus,
    actorId,
    interviewId,
  );
  const emailFailed = statusEmailFailed || invitationEmailFailed;

  await logAudit({
    actorId,
    action: nextStatus === "accepted"
      ? "recruitment.candidate_accepted"
      : nextStatus === "selected_for_interview"
        ? "recruitment.candidate_selected_for_interview"
        : nextStatus === "rejected"
          ? "recruitment.application_rejected"
        : "recruitment.application_updated",
    entityType: "membership_application",
    entityId: application.id,
    metadata: {
      from: application.status,
      to: nextStatus,
      account_invitation_sent: invitationSent,
      email_failed: emailFailed,
    },
  });

  return { changed: true, emailFailed, invitationSent };
}

function revalidateRecruitment() {
  revalidatePath("/board/interviuri");
  revalidatePath("/board/membri");
  revalidatePath("/board", "layout");
}

export async function updateApplicationOperations(input: unknown) {
  try {
    const viewer = await requirePermission("manage_recruitment_signups");
    const parsed = applicationSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: "Datele aplicației sunt invalide." };
    }

    const application = await getApplication(parsed.data.applicationId);
    if (!application) {
      return { ok: false as const, message: "Aplicația nu mai există." };
    }

    const result = await transitionApplication(
      application,
      parsed.data.status,
      viewer.profile.id,
      parsed.data.reviewerId,
    );
    if (result.reason) return { ok: false as const, message: result.reason };

    revalidateRecruitment();
    return {
      ok: true as const,
      message: result.emailFailed
        ? "Statusul a fost salvat, dar cel puțin un email nu a plecat. Codul de cont se retrimite din Membri, iar celelalte mesaje din Notificări."
        : result.invitationSent
          ? "Candidatul a fost acceptat. Contul și emailul pentru setarea parolei au fost create."
          : result.changed && parsed.data.status === "selected_for_interview"
            ? "Candidatul a fost selectat pentru interviu. Niciun email nu a fost trimis."
          : result.changed
            ? "Aplicația a fost actualizată și candidatul a fost notificat."
            : "Evaluatorul a fost actualizat.",
    };
  } catch (error) {
    logServerError("recruitment_application_update_failed", error);
    return { ok: false as const, message: "Aplicația nu a putut fi actualizată." };
  }
}

export async function runRecruitmentBatchAction(input: unknown) {
  try {
    const viewer = await requirePermission("manage_recruitment_signups");
    const parsed = batchSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: "Selecția este invalidă.", processedIds: [] as string[] };
    }

    const ids = [...new Set(parsed.data.applicationIds)];
    const nextStatus: ApplicationStatus | null = parsed.data.action === "select_for_interview"
      ? "selected_for_interview"
      : parsed.data.action === "reject"
        ? "rejected"
        : parsed.data.action === "accept"
          ? "accepted"
          : null;
    let processed = 0;
    let skipped = 0;
    let failed = 0;
    let emailFailed = 0;
    let invitationsSent = 0;
    const processedIds: string[] = [];
    const ratingsByApplication = new Map<string, string[]>();
    const interviewsByApplication = new Map<string, string>();
    const notificationsByApplication = new Map<string, { id: string; status: string }>();

    if (parsed.data.action === "select_for_interview" || parsed.data.action === "reject") {
      const { data: evaluations, error: evaluationError } = await supabaseAdmin
        .from("application_evaluations")
        .select("application_id, rating")
        .in("application_id", ids);
      if (evaluationError) throw evaluationError;
      for (const evaluation of evaluations ?? []) {
        const ratings = ratingsByApplication.get(evaluation.application_id) ?? [];
        ratings.push(evaluation.rating);
        ratingsByApplication.set(evaluation.application_id, ratings);
      }
    }

    if (
      parsed.data.action === "select_for_interview"
      || parsed.data.action === "reject"
      || parsed.data.action === "send_interview_email"
    ) {
      const { data: interviews, error: interviewError } = await supabaseAdmin
        .from("interviews")
        .select("id, application_id")
        .in("application_id", ids)
        .neq("status", "cancelled");
      if (interviewError) throw interviewError;
      for (const interview of interviews ?? []) {
        interviewsByApplication.set(interview.application_id, interview.id);
      }
    }

    if (parsed.data.action === "send_interview_email") {
      const { data: notifications, error: notificationError } = await supabaseAdmin
        .from("notifications")
        .select("id, application_id, status")
        .in("application_id", ids)
        .eq("template_key", "interview_invitation")
        .eq("channel", "email");
      if (notificationError) throw notificationError;

      const statusPriority: Record<string, number> = { failed: 1, queued: 2, sending: 3, sent: 4 };
      for (const notification of notifications ?? []) {
        if (!notification.application_id) continue;
        const existing = notificationsByApplication.get(notification.application_id);
        if (!existing || (statusPriority[notification.status] ?? 0) > (statusPriority[existing.status] ?? 0)) {
          notificationsByApplication.set(notification.application_id, {
            id: notification.id,
            status: notification.status,
          });
        }
      }
    }

    for (const id of ids) {
      try {
        const application = await getApplication(id);
        if (!application) {
          failed += 1;
          continue;
        }
        const ratings = ratingsByApplication.get(id) ?? [];
        const decision = classifyFormDecision(ratings as ApplicationRating[]);
        const interviewId = interviewsByApplication.get(id);

        if (parsed.data.action === "select_for_interview") {
          if (
            !INTERVIEW_SOURCE_STATUSES.has(application.status as ApplicationStatus)
            || Boolean(interviewId)
            || ratings.length === 0
          ) {
            skipped += 1;
            continue;
          }
        } else if (parsed.data.action === "reject") {
          if (
            !INTERVIEW_SOURCE_STATUSES.has(application.status as ApplicationStatus)
            || Boolean(interviewId)
            || decision !== "not_selected"
          ) {
            skipped += 1;
            continue;
          }
        } else if (parsed.data.action === "send_interview_email") {
          if (
            !INTERVIEW_EMAIL_STATUSES.has(application.status as ApplicationStatus)
            || !interviewId
          ) {
            skipped += 1;
            continue;
          }

          const existingNotification = notificationsByApplication.get(id);
          if (existingNotification && existingNotification.status !== "failed") {
            skipped += 1;
            continue;
          }

          const delivery = await sendInterviewInvitation(
            application,
            viewer.profile.id,
            interviewId,
            existingNotification,
          );
          if (!delivery.ok) {
            emailFailed += 1;
            continue;
          }

          processed += 1;
          processedIds.push(id);
          await logAudit({
            actorId: viewer.profile.id,
            action: "recruitment.interview_invitation_sent",
            entityType: "membership_application",
            entityId: id,
            metadata: { manually_sent: true },
          });
          continue;
        }

        if (!nextStatus) {
          skipped += 1;
          continue;
        }
        const result = await transitionApplication(
          application,
          nextStatus,
          viewer.profile.id,
          viewer.profile.id,
        );
        if (!result.changed) {
          skipped += 1;
          continue;
        }
        processed += 1;
        processedIds.push(id);
        if (result.emailFailed) emailFailed += 1;
        if (result.invitationSent) invitationsSent += 1;
      } catch (error) {
        logServerError("recruitment_batch_item_failed", error);
        failed += 1;
      }
    }

    revalidateRecruitment();
    if (parsed.data.action === "send_interview_email") {
      revalidatePath("/admin/notificari");
    }
    const label = parsed.data.action === "select_for_interview"
      ? `${processed} candidați selectați pentru interviu. Niciun email nu a fost trimis.`
      : parsed.data.action === "send_interview_email"
        ? `${processed} emailuri de invitație trimise manual.`
      : parsed.data.action === "reject"
        ? `${processed} candidați au fost anunțați că nu au avansat.`
        : `${processed} candidați acceptați, ${invitationsSent} conturi noi invitate.`;
    const details = [
      skipped ? `${skipped} omiși deoarece erau în altă etapă.` : "",
      emailFailed ? `${emailFailed} emailuri trebuie retrimise.` : "",
      failed ? `${failed} procesări au eșuat.` : "",
    ].filter(Boolean).join(" ");

    return {
      ok: failed === 0 && emailFailed === 0 && processed > 0,
      message: `${label}${details ? ` ${details}` : ""}`,
      processedIds,
    };
  } catch (error) {
    logServerError("recruitment_batch_action_failed", error);
    return {
      ok: false as const,
      message: "Selecția nu a putut fi procesată. Încearcă din nou.",
      processedIds: [] as string[],
    };
  }
}
