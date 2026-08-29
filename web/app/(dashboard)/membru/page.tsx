import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock3, MapPin, QrCode } from "lucide-react";
import { MemberMeetingHistory } from "@/components/dashboard/MemberMeetingHistory";
import { requirePermission } from "@/lib/dashboard/auth";
import { formatDateTime } from "@/lib/dashboard/format";
import { getMemberDashboardData } from "@/lib/dashboard/member-data";
import { MEETING_STATUS_LABELS } from "@/lib/dashboard/meeting-constants";

export const metadata: Metadata = { title: "Dashboard membru", robots: { index: false, follow: false } };

export default async function MemberOverviewPage({ searchParams }: { searchParams: Promise<{ acces?: string }> }) {
  const viewer = await requirePermission("view_member_dashboard");
  const query = await searchParams;
  const data = await getMemberDashboardData(viewer.profile.id);
  const firstName = viewer.profile.full_name.split(/\s+/)[0];

  return (
    <div className="dash-page dash-page--member">
      <header className="dash-page-head"><div><span className="dash-eyebrow">Spațiul membrului</span><h1>Salut, {firstName}.</h1><p>Următoarea întâlnire, codul tău QR și prezența ta, într-un singur loc.</p></div></header>

      {query.acces === "refuzat" && (
        <p className="dash-access-notice" role="status">
          Rolul tău nu are acces la acea pagină. Ai fost trimis înapoi în spațiul tău.
        </p>
      )}

      {data.nextMeeting ? (
        <section className="dash-card member-next" aria-labelledby="next-meeting-title">
          <div><span className="dash-eyebrow"><CalendarDays size={15} /> Următoarea întâlnire</span><h2 id="next-meeting-title">{data.nextMeeting.title}</h2><div className="member-next-meta"><span><Clock3 size={15} /> {formatDateTime(data.nextMeeting.starts_at)}</span><span><MapPin size={15} /> {data.nextMeeting.location}</span><span className={data.nextMeeting.status === "attendance_open" ? "dash-status dash-status--success" : "dash-status"}>{MEETING_STATUS_LABELS[data.nextMeeting.status] ?? data.nextMeeting.status}</span></div></div>
          <div className="member-next-actions"><Link className="dash-button" href="/membru/qr"><QrCode size={17} /> Deschide codul QR</Link></div>
        </section>
      ) : (
        <section className="dash-card dash-empty"><strong>Nicio întâlnire programată</strong>Când board-ul publică următoarea întâlnire, o vei vedea aici.</section>
      )}

      <section className="dash-section" aria-labelledby="summary-title">
        <div className="dash-section-head"><h2 id="summary-title">Rezumat prezență</h2><Link href="/membru/prezenta">Vezi tot istoricul</Link></div>
        <div className="dash-card member-summary-grid"><div><strong>{data.summary.attended}</strong><span>Întâlniri bifate</span></div><div><strong>{data.summary.eligible}</strong><span>Întâlniri eligibile</span></div><div><strong>{data.summary.percentage}%</strong><span>Rată de prezență</span></div></div>
      </section>

      <section className="dash-section" aria-labelledby="recent-title"><div className="dash-section-head"><h2 id="recent-title">Întâlniri recente</h2><Link href="/membru/intalniri">Toate întâlnirile</Link></div><MemberMeetingHistory rows={data.results.filter((row) => row.result !== "upcoming").slice(0, 5)} /></section>
    </div>
  );
}
