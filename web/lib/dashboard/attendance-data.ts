import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { attendanceResult, type AttendanceTableRow } from "./attendance";

// PostgREST caps each response. Read every page so older meetings and members
// are never silently omitted from the table or CSV.
export async function readAllAttendanceRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  const size = 500;
  for (let from = 0; ; from += size) {
    const { data, error } = await fetchPage(from, from + size - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < size) return rows;
  }
}

export async function getAttendanceRosterData(query: { view?: string; meeting?: string; member?: string }, canReview: boolean) {
  const [meetings, members] = await Promise.all([
    readAllAttendanceRows((from, to) => supabaseAdmin.from("meetings").select("*").order("starts_at", { ascending: false }).order("id").range(from, to)),
    readAllAttendanceRows((from, to) => supabaseAdmin.from("profiles").select("id, full_name, email, grade").in("membership_status", ["active", "recruit"]).order("full_name").order("id").range(from, to)),
  ]);
  const view: "member" | "meeting" = query.view === "member" ? "member" : "meeting";
  const selectedMeeting = meetings.find((meeting) => meeting.id === query.meeting) ?? meetings[0] ?? null;
  const selectedMember = members.find((member) => member.id === query.member) ?? members[0] ?? null;
  const selectedId = view === "member" ? selectedMember?.id : selectedMeeting?.id;
  const column = view === "member" ? "member_id" : "meeting_id";
  if (!selectedId) return { meetings, members, view, selectedMeeting, selectedMember, rows: [] as AttendanceTableRow[] };

  const [attendances, requests] = await Promise.all([
    readAllAttendanceRows((from, to) => supabaseAdmin.from("meeting_attendance")
      .select("member_id, meeting_id, status, checked_in_at, profiles!meeting_attendance_checked_in_by_fkey(full_name)")
      .eq(column, selectedId).order("id").range(from, to)),
    readAllAttendanceRows((from, to) => supabaseAdmin.from("absence_requests").select("*").eq(column, selectedId).order("id").range(from, to)),
  ]);
  const key = (meetingId: string, memberId: string) => `${meetingId}:${memberId}`;
  const attendanceMap = new Map(attendances.map((row) => [key(row.meeting_id, row.member_id), row]));
  const requestMap = new Map(requests.map((row) => [key(row.meeting_id, row.member_id),
    canReview ? row : { ...row, reason: "", review_note: null }]));
  const now = Date.now();
  const rows: AttendanceTableRow[] = [];
  for (const meeting of view === "member" ? meetings : selectedMeeting ? [selectedMeeting] : []) {
    for (const member of view === "meeting" ? members : selectedMember ? [selectedMember] : []) {
      const attendance = attendanceMap.get(key(meeting.id, member.id));
      const request = requestMap.get(key(meeting.id, member.id)) ?? null;
      rows.push({
        memberId: member.id, name: member.full_name, email: member.email, grade: member.grade,
        meetingId: meeting.id, meetingTitle: meeting.title, meetingStartsAt: meeting.starts_at,
        result: attendanceResult(meeting, attendance?.status ?? null, request?.status ?? null, now),
        attendanceStatus: attendance?.status ?? null,
        checkedInAt: attendance?.status === "present" ? attendance.checked_in_at : null,
        confirmedBy: attendance?.status === "present" ? attendance.profiles?.full_name ?? null : null,
        request,
      });
    }
  }
  return { meetings, members, view, selectedMeeting, selectedMember, rows };
}

export async function getAbsenceInboxData() {
  const requests = await readAllAttendanceRows((from, to) => supabaseAdmin.from("absence_requests")
    .select("*, meetings(title, starts_at, status, attendance_closes_at), profiles!absence_requests_member_id_fkey(full_name, grade)")
    .eq("status", "pending").order("created_at").order("id").range(from, to));
  const attendance = requests.length ? await readAllAttendanceRows((from, to) => supabaseAdmin.from("meeting_attendance")
    .select("meeting_id, member_id").eq("status", "present")
    .in("meeting_id", [...new Set(requests.map((request) => request.meeting_id))]).order("id").range(from, to)) : [];
  const present = new Set(attendance.map((row) => `${row.meeting_id}:${row.member_id}`));
  return { requests, present, now: Date.now() };
}
