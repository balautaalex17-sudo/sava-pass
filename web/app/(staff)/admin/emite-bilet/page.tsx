import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { requireStaffRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { IssueTicketForm } from "./IssueTicketForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Emite bilet — SavaPass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function IssueTicketPage() {
  const current = await requireStaffRole(["admin"]);
  if (!current) redirect("/conta");

  const { data: events } = await supabaseAdmin
    .from("events")
    .select("id, title, status")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  const list = (events ?? []).map((e) => ({ id: e.id, title: e.title, status: e.status as string }));
  const defaultEventId = list.find((e) => e.status === "active")?.id ?? list[0]?.id ?? "";
  const defaultEmail = (current as { email?: string | null }).email ?? "";

  return (
    <>
      <StaffHeader
        left={
          <Link href="/admin" className="pressable" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--im-fg-2)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            <ChevronLeft size={16} strokeWidth={1.75} />
            Admin
          </Link>
        }
      />

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "28px 20px 60px" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--im-cyan-light)" }}>
            Bilete
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 26, color: "var(--im-fg)", margin: "6px 0 4px", letterSpacing: "-0.02em" }}>Emite bilet</h1>
          <p style={{ color: "var(--im-fg-2)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
            Creează un bilet valid fără plată — pentru testarea scanării la ușă sau pentru bilete de invitație (comp). Biletul e identic cu unul cumpărat și se scanează la fel.
          </p>
        </div>

        {list.length === 0 ? (
          <p style={{ color: "var(--im-fg-2)", fontSize: 14 }}>Niciun eveniment. Creează unul întâi.</p>
        ) : (
          <IssueTicketForm events={list} defaultEventId={defaultEventId} defaultEmail={defaultEmail} />
        )}
      </main>
    </>
  );
}
