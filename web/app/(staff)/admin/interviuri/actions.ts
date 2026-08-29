"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { requireStaffRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface InterviewActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  scheduled?: number;
}

const periodSchema = z.object({
  campaign_id: z.string().uuid(),
  title: z.string().min(3).max(120),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  slot_duration_minutes: z.coerce.number().int().min(10).max(180),
  default_location: z.string().max(200).optional(),
  default_meeting_url: z.union([z.literal(""), z.string().url()]).optional(),
  generate_slots: z.literal("on").optional(),
});

export async function createInterviewPeriod(
  _previous: InterviewActionState,
  form: FormData,
): Promise<InterviewActionState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces la această acțiune." };
  const parsed = periodSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const start = new Date(parsed.data.starts_at);
  const end = new Date(parsed.data.ends_at);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    return { error: "Perioada de interviuri nu este validă." };
  }

  const { data: period, error } = await supabaseAdmin.from("interview_periods").insert({
    campaign_id: parsed.data.campaign_id,
    title: parsed.data.title,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    slot_duration_minutes: parsed.data.slot_duration_minutes,
    default_location: parsed.data.default_location?.trim() || null,
    default_meeting_url: parsed.data.default_meeting_url || null,
  }).select("id").single();
  if (error || !period) return { error: "Perioada nu a putut fi creată." };

  let generated = 0;
  if (parsed.data.generate_slots === "on") {
    const durationMs = parsed.data.slot_duration_minutes * 60_000;
    const slots = [];
    for (let cursor = start.getTime(); cursor + durationMs <= end.getTime() && slots.length < 200; cursor += durationMs) {
      slots.push({
        period_id: period.id,
        starts_at: new Date(cursor).toISOString(),
        ends_at: new Date(cursor + durationMs).toISOString(),
        room: parsed.data.default_location?.trim() || null,
        meeting_url: parsed.data.default_meeting_url || null,
      });
    }
    if (slots.length) {
      const { error: slotError } = await supabaseAdmin.from("interview_slots").insert(slots);
      if (slotError) return { error: "Perioada a fost creată, dar sloturile nu au putut fi generate." };
      generated = slots.length;
    }
  }

  await logAudit({ actorId: current.user.id, action: "interview_period.created", entityType: "interview_period", entityId: period.id, metadata: { slots: generated } });
  revalidatePath("/admin/interviuri");
  return { ok: true, message: `Perioadă creată${generated ? ` cu ${generated} sloturi` : ""}.` };
}

const scheduleSchema = z.object({
  application_id: z.string().uuid(),
  slot_id: z.string().uuid(),
  location: z.string().max(200).optional(),
  meeting_url: z.union([z.literal(""), z.string().url()]).optional(),
  reason: z.string().max(500).optional(),
  committee_board: z.string().uuid().optional(),
  committee_hr: z.string().uuid().optional(),
  committee_pr: z.string().uuid().optional(),
  committee_note_taker: z.string().uuid().optional(),
});

type SlotRelation = { starts_at: string; ends_at: string } | null;

