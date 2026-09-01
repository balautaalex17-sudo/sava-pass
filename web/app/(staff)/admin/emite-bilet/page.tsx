import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { isEventEnded } from "@/lib/event-lifecycle";
import { requireStaffRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { IssueTicketForm } from "./IssueTicketForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Emite bilet — SavaPass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function IssueTicketPage() {
  const current = await requireStaffRole(["admin"]);
  if (!current) redirect("/conta");

  const [{ data: events }, { data: rawTicketTypes }] = await Promise.all([
    supabaseAdmin.from("events").select("id, title, status, ends_at, manually_ended_at").order("starts_at", { ascending: true }),
    supabaseAdmin.from("event_ticket_types").select("id, event_id, name, events(title)").neq("status", "hidden").order("sort"),
  ]);

  const activeEvents = (events ?? []).filter((event) => event.status === "active" && !isEventEnded(event));
  const activeEventIds = new Set(activeEvents.map((event) => event.id));
  const list = activeEvents.map((event) => ({ id: event.id, title: event.title, status: "active" }));
  const defaultEventId = list[0]?.id ?? "";
  const defaultEmail = current.user.email ?? "";
  const ticketTypes = (rawTicketTypes ?? []).filter((type) => activeEventIds.has(type.event_id)).map((type) => ({ id: type.id, eventId: type.event_id, label: `${type.events?.title ?? "Eveniment"} · ${type.name}` }));

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
            Creează un bilet gratuit de invitație sau test. Este înregistrat explicit ca bilet comp, cu valoare zero și acces confirmat, apoi se scanează la fel ca un bilet plătit.
          </p>
        </div>

        {list.length === 0 ? (
          <p style={{ color: "var(--im-fg-2)", fontSize: 14 }}>Niciun eveniment. Creează unul întâi.</p>
        ) : (
          <IssueTicketForm events={list} ticketTypes={ticketTypes} defaultEventId={defaultEventId} defaultEmail={defaultEmail} />
        )}
      </main>
    </>
  );
}
