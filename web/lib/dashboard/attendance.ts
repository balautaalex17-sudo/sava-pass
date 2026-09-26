import { z } from "zod";
import type { Meeting, Tables } from "@/lib/supabase/types";

export type AbsenceRequest = Tables<"absence_requests">;
export type AttendanceResult = "present" | "absent" | "excused" | "upcoming" | "cancelled" | "draft";

export const ATTENDANCE_LABELS: Record<AttendanceResult, string> = {
  present: "Prezent", absent: "Absent", excused: "Absent motivat",
  upcoming: "Neconfirmat", cancelled: "Anulată", draft: "Ciornă",
};

export const REQUEST_LABELS: Record<string, string> = {
  pending: "În așteptare", approved: "Acceptată", rejected: "Respinsă",
};

export function attendanceResult(
  meeting: Pick<Meeting, "status" | "ends_at" | "attendance_closes_at">,
  attendanceStatus: string | null,
  requestStatus: string | null,
  now: number,
): AttendanceResult {
  if (meeting.status === "cancelled") return "cancelled";
  if (meeting.status === "draft") return "draft";
  if (attendanceStatus === "present") return "present";
  // Always allow three hours after the scheduled end, regardless of status or scanning window.
  const absenceStartsAt = Date.parse(meeting.ends_at) + 3 * 60 * 60 * 1000;
  if (now >= absenceStartsAt) {
    return requestStatus === "approved" ? "excused" : "absent";
  }
  return "upcoming";
}

export function attendanceClass(result: AttendanceResult) {
  if (result === "present") return "dash-status dash-status--success";
  if (result === "absent") return "dash-status dash-status--danger";
  if (result === "excused" || result === "cancelled") return "dash-status dash-status--warning";
  return "dash-status";
}

export function canReviewAbsences(role: string | null) {
  return role === "board" || role === "admin";
}

export const absenceRequestSchema = z.object({
  meetingId: z.string().uuid(),
  reason: z.string().trim().min(10, "Descrie motivul în cel puțin 10 caractere.").max(2000, "Motivul poate avea cel mult 2000 de caractere."),
}).strict();

export const absenceReviewSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(1000, "Răspunsul poate avea cel mult 1000 de caractere."),
}).strict();

export interface AttendanceTableRow {
  memberId: string;
  name: string;
  email: string | null;
  grade: string | null;
  meetingId: string;
  meetingTitle: string;
  meetingStartsAt: string;
  result: AttendanceResult;
  attendanceStatus: string | null;
  checkedInAt: string | null;
  confirmedBy: string | null;
  request: AbsenceRequest | null;
}

export type AttendanceSort = "person-asc" | "person-desc" | "meeting-desc" | "meeting-asc";
export type AttendanceFilter = "all" | "present" | "absent" | "excused" | "pending";

export function filterAttendanceRows(
  rows: AttendanceTableRow[], search: string, filter: AttendanceFilter, sort: AttendanceSort,
) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ro");
  const term = normalize(search.trim());
  return rows.filter((row) => {
    const matches = normalize(`${row.name} ${row.meetingTitle}`).includes(term);
    if (filter === "pending") return matches && row.result === "absent" && row.request?.status === "pending";
    return matches && (filter === "all" || row.result === filter);
  }).sort((a, b) => {
    const person = a.name.localeCompare(b.name, "ro") || a.memberId.localeCompare(b.memberId);
    const meeting = Date.parse(a.meetingStartsAt) - Date.parse(b.meetingStartsAt)
      || a.meetingTitle.localeCompare(b.meetingTitle, "ro") || a.meetingId.localeCompare(b.meetingId);
    if (sort === "person-asc") return person || -meeting;
    if (sort === "person-desc") return -person || -meeting;
    return (sort === "meeting-asc" ? meeting : -meeting) || person;
  });
}
