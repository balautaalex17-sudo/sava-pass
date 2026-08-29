import type { Metadata } from "next";
import { MeetingManager } from "./MeetingManager";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Administrare întâlniri", robots: { index: false, follow: false } };

export default async function MeetingsAdminPage() {
  await requirePagePermission("manage_meetings");
  const { data } = await supabaseAdmin.from("meetings").select("*").order("starts_at", { ascending: false });
  return <div className="dash-page"><header className="dash-page-head"><div><span className="dash-eyebrow">Administrare</span><h1>Întâlniri</h1><p>Configurează intervalul în care board-ul poate scana prezența. Statusul „Prezență deschisă” trebuie ales explicit.</p></div></header><MeetingManager meetings={data ?? []} referenceNow={new Date().toISOString()} /></div>;
}
