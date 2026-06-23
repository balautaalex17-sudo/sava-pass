import { supabaseAdmin } from "@/lib/supabase/admin";
import { priceRon } from "@/lib/events";
import { AdminClient } from "./AdminClient";
import { Chip } from "@/components/ui/Chip";
import { GearWatermark } from "@/components/ui/GearWatermark";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { requireStaffRole } from "@/lib/roles";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, CalendarDays, QrCode, Users } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Admin — SavaPass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const current = await requireStaffRole(["admin"]);
  if (!current) redirect("/conta");

  // Get active event
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, title, capacity, price_bani, status, date_label, venue")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!event) {
    return (
      <>
        <StaffHeader
          left={null}
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <HeaderLink href="/admin/events" icon={<CalendarDays size={14} strokeWidth={1.75} />} label="Evenimente" />
              <HeaderLink href="/admin/team" icon={<Users size={14} strokeWidth={1.75} />} label="Echipă" />
              <HeaderLink href="/statistici" icon={<BarChart3 size={14} strokeWidth={1.75} />} label="Statistici" />
              <HeaderLink href="/scanner" icon={<QrCode size={14} strokeWidth={1.75} />} label="Scanner" primary />
            </div>
          }
        />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 57px)", padding: 40 }}>
          <GearWatermark />
          <div style={{ position: "relative", textAlign: "center", display: "grid", gap: 16 }}>
            <p style={{ color: "var(--slate-500)", fontSize: 15, margin: 0 }}>Niciun eveniment activ.</p>
            <Link
              href="/admin/events/new"
              className="btn btn--navy pressable hover-dim"
              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              Creează eveniment
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Stats
  const { data: stats } = await supabaseAdmin
    .from("event_stats")
    .select("sold, checked_in")
    .eq("event_id", event.id)
    .maybeSingle();

  const sold = stats?.sold ?? 0;
  const checkedIn = stats?.checked_in ?? 0;
  const { data: paidOrders } = await supabaseAdmin
    .from("orders")
    .select("amount_bani")
    .eq("event_id", event.id)
    .eq("status", "paid");

  const revenue = (paidOrders ?? []).reduce((sum, order) => sum + order.amount_bani, 0);

  // Attendees list
  const { data: tickets } = await supabaseAdmin
    .from("tickets")
    .select("id, code, holder_name, holder_email, status, issued_at, checked_in_at")
    .eq("event_id", event.id)
    .order("issued_at", { ascending: false });

  // Recent scans (last 50)
  const { data: recentScans } = await supabaseAdmin
    .from("scans")
    .select("id, result, created_at, ticket_id, tickets(code, holder_name)")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const csvRows = [
    ["Cod", "Nume", "Email", "Status", "Emis la", "Check-in la"],
    ...(tickets ?? []).map(t => [
      t.code,
      t.holder_name,
      t.holder_email,
      t.status,
      new Date(t.issued_at).toLocaleString("ro-RO"),
      t.checked_in_at ? new Date(t.checked_in_at).toLocaleString("ro-RO") : "",
    ]),
  ];

  type ScanWithTicket = {
    tickets?: { code: string | null; holder_name: string | null } | null;
  };

  const soldPct = event.capacity > 0 ? Math.round((sold / event.capacity) * 100) : 0;
  const checkinPct = sold > 0 ? Math.round((checkedIn / sold) * 100) : 0;
  const remaining = event.capacity - sold;

  return (
    <>
      <StaffHeader
        left={null}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <HeaderLink href="/admin/events" icon={<CalendarDays size={14} strokeWidth={1.75} />} label="Evenimente" />
            <HeaderLink href="/admin/team" icon={<Users size={14} strokeWidth={1.75} />} label="Echipă" />
            <HeaderLink href="/statistici" icon={<BarChart3 size={14} strokeWidth={1.75} />} label="Statistici" />
            <HeaderLink href="/scanner" icon={<QrCode size={14} strokeWidth={1.75} />} label="Scanner" primary />
          </div>
        }
      />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px 60px" }}>
        {/* Event title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 24, color: "var(--brand-navy)", margin: "0 0 2px", letterSpacing: "-0.02em" }}>
              {event.title}
            </h1>
            <p style={{ fontSize: 13, color: "var(--slate-500)", margin: 0 }}>
              {event.date_label} · {event.venue}
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <Chip tone="success" dot pulse size="sm">Live</Chip>
          </div>
        </div>

        {/* Stat cards */}
        <div
          className="anim-stagger"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 32 }}
        >
          <StatCard
            label="Bilete vândute"
            value={`${sold} / ${event.capacity}`}
            sub={`${soldPct}%`}
            bar={{ pct: soldPct, color: "var(--brand-cyan)" }}
            i={0}
          />
          <StatCard
            label="Check-in-uri"
            value={String(checkedIn)}
            sub={sold > 0 ? `${checkinPct}% din vânduți` : "—"}
            bar={{ pct: checkinPct, color: "var(--success)" }}
            i={1}
          />
          <StatCard
            label="Locuri rămase"
            value={String(remaining)}
            accent={remaining < 10}
            i={2}
          />
          <StatCard
            label="Venituri"
            value={`${priceRon(revenue)} lei`}
            sub="total brut"
            mono
            i={3}
          />
        </div>

        {/* Pass client component for realtime scan log + attendees table + CSV */}
        <AdminClient
          eventId={event.id}
          initialScans={(recentScans ?? []).map(s => {
            const scan = s as typeof s & ScanWithTicket;
            return ({
              id: s.id,
              result: s.result,
              created_at: s.created_at,
              ticket_id: s.ticket_id,
              code: scan.tickets?.code ?? null,
              holder_name: scan.tickets?.holder_name ?? null,
            });
          })}
          tickets={(tickets ?? []).map(t => ({
            id: t.id,
            code: t.code,
            holder_name: t.holder_name,
            holder_email: t.holder_email,
            status: t.status,
            issued_at: t.issued_at,
            checked_in_at: t.checked_in_at ?? null,
          }))}
          csvRows={csvRows}
        />
      </div>
    </>
  );
}

