import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { formatDateTime } from "@/lib/dashboard/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RosterTable, type RosterRow } from "./RosterTable";

export const metadata: Metadata = { title: "Prezența întâlnirii", robots: { index: false, follow: false } };

type AttendanceRow = { member_id: string; status: string; checked_in_at: string; profiles: { full_name: string } | null };

export default async function AttendanceRosterPage({ searchParams }: { searchParams: Promise<{ meeting?: string }> }) {
  const viewer = await requirePagePermission("view_attendance_roster");
  const query = await searchParams;
  const { data: meetingsData } = await supabaseAdmin.from("meetings").select("*").order("starts_at", { ascending: false });
  const meetings = meetingsData ?? [];
  const selected = meetings.find((meeting) => meeting.id === query.meeting) ?? meetings[0] ?? null;
  if (!selected) return <div className="dash-page"><header className="dash-page-head"><div><h1>Prezența întâlnirii</h1></div></header><div className="dash-card dash-empty"><strong>Nicio întâlnire</strong>Creează o întâlnire înainte de a deschide rosterul.</div></div>;
  const [{ data: membersData }, { data: attendanceData }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, full_name, grade, avatar_url").eq("membership_status", "active").order("full_name"),
    supabaseAdmin.from("meeting_attendance").select("member_id, status, checked_in_at, profiles!meeting_attendance_checked_in_by_fkey(full_name)").eq("meeting_id", selected.id),
  ]);
  const attendanceMap = new Map(((attendanceData ?? []) as unknown as AttendanceRow[]).map((row) => [row.member_id, row]));
  const rows: RosterRow[] = (membersData ?? []).map((member) => { const attendance = attendanceMap.get(member.id); return { memberId: member.id, name: member.full_name, grade: member.grade, avatarUrl: member.avatar_url, attendanceStatus: attendance?.status ?? null, checkedInAt: attendance?.checked_in_at ?? null, confirmedBy: attendance?.profiles?.full_name ?? null }; });
  const present = rows.filter((row) => row.attendanceStatus === "present").length;
  return <div className="dash-page"><header className="dash-page-head"><div><span className="dash-eyebrow">Listă board</span><h1>Prezența întâlnirii</h1><p>{selected.title} · {formatDateTime(selected.starts_at)} · {selected.location}</p></div><Link className="dash-button dash-button--secondary" href={`/api/board/attendance/export?meeting=${selected.id}`}><Download size={17} /> Exportă CSV</Link></header><form method="get" className="roster-meeting-select"><label htmlFor="roster-meeting">Întâlnire</label><select id="roster-meeting" name="meeting" defaultValue={selected.id}>{meetings.map((meeting) => <option value={meeting.id} key={meeting.id}>{meeting.title}</option>)}</select><button className="dash-button" type="submit">Afișează</button></form><div className="dash-card member-summary-grid roster-summary"><div><strong>{rows.length}</strong><span>Membri activi</span></div><div><strong>{present}</strong><span>Prezenți</span></div><div><strong>{rows.length - present}</strong><span>Neconfirmați</span></div></div><section className="dash-section"><RosterTable rows={rows} meetingId={selected.id} canCorrect={viewer.permissions.has("correct_attendance")} /></section></div>;
}
