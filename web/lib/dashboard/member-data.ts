import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Meeting } from "@/lib/supabase/types";

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
  result: "present" | "absent" | "upcoming" | "cancelled";
}

type AttendanceQueryRow = {
  id: string;
  status: string;
  checked_in_at: string;
  meetings: Meeting | null;
  profiles: { full_name: string } | null;
};

export async function getMemberDashboardData(memberId: string) {
  const [{ data: meetingsData, error: meetingsError }, { data: attendanceData, error: attendanceError }] =
    await Promise.all([
      supabaseAdmin
        .from("meetings")
        .select("*")
        .in("status", ["upcoming", "attendance_open", "finished", "cancelled"])
        .order("starts_at", { ascending: false }),
      supabaseAdmin
        .from("meeting_attendance")
        .select(
          "id, status, checked_in_at, meetings(*), profiles!meeting_attendance_checked_in_by_fkey(full_name)",
        )
        .eq("member_id", memberId)
        .order("checked_in_at", { ascending: false }),
    ]);

  if (meetingsError) throw meetingsError;
  if (attendanceError) throw attendanceError;

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
    const attendanceClosesAt = new Date(meeting.attendance_closes_at).getTime();
    let result: MemberMeetingResult["result"] = "upcoming";
    if (meeting.status === "cancelled") result = "cancelled";
    else if (ownAttendance?.status === "present") result = "present";
    else if (attendanceClosesAt < now || meeting.status === "finished") result = "absent";
    return { meeting, attendance: ownAttendance, result };
  });

  const eligible = results.filter(
    (item) => item.result === "present" || item.result === "absent",
  );
  const attended = eligible.filter((item) => item.result === "present").length;

  return {
    nextMeeting,
    attendance,
    results,
    summary: {
      attended,
      eligible: eligible.length,
      percentage: eligible.length ? Math.round((attended / eligible.length) * 100) : 0,
    },
  };
}
