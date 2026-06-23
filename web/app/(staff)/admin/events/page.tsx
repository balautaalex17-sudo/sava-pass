import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, ChevronLeft, Eye, Pencil } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { getAllEventsForAdmin, priceRon } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaffRole } from "@/lib/roles";
import { StatusControl } from "./StatusControl";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Evenimente — SavaPass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const statusTone = {
  active: "success",
  draft: "warning",
  past: "used",
} as const;

export default async function EventsPage() {
  const current = await requireStaffRole(["admin"]);
  if (!current) redirect("/conta");

  const events = await getAllEventsForAdmin();
  const { data: stats } = await supabaseAdmin.from("event_stats").select("*");
  const statsByEvent = new Map((stats ?? []).map((row) => [row.event_id, row]));
  const activeEvent = events.find((event) => event.status === "active") ?? null;

  return (
    <>
      <StaffHeader
        left={
          <Link href="/admin" className="pressable" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--im-fg-2)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            <ChevronLeft size={16} strokeWidth={1.75} />
            Admin
          </Link>
        }
        right={
          <Link href="/admin/events/new" className="pressable hover-dim" style={topButtonStyle}>
            <CalendarPlus size={15} strokeWidth={1.75} />
            Nou
          </Link>
        }
      />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px 60px" }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontWeight: 800, fontSize: 26, color: "var(--im-fg)", margin: "0 0 4px" }}>Toate evenimentele</h1>
          <p style={{ color: "var(--im-fg-2)", fontSize: 13, margin: 0 }}>Ciorne, evenimentul activ și arhiva.</p>
        </div>

        <div style={{ background: "var(--im-ink-2)", border: "1px solid var(--im-line)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--im-shadow)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--im-ink-3)", borderBottom: "1px solid var(--im-line)" }}>
                {["Eveniment", "Status", "Vândute", "Preț", ""].map((h) => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, color: "var(--im-fg-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const sold = statsByEvent.get(event.id)?.sold ?? 0;
                const soldPct = event.capacity > 0 ? Math.round((sold / event.capacity) * 100) : 0;
                return (
                  <tr key={event.id} className="row-hover" style={{ borderBottom: "1px solid var(--im-line-soft)" }}>
                    <td style={{ padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: event.accent ?? "var(--brand-cyan)", flexShrink: 0, display: "inline-block" }} />
                        <div style={{ fontWeight: 800, color: "var(--im-fg)", fontSize: 14 }}>{event.title}</div>
                      </div>
                      <div style={{ color: "var(--im-fg-2)", fontSize: 12, marginTop: 2, paddingLeft: 18 }}>{event.date_label} · {event.venue}</div>
                    </td>
                    <td style={{ padding: 14 }}><Chip size="sm" tone={statusTone[event.status]} dot>{event.status}</Chip></td>
                    <td style={{ padding: 14 }}>
                      <div style={{ color: "var(--im-fg)", fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>{sold} / {event.capacity}</div>
                      <div style={{ marginTop: 4, width: 40, height: 3, borderRadius: "var(--radius-pill)", background: "var(--im-ink-3)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "var(--radius-pill)", background: "var(--brand-cyan)", width: `${Math.min(100, soldPct)}%`, transition: "width var(--dur-slow) var(--ease-out)" }} />
                      </div>
                    </td>
                    <td style={{ padding: 14, color: "var(--im-fg-2)", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{priceRon(event.price_bani)} RON</td>
                    <td style={{ padding: 14 }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                        <Link href={`/${event.slug}`} className="pressable" style={iconLinkStyle} title="Preview"><Eye size={15} strokeWidth={1.75} /></Link>
                        <Link href={`/admin/events/${event.id}`} className="pressable" style={iconLinkStyle} title="Editează"><Pencil size={15} strokeWidth={1.75} /></Link>
                        {event.status !== "active" && (
                          <StatusControl
                            id={event.id}
                            status="active"
                            label="Activează"
                            swapEventTitle={activeEvent && activeEvent.id !== event.id ? activeEvent.title : null}
                          />
                        )}
                        {event.status === "active" && <StatusControl id={event.id} status="past" label="Arhivează" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

const topButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "var(--im-grad)", color: "white", textDecoration: "none", borderRadius: 10, padding: "8px 12px", fontWeight: 800, fontSize: 13, boxShadow: "var(--im-glow)" };
const iconLinkStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, border: "1px solid var(--im-line)", borderRadius: 10, color: "var(--im-fg)", background: "var(--im-ink-3)" };
