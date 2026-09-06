import type { Metadata } from "next";
import { MemberMeetingHistory } from "@/components/dashboard/MemberMeetingHistory";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { getMemberDashboardData } from "@/lib/dashboard/member-data";

export const metadata: Metadata = { title: "Prezența mea", robots: { index: false, follow: false } };

export default async function MemberAttendancePage() {
  const viewer = await requirePagePermission("view_own_attendance");
  const data = await getMemberDashboardData(viewer.profile.id);
  const completed = data.results.filter((row) => ["present", "absent", "excused"].includes(row.result));
  return (
    <div className="dash-page dash-page--member">
      <header className="dash-page-head"><div><span className="dash-eyebrow">Istoricul tău</span><h1>Prezență</h1>
        <p>Pentru o absență, poți trimite o cerere de motivare către board. Vei vedea aici decizia și răspunsul.</p>
      </div></header>
      <div className="dash-card member-summary-grid">
        <div><strong>{data.summary.attended}</strong><span>Prezențe</span></div>
        <div><strong>{data.summary.eligible - data.summary.attended}</strong><span>Absențe, dintre care {data.summary.excused} motivate</span></div>
        <div><strong>{data.summary.percentage}%</strong><span>Rată de prezență efectivă</span></div>
      </div>
      <section className="dash-section"><div className="dash-section-head"><h2>Toate ședințele eligibile</h2></div><MemberMeetingHistory rows={completed} /></section>
    </div>
  );
}
