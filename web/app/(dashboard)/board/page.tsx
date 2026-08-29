import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  QrCode,
  TicketCheck,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { bucharestDayBounds } from "@/lib/dashboard/day-bounds";
import { formatDateTime } from "@/lib/dashboard/format";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Spațiu board",
  robots: { index: false, follow: false },
};

type RecentAttendance = {
  id: string;
  result: string;
  scanned_at: string;
  meetings: { title: string } | null;
  member: { full_name: string } | null;
  scanner: { full_name: string } | null;
};

export default async function BoardOverviewPage() {
  const viewer = await requirePagePermission("view_board_dashboard");
  const now = new Date().toISOString();
  const day = bucharestDayBounds();
  const [
    { data: activeForm },
    { data: meeting },
    { count: pendingCash },
    { count: ticketCheckins },
    { data: recentData },
  ] = await Promise.all([
    supabaseAdmin
      .from("recruitment_forms")
      .select("id")
      .eq("status", "active")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("meetings")
      .select("*")
      .in("status", ["attendance_open", "upcoming"])
      .gte("ends_at", now)
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "reserved")
      .or(`expires_at.is.null,expires_at.gt.${now}`),
    supabaseAdmin
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("action", "check_in")
      .eq("result", "accepted")
      .gte("created_at", day.start)
      .lt("created_at", day.end),
    viewer.permissions.has("view_scan_audit_log")
      ? supabaseAdmin
          .from("attendance_scans")
          .select("id, result, scanned_at, meetings(title), member:profiles!attendance_scans_member_id_fkey(full_name), scanner:profiles!attendance_scans_scanner_user_id_fkey(full_name)")
          .order("scanned_at", { ascending: false })
          .limit(6)
          : Promise.resolve({ data: [] }),
  ]);

  const [
    presentCountResult,
    completeApplicationsResult,
    incompleteApplicationsResult,
  ] = await Promise.all([
    meeting
      ? supabaseAdmin
          .from("meeting_attendance")
          .select("id", { count: "exact", head: true })
          .eq("meeting_id", meeting.id)
          .eq("status", "present")
      : Promise.resolve({ count: 0 }),
    activeForm
      ? supabaseAdmin
          .from("membership_applications")
          .select("id", { count: "exact", head: true })
          .eq("form_id", activeForm.id)
          .eq("is_complete", true)
      : Promise.resolve({ count: 0 }),
    activeForm
      ? supabaseAdmin
          .from("membership_applications")
          .select("id", { count: "exact", head: true })
          .eq("form_id", activeForm.id)
          .eq("is_complete", false)
      : Promise.resolve({ count: 0 }),
  ]);
  const { count: presentCount } = presentCountResult;
  const { count: completeApplications } = completeApplicationsResult;
  const { count: incompleteApplications } = incompleteApplicationsResult;
  const recent = (recentData ?? []) as unknown as RecentAttendance[];
  const nowMs = new Date(now).getTime();
  const attendanceOpen = Boolean(
    meeting
      && meeting.status === "attendance_open"
      && new Date(meeting.attendance_opens_at).getTime() <= nowMs
      && new Date(meeting.attendance_closes_at).getTime() >= nowMs,
  );

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <span className="dash-eyebrow">Panou board</span>
          <h1>De făcut acum</h1>
          <p>Vezi întâi ce cere atenție, apoi pornește direct fluxul de care ai nevoie.</p>
        </div>
      </header>

      <section className="dash-card board-next-meeting" aria-labelledby="board-meeting-title">
        <div>
          <span className="dash-eyebrow">
            <CalendarDays size={15} /> Întâlnire activă sau următoare
          </span>
          {meeting ? (
            <>
              <h2 id="board-meeting-title">{meeting.title}</h2>
              <p>{formatDateTime(meeting.starts_at)} · {meeting.location}</p>
              <span className={attendanceOpen ? "dash-status dash-status--success" : "dash-status"}>
                {attendanceOpen ? "Prezență deschisă" : "Prezență închisă"}
              </span>
            </>
          ) : (
            <>
              <h2 id="board-meeting-title">Nicio întâlnire programată</h2>
              <p>Creează o întâlnire pentru a porni fluxul de prezență.</p>
              {viewer.permissions.has("manage_meetings") && (
                <Link className="dash-button dash-button--secondary" href="/board/intalniri">
                  <CalendarDays size={17} /> Deschide întâlnirile
                </Link>
              )}
            </>
          )}
        </div>
        {meeting && (
          <div className="board-meeting-count">
            <strong>{presentCount ?? 0}</strong>
            <span>prezenți</span>
            {attendanceOpen && viewer.permissions.has("scan_meeting_attendance") && (
              <Link className="dash-button" href={`/board/scaneaza-prezenta?meeting=${meeting.id}`}>
                <QrCode size={17} /> Scanează
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="board-operational-grid" aria-label="Indicatori care cer atenție">
        <BoardMetric
          icon={ClipboardList}
          value={pendingCash ?? 0}
          label="Plăți cash în așteptare"
          href={viewer.permissions.has("scan_event_tickets") ? "/board/scaneaza-bilete" : undefined}
          attention={(pendingCash ?? 0) > 0}
        />
        <BoardMetric
          icon={UserRoundCheck}
          value={completeApplications ?? 0}
          label="Candidați cu formular complet"
          href={viewer.permissions.has("view_recruitment_signups") ? "/board/interviuri?view=raspunsuri" : undefined}
        />
        <BoardMetric
          icon={UserRoundCheck}
          value={incompleteApplications ?? 0}
          label="Candidați cu date lipsă"
          href={viewer.permissions.has("view_recruitment_signups") ? "/board/interviuri?view=raspunsuri" : undefined}
        />
        <BoardMetric
          icon={TicketCheck}
          value={ticketCheckins ?? 0}
          label="Intrări confirmate azi"
          href={viewer.permissions.has("view_scan_audit_log") ? "/board/istoric-scanari" : undefined}
        />
      </section>

      <section className="board-actions" aria-labelledby="board-actions-title">
        <h2 id="board-actions-title">Acțiuni rapide</h2>
        <div>
          {viewer.permissions.has("scan_meeting_attendance") && (
            <Link className="dash-button" href="/board/scaneaza-prezenta">
              <QrCode size={17} /> Scanează prezența
            </Link>
          )}
          {viewer.permissions.has("scan_event_tickets") && (
            <Link className="dash-button dash-button--secondary" href="/board/scaneaza-bilete">
              <TicketCheck size={17} /> Scanează bilete
            </Link>
          )}
          {viewer.permissions.has("view_recruitment_signups") && (
            <Link className="dash-button dash-button--secondary" href="/board/interviuri">
              <ClipboardList size={17} /> Formulare
            </Link>
          )}
        </div>
      </section>

      {viewer.permissions.has("view_scan_audit_log") && (
        <section className="dash-section" aria-labelledby="board-activity-title">
          <div className="dash-section-head">
            <h2 id="board-activity-title">Activitate recentă</h2>
            <Link href="/board/istoric-scanari">Vezi istoricul</Link>
          </div>
          <div className="dash-card board-recent-scans">
            {recent.length ? recent.map((scan) => (
              <div key={scan.id}>
                <span className={`scanner-dot scanner-dot--${scan.result === "accepted" ? "success" : scan.result === "already_present" ? "warning" : "danger"}`} />
                <div>
                  <strong>{scan.member?.full_name ?? "Cod necunoscut"}</strong>
                  <span>{scan.meetings?.title ?? "Întâlnire"} · {scan.scanner?.full_name ?? "Board"}</span>
                </div>
                <time>{formatDateTime(scan.scanned_at)}</time>
              </div>
            )) : (
              <div className="dash-empty">
                <strong>Nicio activitate recentă</strong>
                Scanările de prezență vor apărea aici.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function BoardMetric({
  icon: Icon,
  value,
  label,
  href,
  attention = false,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  href?: string;
  attention?: boolean;
}) {
  const content = (
    <>
      <Icon size={20} />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {href && <small>Deschide</small>}
      </div>
    </>
  );

  return href ? (
    <Link
      className="dash-card board-metric"
      href={href}
      data-attention={attention ? "true" : undefined}
    >
      {content}
    </Link>
  ) : (
    <article className="dash-card board-metric" data-attention={attention ? "true" : undefined}>
      {content}
    </article>
  );
}
