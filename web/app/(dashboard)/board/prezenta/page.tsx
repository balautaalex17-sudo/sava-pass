import type { Metadata } from "next";
import { PortalLink as Link } from "@/components/dashboard/PortalLink";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { formatDateTime } from "@/lib/dashboard/format";
import { attendanceResult, canReviewAbsences } from "@/lib/dashboard/attendance";
import { getAttendanceRosterData, getAbsenceInboxData } from "@/lib/dashboard/attendance-data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AbsenceRequestControl } from "@/components/dashboard/AbsenceRequestControl";
import { RosterTable } from "./RosterTable";
import { PortalFilterForm } from "@/components/dashboard/PortalFilterForm";

export const metadata: Metadata = { title: "Tabel de prezență", robots: { index: false, follow: false } };

export default async function AttendanceRosterPage({ searchParams }: { searchParams: Promise<{ view?: string; meeting?: string; member?: string }> }) {
  const viewer = await requirePagePermission("view_attendance_roster");
  const query = await searchParams;
  const canReview = canReviewAbsences(viewer.profile.role);
  const view = query.view === "requests" && canReview ? "requests" : query.view === "member" ? "member" : "meeting";
  // The badge and the selected table are independent once access is checked.
  const [pendingCount, content] = await Promise.all([canReview
    ? supabaseAdmin.from("absence_requests").select("id", { count: "exact", head: true }).eq("status", "pending")
    : { count: 0, error: null },
    view === "requests"
      ? RequestInbox({ viewerId: viewer.profile.id })
      : AttendanceView({ query: { ...query, view }, canReview, canCorrect: viewer.permissions.has("correct_attendance"), viewerId: viewer.profile.id }),
  ]);
  if (pendingCount.error) throw pendingCount.error;

  return <div className="dash-page dash-page--wide">
    <header className="dash-page-head"><div><span className="dash-eyebrow">Board</span><h1>Tabel de prezență</h1><p>Vezi prezența pe persoană sau pe ședință și urmărește motivările absențelor.</p></div></header>
    <nav className="attendance-views" aria-label="Vizualizare prezență">
      <Link href="/board/prezenta" aria-current={view === "meeting" ? "page" : undefined}>Pe ședință</Link>
      <Link href="/board/prezenta?view=member" aria-current={view === "member" ? "page" : undefined}>Pe persoană</Link>
      {canReview && <Link href="/board/prezenta?view=requests" aria-current={view === "requests" ? "page" : undefined}>Cereri de motivare ({pendingCount.count ?? 0})</Link>}
    </nav>
    {content}
  </div>;
}

async function AttendanceView({ query, canReview, canCorrect, viewerId }: {
  query: { view: "member" | "meeting"; meeting?: string; member?: string };
  canReview: boolean; canCorrect: boolean; viewerId: string;
}) {
  const data = await getAttendanceRosterData(query, canReview);
  const selectedId = data.view === "member" ? data.selectedMember?.id : data.selectedMeeting?.id;
  if (!data.meetings.length) return <div className="dash-card dash-empty"><strong>Nicio ședință</strong>Creează o ședință pentru a vedea tabelul de prezență.</div>;
  if (!data.members.length) return <div className="dash-card dash-empty"><strong>Niciun membru activ</strong>Membrii activi vor apărea aici.</div>;
  const present = data.rows.filter((row) => row.result === "present").length;
  const absent = data.rows.filter((row) => row.result === "absent").length;
  const excused = data.rows.filter((row) => row.result === "excused").length;
  return <>
    <PortalFilterForm action="/board/prezenta" className="roster-meeting-select" submitLabel="Afișează">
      <input type="hidden" name="view" value={data.view} />
      <label htmlFor="attendance-selection">{data.view === "member" ? "Persoană" : "Ședință"}
        <select id="attendance-selection" name={data.view === "member" ? "member" : "meeting"} defaultValue={selectedId} key={`${data.view}:${selectedId}`}>
          {data.view === "member"
            ? data.members.map((member) => <option value={member.id} key={member.id}>{member.full_name}{member.grade ? ` · ${member.grade}` : ""}</option>)
            : data.meetings.map((meeting) => <option value={meeting.id} key={meeting.id}>{meeting.title} · {formatDateTime(meeting.starts_at)}</option>)}
        </select>
      </label>
    </PortalFilterForm>
    <div className="dash-card member-summary-grid roster-summary">
      <div><strong>{present}</strong><span>Prezențe</span></div>
      <div><strong>{absent}</strong><span>Absențe nemotivate</span></div>
      <div><strong>{excused}</strong><span>Absențe motivate</span></div>
    </div>
    <section className="dash-section">
      <RosterTable key={`${data.view}:${selectedId}`} rows={data.rows} view={data.view} selectedId={selectedId ?? ""} canCorrect={canCorrect} canReview={canReview} viewerId={viewerId} />
    </section>
  </>;
}

async function RequestInbox({ viewerId }: { viewerId: string }) {
  const { requests, present, now } = await getAbsenceInboxData();
  if (!requests.length) return <div className="dash-card dash-empty"><strong>Nicio cerere în așteptare</strong>Cererile soluționate rămân în tabelul persoanei și al ședinței.</div>;
  return <section className="absence-inbox" aria-label="Cereri în așteptare">
    {requests.map(({ meetings: meeting, profiles: member, ...request }) => {
      const isAbsent = meeting && attendanceResult(meeting, present.has(`${request.meeting_id}:${request.member_id}`) ? "present" : null, request.status, now) === "absent";
      return (
      <article className="dash-card absence-inbox-card" key={request.id}>
        <header><h2>{member?.full_name ?? "Membru"}</h2><p>{meeting?.title ?? "Ședință"}{meeting && ` · ${formatDateTime(meeting.starts_at)}`}</p></header>
        <p className="absence-reason">{request.reason}</p>
        {!isAbsent && <p className="dash-form-message">Prezența sau ședința s-a schimbat. Cererea poate fi soluționată doar dacă există o absență.</p>}
        <AbsenceRequestControl meetingId={request.meeting_id} request={request} canReview={Boolean(isAbsent)} isOwn={request.member_id === viewerId} />
      </article>);
    })}
  </section>;
}