function HeaderLink({ href, icon, label, primary }: { href: string; icon: ReactNode; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className="pressable hover-dim"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 13, fontWeight: 700,
        color: primary ? "white" : "var(--brand-navy)",
        textDecoration: "none", padding: "7px 12px",
        background: primary ? "var(--brand-cyan)" : "white",
        border: primary ? "none" : "1px solid var(--slate-200)",
        borderRadius: 8,
      }}
    >
      {icon}
      {label}
    </Link>
  );
}

function StatCard({
  label, value, sub, accent, bar, mono, i,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  bar?: { pct: number; color: string };
  mono?: boolean;
  i: number;
}) {
  return (
    <div
      className="anim-rise-fast"
      style={{
        "--i": i,
        background: "white",
        borderRadius: 16,
        padding: "18px 20px",
        border: `1.5px solid ${accent ? "var(--warning)" : "var(--slate-200)"}`,
        boxShadow: "var(--shadow-xs)",
      } as React.CSSProperties}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 800,
        color: accent ? "var(--warning)" : "var(--brand-navy)",
        letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums",
        fontFamily: mono ? "var(--font-mono)" : undefined,
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "var(--slate-500)", marginTop: 2 }}>{sub}</div>}
      {bar && (
        <div style={{ marginTop: 10, height: 4, borderRadius: "var(--radius-pill)", background: "var(--slate-100)", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            borderRadius: "var(--radius-pill)",
            background: bar.color,
            width: `${Math.min(100, bar.pct)}%`,
            transition: "width var(--dur-slow) var(--ease-out)",
          }} />
        </div>
      )}
    </div>
  );
}
