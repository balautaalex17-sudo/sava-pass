import type { Metadata } from "next";
import Link from "next/link";
import { OperationalScanner } from "@/components/dashboard/OperationalScanner";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Scanează prezența", robots: { index: false, follow: false } };

export default async function AttendanceScannerPage({ searchParams }: { searchParams: Promise<{ meeting?: string }> }) {
  const viewer = await requirePagePermission("scan_meeting_attendance");
  const query = await searchParams;
  const { data } = await supabaseAdmin.from("meetings").select("id, title, status, starts_at, attendance_opens_at, attendance_closes_at").in("status", ["upcoming", "attendance_open"]).order("starts_at");
  const meetings = data ?? [];
  const selected = meetings.find((meeting) => meeting.id === query.meeting) ?? null;
  // The atomic database function performs the authoritative timestamp check.
  // This page only uses the board-controlled status as an early UX hint.
  const now = new Date(new Date().toISOString()).getTime();
  const isOpen = selected?.status === "attendance_open"
    && new Date(selected.attendance_opens_at).getTime() <= now
    && new Date(selected.attendance_closes_at).getTime() >= now;

  return (
    <div className="dash-page"><header className="dash-page-head"><div><span className="dash-eyebrow">Spațiu board</span><h1>Scanează prezența</h1><p>Selectează întâlnirea înainte de a porni camera. Prezența se leagă doar de această selecție validată pe server.</p></div>{viewer.permissions.has("manage_meetings") && <Link href="/board/intalniri" className="dash-button dash-button--secondary">Administrează întâlniri</Link>}</header>
      {!selected ? <section className="dash-card dash-form"><form method="get"><div className="dash-field"><label htmlFor="meeting-select">Întâlnire activă</label><select id="meeting-select" name="meeting" defaultValue="" required><option value="" disabled>Alege întâlnirea</option>{meetings.map((meeting) => <option key={meeting.id} value={meeting.id}>{meeting.title} · {meeting.status === "attendance_open" ? "status deschis" : "urmează"}</option>)}</select></div><div style={{ marginTop: 14 }}><button className="dash-button" type="submit" disabled={!meetings.length}>Continuă la scanare</button></div></form>{!meetings.length && <p className="dash-form-message dash-form-message--error">Nu există întâlniri viitoare sau cu prezența deschisă.</p>}</section>
      : !isOpen ? <section className="dash-card dash-empty"><strong>Prezența nu este deschisă</strong>Fereastra acestei întâlniri este închisă. <Link href="/board/scaneaza-prezenta">Alege altă întâlnire</Link>.</section>
      : <OperationalScanner mode="attendance" meeting={{ id: selected.id, title: selected.title }} />}
    </div>
  );
}
