import type { Metadata } from "next";
import { MemberMeetingHistory } from "@/components/dashboard/MemberMeetingHistory";
import { requirePermission } from "@/lib/dashboard/auth";
import { getMemberDashboardData } from "@/lib/dashboard/member-data";

export const metadata: Metadata = { title: "Prezența mea", robots: { index: false, follow: false } };

export default async function MemberAttendancePage() {
  const viewer = await requirePermission("view_own_attendance");
  const data = await getMemberDashboardData(viewer.profile.id);
  const completed = data.results.filter((row) => row.result === "present" || row.result === "absent");
  return (
    <div className="dash-page dash-page--member"><header className="dash-page-head"><div><span className="dash-eyebrow">Istoricul tău</span><h1>Prezență</h1><p>Doar tu poți vedea acest istoric. O confirmare poate fi corectată numai de un administrator autorizat, cu motiv în audit.</p></div></header><div className="dash-card member-summary-grid"><div><strong>{data.summary.attended}</strong><span>Prezente</span></div><div><strong>{data.summary.eligible - data.summary.attended}</strong><span>Absențe</span></div><div><strong>{data.summary.percentage}%</strong><span>Rată de prezență</span></div></div><section className="dash-section"><div className="dash-section-head"><h2>Toate întâlnirile eligibile</h2></div><MemberMeetingHistory rows={completed} /></section></div>
  );
}
