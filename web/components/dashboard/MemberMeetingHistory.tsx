import type { MemberMeetingResult } from "@/lib/dashboard/member-data";
import { formatDateTime, formatShortDate } from "@/lib/dashboard/format";

const resultLabels: Record<MemberMeetingResult["result"], string> = {
  present: "Prezent",
  absent: "Absent",
  upcoming: "Urmează",
  cancelled: "Anulată",
};

const resultClasses: Record<MemberMeetingResult["result"], string> = {
  present: "dash-status dash-status--success",
  absent: "dash-status dash-status--danger",
  upcoming: "dash-status",
  cancelled: "dash-status dash-status--warning",
};

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
        <div className="member-history-row" key={row.meeting.id}>
          <time dateTime={row.meeting.starts_at}>{formatShortDate(row.meeting.starts_at)}</time>
          <div><strong>{row.meeting.title}</strong><small>{row.meeting.location}</small></div>
          <span className={resultClasses[row.result]}>{resultLabels[row.result]}</span>
          <span>{row.attendance ? formatDateTime(row.attendance.checkedInAt) : "Fără confirmare"}</span>
        </div>
      ))}
    </div>
  );
}
