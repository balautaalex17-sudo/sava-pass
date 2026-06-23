import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/Logo";
import { Chip } from "@/components/ui/Chip";
import { GearWatermark } from "@/components/ui/GearWatermark";
import { SignOutButton } from "./SignOutButton";
import { ProfileCard } from "./ProfileCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contul meu — SavaPass",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, { tone: "success" | "used" | "danger" | "warning"; label: string }> = {
  valid: { tone: "success", label: "Valabil" },
  in: { tone: "used", label: "Intrat" },
  used: { tone: "used", label: "Folosit" },
  void: { tone: "danger", label: "Anulat" },
};

type TicketRow = {
  id: string;
  code: string;
  qr_token: string;
  status: string;
  issued_at: string;
  holder_name: string;
  event_id: string;
  events: {
    title: string;
    date_label: string;
    venue: string;
    accent: string | null;
    status: string;
  } | null;
};

export default async function ContaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/conta/login");

  const { data } = await supabase
    .from("tickets")
    .select("id, code, qr_token, status, issued_at, holder_name, event_id, events(title, date_label, venue, accent, status)")
    .order("issued_at", { ascending: false });

  const tickets = (data ?? []) as unknown as TicketRow[];
  const activeTickets = tickets.filter((ticket) => ticket.events?.status === "active");
  const pastTickets = tickets.filter((ticket) => ticket.events?.status !== "active");
  const attendedEvents = new Set(tickets.filter((ticket) => ticket.status === "in" || ticket.status === "used").map((ticket) => ticket.event_id)).size;
  const totalTickets = tickets.filter((ticket) => ticket.status !== "void").length;
  const displayName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
  const firstName = displayName ? displayName.split(" ")[0] : "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--im-ink)" }}>
      {/* Header */}
      <div style={{
        background: "rgba(7,10,18,0.92)",
        borderBottom: "1px solid var(--im-line)",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: "var(--z-nav)" as unknown as number,
      }}>
        <Link href="/" style={{ textDecoration: "none" }} className="logo-spin">
          <Logo size={18} />
        </Link>
        <SignOutButton />
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px 20px 60px" }}>
        {/* Heading — eyebrow removed, greeting added */}
        <div style={{ marginBottom: 20 }} className="anim-rise">
          <h1 style={{
            fontWeight: 800,
            fontSize: 26,
            color: "var(--im-fg)",
            letterSpacing: "-0.025em",
            margin: "0 0 4px",
          }}>
            {firstName ? `Salut, ${firstName}.` : "Contul meu"}
          </h1>
          <p style={{ fontSize: 13, color: "var(--im-fg-2)", margin: 0 }}>{user.email}</p>
        </div>

        {/* Stat boxes — quieted */}
        <div
          className="anim-stagger"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}
        >
          <StatBox label="Evenimente bifate" value={String(attendedEvents)} i={0} />
          <StatBox label="Bilete totale" value={String(totalTickets)} i={1} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <ProfileCard email={user.email ?? ""} name={displayName} />
        </div>

        <p style={{ color: "var(--im-fg-3)", fontSize: 12, margin: "0 0 18px" }}>
          Vezi doar biletele cumpărate cu {user.email}.
        </p>

        {tickets.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: "grid", gap: 24 }}>
            <TicketSection title="Active" tickets={activeTickets} />
            <TicketSection title="Istoric" tickets={pastTickets} />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      position: "relative",
      background: "var(--im-ink-2)",
      borderRadius: 20,
      border: "1px solid var(--im-line)",
      padding: "48px 32px",
      textAlign: "center",
      boxShadow: "var(--im-shadow)",
      overflow: "hidden",
    }}>
      <GearWatermark />
      <div style={{ position: "relative", zIndex: 1 }}>
        <p style={{ fontWeight: 700, fontSize: 17, color: "var(--im-fg)", margin: "0 0 8px" }}>
          Niciun bilet încă
        </p>
        <p style={{ fontSize: 14, color: "var(--im-fg-2)", margin: "0 0 24px", lineHeight: 1.55 }}>
          Cumpără un bilet pentru un eveniment Interact și apare automat aici.
        </p>
        <Link
          href="/"
          className="pressable hover-dim"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            borderRadius: 14,
            background: "var(--im-grad)",
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            boxShadow: "var(--im-glow)",
          }}
        >
          Vezi evenimentele
        </Link>
      </div>
    </div>
  );
}

