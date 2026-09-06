import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Meeting } from "@/lib/supabase/types";
import { attendanceResult, type AttendanceResult, type AbsenceRequest } from "./attendance";
import { readAllAttendanceRows } from "./attendance-data";

export interface MemberAttendanceEntry {
  id: string;
  status: string;
  checkedInAt: string;
  confirmedBy: string | null;
  meeting: Meeting;
}

export interface MemberMeetingResult {
  meeting: Meeting;
  attendance: MemberAttendanceEntry | null;
  result: AttendanceResult;
  request: AbsenceRequest | null;
}

type AttendanceQueryRow = {
  id: string;
  status: string;
  checked_in_at: string;
  meetings: Meeting | null;
  profiles: { full_name: string } | null;
};

export async function getMemberDashboardData(memberId: string) {
  const [meetingsData, attendanceData, requests] =
    await Promise.all([
      readAllAttendanceRows((from, to) => supabaseAdmin
        .from("meetings")
        .select("*")
        .in("status", ["upcoming", "attendance_open", "finished", "cancelled"])
        .order("starts_at", { ascending: false }).order("id").range(from, to)),
      readAllAttendanceRows((from, to) => supabaseAdmin
        .from("meeting_attendance")
        .select(
          "id, status, checked_in_at, meetings(*), profiles!meeting_attendance_checked_in_by_fkey(full_name)",
        )
        .eq("member_id", memberId)
        .order("checked_in_at", { ascending: false }).order("id").range(from, to)),
      readAllAttendanceRows((from, to) => supabaseAdmin.from("absence_requests").select("*")
        .eq("member_id", memberId).order("id").range(from, to)),
    ]);

  const meetings = (meetingsData ?? []) as Meeting[];
  const attendanceRows = (attendanceData ?? []) as unknown as AttendanceQueryRow[];
  const attendance: MemberAttendanceEntry[] = attendanceRows
    .filter((row): row is AttendanceQueryRow & { meetings: Meeting } => Boolean(row.meetings))
    .map((row) => ({
      id: row.id,
      status: row.status,
      checkedInAt: row.checked_in_at,
      confirmedBy: row.profiles?.full_name ?? null,
      meeting: row.meetings,
    }));

  const attendanceByMeeting = new Map(
    attendance.map((entry) => [entry.meeting.id, entry]),
  );
  const now = Date.now();
  const requestsByMeeting = new Map(requests.map((request) => [request.meeting_id, request]));
  const nextMeeting = [...meetings]
    .filter(
      (meeting) =>
        ["upcoming", "attendance_open"].includes(meeting.status) &&
        new Date(meeting.ends_at).getTime() >= now,
    )
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    )[0] ?? null;

  const results: MemberMeetingResult[] = meetings.map((meeting) => {
    const ownAttendance = attendanceByMeeting.get(meeting.id) ?? null;
    const request = requestsByMeeting.get(meeting.id) ?? null;
    const result = attendanceResult(meeting, ownAttendance?.status ?? null, request?.status ?? null, now);
    return { meeting, attendance: ownAttendance, result, request };
  });

  const eligible = results.filter(
    (item) => ["present", "absent", "excused"].includes(item.result),
  );
  const attended = eligible.filter((item) => item.result === "present").length;

  return {
    nextMeeting,
    attendance,
    results,
    summary: {
      attended,
      excused: eligible.filter((item) => item.result === "excused").length,
      eligible: eligible.length,
      percentage: eligible.length ? Math.round((attended / eligible.length) * 100) : 0,
    },
  };
}
