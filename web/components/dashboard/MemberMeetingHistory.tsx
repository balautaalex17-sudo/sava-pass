import type { MemberMeetingResult } from "@/lib/dashboard/member-data";
import { formatDateTime, formatShortDate } from "@/lib/dashboard/format";
import { ATTENDANCE_LABELS, attendanceClass } from "@/lib/dashboard/attendance";
import { AbsenceRequestControl } from "./AbsenceRequestControl";

export function MemberMeetingHistory({
  rows,
  emptyMessage = "Nu există încă întâlniri în istoric.",
}: {
  rows: MemberMeetingResult[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <div className="dash-card dash-empty"><strong>Istoric gol</strong>{emptyMessage}</div>;
  }

  return (
    <div className="dash-card member-history">
      {rows.map((row) => (
        <div className="member-history-entry" key={row.meeting.id}>
        <div className="member-history-row">
          <time dateTime={row.meeting.starts_at}>{formatShortDate(row.meeting.starts_at)}</time>
          <div><strong>{row.meeting.title}</strong><small>{row.meeting.location}</small></div>
          <span className={attendanceClass(row.result)}>{row.result === "upcoming" ? "Urmează" : ATTENDANCE_LABELS[row.result]}</span>
          <span>{row.attendance?.status === "present" ? formatDateTime(row.attendance.checkedInAt) : "Fără confirmare"}</span>
        </div>
        {(row.result === "absent" || row.request) && <div className="member-absence-request">
          <AbsenceRequestControl meetingId={row.meeting.id} request={row.request} canSubmit={row.result === "absent"} />
        </div>}
        </div>
      ))}
    </div>
  );
}
