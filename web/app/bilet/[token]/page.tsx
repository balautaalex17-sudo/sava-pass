import { notFound } from "next/navigation";
import Image from "next/image";
import { verifyTicket } from "@/lib/qr-token";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Chip } from "@/components/ui/Chip";
import { LiveClock } from "@/components/ui/LiveClock";
import type { Metadata } from "next";
import type { Database } from "@/lib/supabase/types";

export const metadata: Metadata = { robots: { index: false, follow: false } };

interface Props {
  params: Promise<{ token: string }>;
}

export default async function TicketPage({ params }: Props) {
  const { token } = await params;
  const ticketId = verifyTicket(token);
  if (!ticketId) notFound();

  const { data: ticket } = await supabaseAdmin
    .from("tickets")
    .select("*, events(*)")
    .eq("id", ticketId)
    .single();

  if (!ticket) notFound();

  const ticketWithEvent = ticket as typeof ticket & {
    events?: Database["public"]["Tables"]["events"]["Row"] | null;
  };
  const event = ticketWithEvent.events;
  const accent = event?.accent ?? "#009FE3";
  const isUsed = ticket.status === "used" || ticket.status === "in";
  const isVoid = ticket.status === "void";

  // Used state: gradient fades to slate
  const headerGradient = isUsed
    ? "linear-gradient(135deg, var(--slate-500), var(--slate-700))"
    : `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`;

  const statusChip = isVoid
    ? <Chip tone="danger" dot>Anulat</Chip>
    : isUsed
      ? <Chip tone="used" dot>Folosit</Chip>
      : <Chip tone="success" dot>Valid</Chip>;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const qrSrc = `${siteUrl}/api/qr/${token}`;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--im-ink)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
      {/* Ticket card — spring entrance */}
      <div
        className="anim-pop"
        style={{
          width: "100%", maxWidth: 400, borderRadius: 28,
          overflow: "hidden", boxShadow: "var(--im-shadow)",
          background: "var(--im-ink-2)",
          border: "1px solid var(--im-line)",
        }}
      >
        {/* Gradient header */}
        <div style={{
          background: headerGradient,
          padding: "28px 24px 24px",
          position: "relative",
        }}>
          {/* Text-protection layer for light gradients */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(15,23,42,0.18), transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <Eyebrow color="rgba(255,255,255,0.7)">BILETUL TĂU</Eyebrow>
            <h1 style={{
              fontWeight: 800, fontSize: 26, color: "white",
              letterSpacing: "-0.025em", lineHeight: 1.1, margin: "8px 0 4px",
            }}>
              {event?.title ?? "Eveniment"}
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", margin: 0 }}>
              {event?.date_label} · {event?.venue}
            </p>
            <div style={{ marginTop: 12 }}>{statusChip}</div>
          </div>
        </div>

        {/* Perforated divider */}
        <div style={{ display: "flex", alignItems: "center", margin: "0 -1px" }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--im-ink)", flexShrink: 0 }} />
          <div style={{ flex: 1, borderTop: "2px dashed var(--im-line)" }} />
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--im-ink)", flexShrink: 0 }} />
        </div>

        {/* QR + code + LiveClock */}
        <div style={{ padding: "24px", textAlign: "center" }}>
          {/* White plate keeps the QR scannable on the dark ticket */}
          <div style={{ position: "relative", display: "inline-block", background: "#fff", padding: 14, borderRadius: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
            <Image
              src={qrSrc}
              alt="QR bilet"
              width={180}
              height={180}
              style={{
                borderRadius: 12, display: "block",
                opacity: isUsed ? 0.5 : isVoid ? 0.4 : 1,
              }}
              unoptimized
            />
            {isVoid && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(248,250,252,0.7)", borderRadius: 16,
              }}>
                <span
                  className="anim-shake"
                  style={{ fontWeight: 800, fontSize: 18, color: "var(--danger)", letterSpacing: "0.1em" }}
                >
                  ANULAT
                </span>
              </div>
            )}
          </div>

          <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, letterSpacing: "0.15em", color: "var(--im-fg)", marginTop: 14 }}>
            {ticket.code}
          </div>

          {/* LiveClock — liveness anti-screenshot cue */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <LiveClock />
          </div>

          <div style={{ fontSize: 12, color: "var(--im-fg-3)", marginTop: 4 }}>
            Arată acest cod la intrare
          </div>
        </div>

        {/* Holder info */}
        <div style={{ borderTop: "1px solid var(--im-line-soft)", padding: "16px 24px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DetailRow label="PARTICIPANT" value={ticket.holder_name} />
            <DetailRow label="EMAIL" value={ticket.holder_email} />
            {ticket.checked_in_at && (
              <DetailRow label="CHECK-IN" value={new Date(ticket.checked_in_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })} />
            )}
          </div>
        </div>
      </div>

      {/* Footer line */}
      <p
        className="anim-fade"
        style={{ marginTop: 24, fontSize: 12, color: "var(--im-fg-3)", textAlign: "center", animationDelay: "200ms" }}
      >
        Ne vedem la {event?.venue ?? "eveniment"} · Interact Sf. Sava
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--im-fg-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--im-fg)", marginTop: 3 }}>{value}</div>
    </div>
  );
}
