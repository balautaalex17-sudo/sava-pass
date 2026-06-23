import Link from "next/link";
import { redirect } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { GearWatermark } from "@/components/ui/GearWatermark";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { getAllEventsForAdmin, priceRon } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaffRole } from "@/lib/roles";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Statistici - SavaPass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const current = await requireStaffRole(["admin", "statistici"]);
  if (!current) redirect("/conta");

  const [events, statsResult, ordersResult] = await Promise.all([
    getAllEventsForAdmin(),
    supabaseAdmin.from("event_stats").select("*"),
    supabaseAdmin.from("orders").select("event_id, amount_bani").eq("status", "paid"),
  ]);

  const active = events.find((event) => event.status === "active") ?? null;
  const statsByEvent = new Map((statsResult.data ?? []).map((row) => [row.event_id, row]));
  const revenueByEvent = new Map<string, number>();
  for (const order of ordersResult.data ?? []) {
    revenueByEvent.set(order.event_id, (revenueByEvent.get(order.event_id) ?? 0) + order.amount_bani);
  }

  const activeStats = active ? statsByEvent.get(active.id) : null;
  const sold = activeStats?.sold ?? 0;
  const checkedIn = activeStats?.checked_in ?? 0;
  const revenue = active ? revenueByEvent.get(active.id) ?? 0 : 0;
  const soldPct = active && active.capacity > 0 ? Math.round((sold / active.capacity) * 100) : 0;
  const checkPct = sold > 0 ? Math.round((checkedIn / sold) * 100) : 0;

  return (
    <>
      <StaffHeader
        right={
          <Link href="/statistici" className="pressable refresh-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--im-fg)", textDecoration: "none", border: "1px solid var(--im-line)", borderRadius: 10, padding: "8px 12px", fontWeight: 800, fontSize: 13, background: "var(--im-ink-3)" }}>
            <RefreshCcw size={14} strokeWidth={1.75} />
            Refresh
          </Link>
        }
      />

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "30px 20px 64px" }}>
        <div style={{ marginBottom: 24, display: "flex", alignItems: "end", justifyContent: "space-between", gap: 18 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 28, color: "var(--im-fg)", margin: "0 0 5px", letterSpacing: "-0.03em" }}>
              {active?.title ?? "Niciun eveniment activ"}
            </h1>
            {active && <p style={{ color: "var(--im-fg-2)", fontSize: 13, margin: 0 }}>{active.date_label} · {active.venue}</p>}
          </div>
          <p style={{ color: "var(--im-fg-2)", fontSize: 13, margin: 0, textAlign: "right" }}>
            Raport actualizat la cerere
          </p>
        </div>

        {active ? (
          <section className="anim-rise" style={{ background: "var(--im-ink-2)", border: "1px solid var(--im-line)", borderRadius: 20, padding: 24, boxShadow: "var(--im-shadow)", marginBottom: 26 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 0 }}>
              <ReportCell label="Vândute" value={`${sold} / ${active.capacity}`} sub={`${soldPct}%`} barValue={soldPct} barColor="var(--brand-cyan)" />
              <ReportCell label="Check-in" value={String(checkedIn)} sub={`${checkPct}%`} barValue={checkPct} barColor="var(--success)" />
              <ReportCell label="Locuri rămase" value={String(Math.max(0, active.capacity - sold))} sub="disponibile" />
              <ReportCell label="Venituri" value={`${priceRon(revenue)} lei`} sub="plăți confirmate" mono />
            </div>
          </section>
        ) : (
          <section style={{ position: "relative", minHeight: 260, background: "var(--im-ink-2)", border: "1px solid var(--im-line)", borderRadius: 20, display: "grid", placeItems: "center", overflow: "hidden", marginBottom: 26 }}>
            <GearWatermark />
            <p style={{ position: "relative", color: "var(--im-fg-2)", fontSize: 14, margin: 0 }}>Activează un eveniment pentru a vedea raportul.</p>
          </section>
        )}

        <div style={{ background: "var(--im-ink-2)", border: "1px solid var(--im-line)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--im-shadow)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--im-ink-3)", borderBottom: "1px solid var(--im-line)" }}>
                {["Eveniment", "Status", "Vândute", "Check-in", "Venituri"].map((h) => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, color: "var(--im-fg-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => {
                const row = statsByEvent.get(event.id);
                const eventSold = row?.sold ?? 0;
                const eventPct = event.capacity > 0 ? Math.round((eventSold / event.capacity) * 100) : 0;
                return (
                  <tr key={event.id} className="row-hover anim-rise-fast" style={{ borderBottom: "1px solid var(--im-line-soft)", animationDelay: `${Math.min(index, 6) * 60}ms` }}>
                    <td style={{ padding: 14 }}>
                      <div style={{ color: "var(--im-fg)", fontSize: 14, fontWeight: 800 }}>{event.title}</div>
                      <div style={{ color: "var(--im-fg-2)", fontSize: 12, marginTop: 2 }}>{event.date_label}</div>
                    </td>
                    <td style={{ padding: 14 }}><Chip size="sm" tone={event.status === "active" ? "success" : event.status === "draft" ? "warning" : "used"} dot>{event.status}</Chip></td>
                    <td style={{ padding: 14 }}>
                      <div style={{ color: "var(--im-fg)", fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>{eventSold} / {event.capacity}</div>
                      <ProgressBar value={eventPct} color="var(--brand-cyan)" small />
                    </td>
                    <td style={{ padding: 14, color: "var(--im-fg)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{row?.checked_in ?? 0}</td>
                    <td style={{ padding: 14, color: "var(--im-fg-2)", fontSize: 13, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{priceRon(revenueByEvent.get(event.id) ?? 0)} lei</td>
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

function ReportCell({ label, value, sub, barValue, barColor, mono }: { label: string; value: string; sub: string; barValue?: number; barColor?: string; mono?: boolean }) {
  return (
    <div style={{ padding: "0 22px", borderLeft: label === "Vândute" ? "none" : "1px solid var(--im-line)" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--im-fg-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 25, fontWeight: 800, color: "var(--im-fg)", fontVariantNumeric: "tabular-nums", fontFamily: mono ? "var(--font-mono)" : undefined }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--im-fg-2)", marginTop: 4 }}>{sub}</div>
      {typeof barValue === "number" && <ProgressBar value={barValue} color={barColor ?? "var(--brand-cyan)"} />}
    </div>
  );
}

function ProgressBar({ value, color, small }: { value: number; color: string; small?: boolean }) {
  return (
    <div style={{ marginTop: small ? 5 : 12, width: small ? 44 : "100%", height: small ? 3 : 4, borderRadius: "var(--radius-pill)", background: "var(--im-ink-3)", overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: "var(--radius-pill)", background: color, width: `${Math.max(0, Math.min(100, value))}%`, transition: "width var(--dur-slow) var(--ease-out)" }} />
    </div>
  );
}
