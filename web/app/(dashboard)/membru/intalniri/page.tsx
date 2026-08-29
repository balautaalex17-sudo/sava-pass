import type { Metadata } from "next";
import { MemberMeetingHistory } from "@/components/dashboard/MemberMeetingHistory";
import { requirePermission } from "@/lib/dashboard/auth";
import { getMemberDashboardData } from "@/lib/dashboard/member-data";

export const metadata: Metadata = { title: "Întâlniri", robots: { index: false, follow: false } };

export default async function MemberMeetingsPage() {
  const viewer = await requirePermission("view_own_attendance");
  const data = await getMemberDashboardData(viewer.profile.id);
  const upcoming = data.results.filter((row) => row.result === "upcoming").reverse();
  const previous = data.results.filter((row) => row.result !== "upcoming");
  return (
    <div className="dash-page dash-page--member"><header className="dash-page-head"><div><span className="dash-eyebrow">Calendarul clubului</span><h1>Întâlniri</h1><p>Vezi întâlnirile programate și rezultatul întâlnirilor trecute.</p></div></header><section className="dash-section"><div className="dash-section-head"><h2>Urmează</h2></div><MemberMeetingHistory rows={upcoming} emptyMessage="Nu este programată nicio întâlnire." /></section><section className="dash-section"><div className="dash-section-head"><h2>Anterioare</h2></div><MemberMeetingHistory rows={previous} /></section></div>
  );
}
