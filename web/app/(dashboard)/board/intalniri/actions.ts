"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/dashboard/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const meetingSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(3000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().trim().min(2).max(200),
  attendanceOpensAt: z.string().datetime(),
  attendanceClosesAt: z.string().datetime(),
  status: z.enum(["draft", "upcoming", "attendance_open", "finished", "cancelled"]),
}).strict();

export type MeetingInput = z.infer<typeof meetingSchema>;

export async function saveMeeting(input: unknown) {
  try {
    const viewer = await requirePermission("manage_meetings");
    const parsed = meetingSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Date invalide." };
    const values = parsed.data;
    const starts = new Date(values.startsAt).getTime();
    const ends = new Date(values.endsAt).getTime();
    const opens = new Date(values.attendanceOpensAt).getTime();
    const closes = new Date(values.attendanceClosesAt).getTime();
    if (!(opens <= starts && starts < ends && starts <= closes && opens < closes)) {
      return { ok: false as const, message: "Ordinea orelor nu este validă. Deschiderea trebuie să fie înainte de întâlnire, iar închiderea după început." };
    }

    const payload = {
      title: values.title,
      description: values.description ?? "",
      starts_at: values.startsAt,
      ends_at: values.endsAt,
      location: values.location,
      attendance_opens_at: values.attendanceOpensAt,
      attendance_closes_at: values.attendanceClosesAt,
      status: values.status,
    };
    const query = values.id
      ? supabaseAdmin.from("meetings").update(payload).eq("id", values.id).select("id").single()
      : supabaseAdmin.from("meetings").insert({ ...payload, created_by: viewer.profile.id }).select("id").single();
    const { data, error } = await query;
    if (error || !data) throw error ?? new Error("meeting_save_failed");
    await logAudit({ actorId: viewer.profile.id, action: values.id ? "meeting.updated" : "meeting.created", entityType: "meeting", entityId: data.id, metadata: { status: values.status } });
    revalidatePath("/board", "layout");
    return { ok: true as const, message: values.id ? "Întâlnirea a fost actualizată." : "Întâlnirea a fost creată.", id: data.id };
  } catch {
    return { ok: false as const, message: "Întâlnirea nu a putut fi salvată." };
  }
}