function StatBox({ label, value, i }: { label: string; value: string; i: number }) {
  return (
    <div
      className="anim-rise-fast"
      style={{
        "--i": i,
        background: "var(--im-ink-2)",
        border: "1px solid var(--im-line)",
        borderRadius: 16,
        padding: 16,
        boxShadow: "var(--im-shadow)",
      } as React.CSSProperties}
    >
      <div style={{ color: "var(--im-fg-3)", fontSize: 12, fontWeight: 400 }}>{label}</div>
      <div style={{
        color: "var(--im-fg)",
        fontSize: 24,
        fontWeight: 700,
        marginTop: 4,
        fontFamily: "var(--font-mono)",
      }}>
        {value}
      </div>
    </div>
  );
}

function TicketSection({ title, tickets }: { title: string; tickets: TicketRow[] }) {
  return (
    <section>
      <h2 style={{ color: "var(--im-fg)", fontSize: 15, margin: "0 0 10px", fontWeight: 800 }}>{title}</h2>
      {tickets.length === 0 ? (
        <p style={{ color: "var(--im-fg-3)", fontSize: 13, margin: 0 }}>Niciun bilet aici.</p>
      ) : (
        <div className="anim-stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tickets.map((ticket, idx) => (
            <TicketCard key={ticket.id} ticket={ticket} i={Math.min(idx, 6)} />
          ))}
        </div>
      )}
    </section>
  );
}

function TicketCard({ ticket, i }: { ticket: TicketRow; i: number }) {
  const event = ticket.events;
  const chip = STATUS_CHIP[ticket.status] ?? { tone: "used" as const, label: ticket.status };

  return (
    <Link
      href={`/bilet/${ticket.qr_token}`}
      style={{ "--i": i, textDecoration: "none" } as React.CSSProperties}
      className="pressable anim-rise-fast ticket-card"
    >
      {/* Boarding-pass silhouette: left zone + vertical dashed divider + right stub */}
      <div
        style={{
          background: "var(--im-ink-2)",
          borderRadius: 20,
          border: "1px solid var(--im-line)",
          boxShadow: "var(--im-shadow)",
          display: "flex",
          alignItems: "stretch",
          overflow: "hidden",
          position: "relative",
          transition: `box-shadow var(--dur-fast) ease`,
        } as React.CSSProperties}
      >
        {/* Left zone */}
        <div style={{ flex: 1, padding: "16px 18px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontWeight: 800,
                fontSize: 16,
                color: "var(--im-fg)",
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {event?.title ?? "Eveniment"}
              </div>
              <div style={{ fontSize: 13, color: "var(--im-fg-2)", marginTop: 3 }}>
                {event?.date_label} · {event?.venue}
              </div>
            </div>
            <Chip tone={chip.tone} dot>{chip.label}</Chip>
          </div>
        </div>

        {/* Notch circles for boarding-pass perforation illusion */}
        <div style={{
          position: "absolute",
          left: "calc(100% - 96px - 1px)",
          top: -8,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "var(--im-ink)",
          border: "1px solid var(--im-line)",
          zIndex: 2,
        }} />
        <div style={{
          position: "absolute",
          left: "calc(100% - 96px - 1px)",
          bottom: -8,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "var(--im-ink)",
          border: "1px solid var(--im-line)",
          zIndex: 2,
        }} />

        {/* Vertical dashed hairline */}
        <div style={{
          width: 0,
          borderLeft: "2px dashed var(--im-line)",
          flexShrink: 0,
          margin: "8px 0",
        }} />

        {/* Right stub */}
        <div style={{
          width: 96,
          flexShrink: 0,
          background: "var(--im-ink-3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "12px 8px",
        }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--im-fg)",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: "rotate(180deg)",
            userSelect: "none",
          }}>
            {ticket.code}
          </span>
          <span style={{ fontSize: 12, color: "var(--im-cyan-light)", fontWeight: 600 }}>
            Vezi →
          </span>
        </div>
      </div>
    </Link>
  );
}