export async function scheduleInterview(
  _previous: InterviewActionState,
  form: FormData,
): Promise<InterviewActionState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces la această acțiune." };
  const parsed = scheduleSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const legacyIds = [...new Set(form.getAll("interviewer_ids").map(String).filter(Boolean))];
  const committee = [
    ["board", parsed.data.committee_board],
    ["hr", parsed.data.committee_hr],
    ["pr", parsed.data.committee_pr],
    ["note_taker", parsed.data.committee_note_taker],
  ] as const;
  const committeeWithIds: Array<[string, string]> = committee.every(([, profileId]) => Boolean(profileId))
    ? committee.map(([role, profileId]) => [role, profileId!] as [string, string])
    : legacyIds.length >= 4
      ? (["board", "hr", "pr", "note_taker"] as const).map((role, index) => [role, legacyIds[index]] as [string, string])
      : [];
  const interviewerIds = [...new Set(committeeWithIds.map(([, profileId]) => profileId))];
  if (committeeWithIds.length !== 4 || interviewerIds.length !== 4) return { error: "Alege câte un membru pentru Board, HR, PR și notițe." };

  const [{ data: application }, { data: slot }, { data: existingInterview }] = await Promise.all([
    supabaseAdmin.from("membership_applications").select("id, full_name, email, status").eq("id", parsed.data.application_id).maybeSingle(),
    supabaseAdmin.from("interview_slots").select("id, starts_at, ends_at, room, meeting_url, capacity, active").eq("id", parsed.data.slot_id).maybeSingle(),
    supabaseAdmin.from("interviews").select("id, slot_id, status").eq("application_id", parsed.data.application_id).neq("status", "cancelled").maybeSingle(),
  ]);
  if (!application || !slot?.active) return { error: "Candidatul sau slotul nu mai este disponibil." };

  const { count: slotCount } = await supabaseAdmin
    .from("interviews")
    .select("id", { count: "exact", head: true })
    .eq("slot_id", slot.id)
    .neq("status", "cancelled")
    .neq("id", existingInterview?.id ?? "00000000-0000-0000-0000-000000000000");
  if ((slotCount ?? 0) >= slot.capacity) return { error: "Slotul este deja ocupat." };

  const { data: assignments } = await supabaseAdmin
    .from("interview_interviewers")
    .select("interview_id, profile_id, slot_id, interview_slots(starts_at, ends_at)")
    .in("profile_id", interviewerIds);

  const conflict = (assignments ?? []).find((assignment) => {
    if (assignment.interview_id === existingInterview?.id) return false;
    const relation = assignment.interview_slots as unknown as SlotRelation;
    if (!relation) return false;
    return new Date(relation.starts_at) < new Date(slot.ends_at) && new Date(relation.ends_at) > new Date(slot.starts_at);
  });
  if (conflict) return { error: "Conflict: un intervievator este deja ocupat în acel interval." };

  const location = parsed.data.location?.trim() || slot.room || null;
  const meetingUrl = parsed.data.meeting_url || slot.meeting_url || null;
  const now = new Date().toISOString();
  let interviewId = existingInterview?.id;
  const oldSlotId = existingInterview?.slot_id ?? null;

  if (existingInterview) {
    const { error } = await supabaseAdmin.from("interviews").update({
      slot_id: slot.id,
      status: "scheduled",
      location,
      meeting_url: meetingUrl,
      scheduled_at: slot.starts_at,
      rescheduled_at: oldSlotId && oldSlotId !== slot.id ? now : null,
    }).eq("id", existingInterview.id);
    if (error) return { error: "Interviul nu a putut fi reprogramat." };
    await supabaseAdmin.from("interview_interviewers").delete().eq("interview_id", existingInterview.id);
  } else {
    const { data: created, error } = await supabaseAdmin.from("interviews").insert({
      application_id: application.id,
      slot_id: slot.id,
      status: "scheduled",
      location,
      meeting_url: meetingUrl,
      scheduled_at: slot.starts_at,
    }).select("id").single();
    if (error || !created) return { error: "Interviul nu a putut fi programat." };
    interviewId = created.id;
  }

  const { error: interviewerError } = await supabaseAdmin.from("interview_interviewers").insert(
    committeeWithIds.map(([committeeRole, profileId]) => ({ interview_id: interviewId!, profile_id: profileId, slot_id: slot.id, committee_role: committeeRole })),
  );
  if (interviewerError) return { error: "Interviul a fost salvat, dar intervievatorii nu au putut fi alocați." };

  if (existingInterview && oldSlotId !== slot.id) {
    await supabaseAdmin.from("interview_changes").insert({
      interview_id: existingInterview.id,
      old_slot_id: oldSlotId,
      new_slot_id: slot.id,
      reason: parsed.data.reason?.trim() || null,
      actor_id: current.user.id,
    });
  }

  if (application.status !== "interview_scheduled") {
    await Promise.all([
      supabaseAdmin.from("membership_applications").update({ status: "interview_scheduled" }).eq("id", application.id),
      supabaseAdmin.from("application_status_events").insert({
        application_id: application.id,
        from_status: application.status,
        to_status: "interview_scheduled",
        note: "Interviul a fost programat.",
        actor_id: current.user.id,
      }),
    ]);
  }

  const changed = Boolean(existingInterview && oldSlotId !== slot.id);
  const variables = {
    first_name: application.full_name.split(" ")[0] || application.full_name,
    interview_time: new Date(slot.starts_at).toLocaleString("ro-RO", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bucharest" }),
    interview_place: location || (meetingUrl ? "online" : "locație în curs de confirmare"),
  };
  const templateKey = changed ? "interview_changed" : "interview_scheduled";
  const [notificationResult] = await Promise.all([
    createNotification({ templateKey, recipientEmail: application.email, recipientName: application.full_name, variables, applicationId: application.id, interviewId, createdBy: current.user.id }),
    logAudit({ actorId: current.user.id, action: changed ? "interview.rescheduled" : "interview.scheduled", entityType: "interview", entityId: interviewId, metadata: { slot_id: slot.id, interviewer_ids: interviewerIds, committee_roles: committeeWithIds.map(([role]) => role) } }),
  ]);

  revalidatePath("/admin/interviuri");
  revalidatePath("/admin/aplicatii");
  revalidatePath(`/admin/aplicatii/${application.id}`);
  return {
    ok: true,
    message: !notificationResult.ok
      ? "Interviul a fost salvat, dar emailul nu a plecat. Retrimite-l din Notificări."
      : changed
        ? "Interviul a fost reprogramat și candidatul a fost notificat."
        : "Interviul a fost programat și candidatul a fost notificat.",
  };
}

const completionSchema = z.object({
  interview_id: z.string().uuid(),
  attendance: z.enum(["completed", "no_show", "late"]),
  private_notes: z.string().max(10_000).optional(),
  score: z.union([z.literal(""), z.coerce.number().min(0).max(40)]).optional(),
  decision: z.union([z.literal(""), z.enum(["accepted", "waiting_list", "rejected"])]).optional(),
});

export async function completeInterview(
  _previous: InterviewActionState,
  form: FormData,
): Promise<InterviewActionState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces la această acțiune." };
  const parsed = completionSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide." };

  const { data: interview } = await supabaseAdmin.from("interviews").select("id, application_id").eq("id", parsed.data.interview_id).maybeSingle();
  if (!interview) return { error: "Interviul nu există." };

  const decision = parsed.data.decision || null;
  const score = parsed.data.score === "" || parsed.data.score === undefined ? null : parsed.data.score;
  const late = parsed.data.attendance === "late";
  const { error } = await supabaseAdmin.from("interviews").update({
    status: late ? "no_show" : parsed.data.attendance,
    arrival_status: late ? "late" : parsed.data.attendance === "completed" ? "on_time" : "absent",
    private_notes: parsed.data.private_notes?.trim() || null,
    score,
    decision: late ? "rejected" : decision,
    completed_at: parsed.data.attendance === "completed" ? new Date().toISOString() : null,
  }).eq("id", interview.id);
  if (error) return { error: "Evaluarea nu a putut fi salvată." };

  const nextStatus = late ? "rejected" : decision || (parsed.data.attendance === "completed" ? "interview_completed" : "interview_scheduled");
  const { data: application } = await supabaseAdmin.from("membership_applications").select("full_name, email, status").eq("id", interview.application_id).single();
  await Promise.all([
    supabaseAdmin.from("membership_applications").update({ status: nextStatus, score: score }).eq("id", interview.application_id),
    supabaseAdmin.from("application_status_events").insert({ application_id: interview.application_id, from_status: application?.status ?? null, to_status: nextStatus, note: late ? "Întârziere — descalificat automat." : decision ? "Decizia finală a fost înregistrată." : "Interviul a fost încheiat.", actor_id: current.user.id }),
  ]);

  let notificationFailed = false;
  if ((decision || late) && application) {
    const finalDecision = late ? "rejected" : decision!;
    const templateKey = finalDecision === "accepted" ? "application_accepted" : finalDecision === "waiting_list" ? "application_waiting_list" : "application_rejected";
    const variables = { first_name: application.full_name.split(" ")[0] || application.full_name, result_message: "" };
    const result = await createNotification({ templateKey, recipientEmail: application.email, recipientName: application.full_name, variables, applicationId: interview.application_id, interviewId: interview.id, createdBy: current.user.id });
    notificationFailed = !result.ok;
  }

  await logAudit({ actorId: current.user.id, action: late ? "interview.late_disqualified" : decision ? "interview.decision_recorded" : "interview.completed", entityType: "interview", entityId: interview.id, metadata: { attendance: parsed.data.attendance, decision: late ? "rejected" : decision } });
  revalidatePath("/admin/interviuri");
  revalidatePath(`/admin/aplicatii/${interview.application_id}`);
  return {
    ok: true,
    message: notificationFailed
      ? "Evaluarea a fost salvată, dar emailul nu a plecat. Retrimite-l din Notificări."
      : "Evaluarea interviului a fost salvată.",
  };
}

export async function bulkScheduleInterviews(
  _previous: InterviewActionState,
  form: FormData,
): Promise<InterviewActionState> {
  const current = await requireStaffRole(["admin"]);
  if (!current) return { error: "Nu ai acces la această acțiune." };
  const periodId = String(form.get("period_id") ?? "");
  const applicationIds = String(form.get("application_ids") ?? "").split(/[\s,;]+/).filter(Boolean).slice(0, 50);
  const committeeFields = ["board", "hr", "pr", "note_taker"].map((role) => [role, String(form.get(`committee_${role}`) ?? "")] as const);
  if (!applicationIds.length || !periodId || committeeFields.some(([, profileId]) => !profileId) || new Set(committeeFields.map(([, profileId]) => profileId)).size !== 4) return { error: "Alege candidați, o perioadă și patru persoane distincte în comisie." };

  const { data: slots } = await supabaseAdmin.from("interview_slots").select("id").eq("period_id", periodId).eq("active", true).order("starts_at");
  if (!slots?.length) return { error: "Perioada nu are sloturi disponibile." };

  let scheduled = 0;
  const errors: string[] = [];
  for (let index = 0; index < Math.min(applicationIds.length, slots.length); index += 1) {
    const one = new FormData();
    one.set("application_id", applicationIds[index]);
    one.set("slot_id", slots[index].id);
    for (const [role, profileId] of committeeFields) one.set(`committee_${role}`, profileId);
    const result = await scheduleInterview({}, one);
    if (result.ok) scheduled += 1;
    else if (result.error) errors.push(result.error);
  }

  return {
    ok: scheduled > 0,
    scheduled,
    message: `${scheduled} interviuri programate.`,
    error: errors.length ? `${errors.length} nu au fost programate: ${errors[0]}` : undefined,
  };
}
