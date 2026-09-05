import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Banknote, CalendarPlus } from "lucide-react";
import { verifyTicket } from "@/lib/qr-token";
import { resolveSiteUrl } from "@/lib/site-url";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Chip } from "@/components/ui/Chip";
import { LiveClock } from "@/components/ui/LiveClock";
import { formatCompactEventDate } from "@/lib/event-display";
import { getEventTicketTypes } from "@/lib/events";
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
    .select("*, events(*), orders(status, amount_bani, paid_at)")
    .eq("id", ticketId)
    .single();

  if (!ticket) notFound();

  const ticketWithEvent = ticket as typeof ticket & {
    events?: Database["public"]["Tables"]["events"]["Row"] | null;
    orders?: Pick<Database["public"]["Tables"]["orders"]["Row"], "status" | "amount_bani" | "paid_at"> | null;
  };
  const event = ticketWithEvent.events;
  const order = ticketWithEvent.orders;
  const ticketType = event && ticket.ticket_type_id
    ? (await getEventTicketTypes(event.id, true)).find((type) => type.id === ticket.ticket_type_id) ?? null
    : null;
  const accent = event?.accent ?? "#009FE3";
  const isUsed = ticket.status === "checked_in";
  const isCancelled = ticket.status === "cancelled";
  const isExpired = ticket.status === "expired";
  const isVoid = isCancelled || isExpired;
  const isAwaitingPayment = ticket.status === "reserved";

  const bandGradient = isUsed
    ? "linear-gradient(150deg, var(--slate-500), var(--slate-700))"
    : `linear-gradient(150deg, ${accent} 0%, #2563EB 100%)`;

  const statusChip = isVoid
    ? <Chip tone="danger" dot>{isExpired ? "Expirat" : "Anulat"}</Chip>
    : isUsed
      ? <Chip tone="used" dot>Folosit</Chip>
      : isAwaitingPayment
        ? <Chip tone="warning" dot>În așteptarea plății</Chip>
        : <Chip tone="success" dot>Valid</Chip>;

  const siteUrl = resolveSiteUrl();
  const qrSrc = `${siteUrl}/api/qr/${token}`;
  const calendarUrl = event ? googleCalendarUrl(event) : null;

  return (
    <div className="sp-light ticket-page">
      <TicketStyles bandGradient={bandGradient} />

      <main className="ticket-shell">
        <div className="ticket-head">
          <div>
            <span className="ticket-head__eyebrow">BILETUL TĂU</span>
            <h1>{isUsed ? "Bilet folosit" : isExpired ? "Bilet expirat" : isCancelled ? "Bilet anulat" : isAwaitingPayment ? "Rezervarea este confirmată" : "Ne vedem acolo."}</h1>
          </div>
          {event && (
            <div className="ticket-head__actions">
              <Link href={`/${event.slug}`}><ArrowLeft size={16} strokeWidth={1.75} />Eveniment</Link>
              {calendarUrl && !isVoid ? <a href={calendarUrl} target="_blank" rel="noopener noreferrer"><CalendarPlus size={16} strokeWidth={1.75} />Adaugă în calendar</a> : null}
            </div>
          )}
        </div>

        {/* Wallet ticket */}
        <div className="ticket-wallet anim-pop">
          {/* Band */}
          <div className="ticket-band">
            <div className="ticket-band__inner">
              <div className="ticket-band__brand">SAVAPASS · BILET</div>
              <div className="ticket-band__event">
                <div>
                  <div className="ticket-band__serif">by Interact Sf. Sava</div>
                  <div className="ticket-band__title">{event?.title ?? "Eveniment"}</div>
                </div>
                {event?.photo_url ? (
                  <div className="ticket-band__poster">
                    <Image src={event.photo_url} alt="" fill sizes="104px" />
                  </div>
                ) : null}
              </div>
              <div className="ticket-band__stats">
                <BandStat label="DATA" value={event ? formatCompactEventDate(event.starts_at) : ""} />
                <BandStat label="ORA" value={event?.doors ?? ""} />
                <BandStat label="LOCUL" value={event?.venue ?? ""} />
                <BandStat label="TITULAR" value={ticket.holder_name} />
                <BandStat label="TIP BILET" value={ticketType?.name ?? "Acces · 1 persoană"} />
              </div>
            </div>
          </div>

          {/* Perforation */}
          <div className="ticket-perf">
            <span className="ticket-perf__hole ticket-perf__hole--a" />
            <span className="ticket-perf__line" />
            <span className="ticket-perf__hole ticket-perf__hole--b" />
          </div>

          {/* QR stub */}
          <div className="ticket-stub">
            <div className="ticket-stub__plate">
              <Image
                src={qrSrc}
                alt="QR bilet"
                width={180}
                height={180}
                unoptimized
                loading="eager"
                style={{ display: "block", borderRadius: 10, opacity: isUsed ? 0.5 : isVoid ? 0.4 : 1 }}
              />
              {isVoid && (
                <div className="ticket-stub__void">
                  <span className="anim-shake">{isExpired ? "EXPIRAT" : "ANULAT"}</span>
                </div>
              )}
            </div>
            <div className="ticket-stub__code">{ticket.code}</div>
            <LiveClock />
            <div className="ticket-stub__chip">{statusChip}</div>
          </div>
        </div>

        {isAwaitingPayment && (
          <div className="ticket-payment-note" role="status">
            <Banknote size={22} strokeWidth={1.75} />
            <div>
              <strong>Plata cash nu este încă confirmată</strong>
              <p>Acest QR identifică rezervarea. Prezintă-l când plătești, dar accesul la eveniment este permis numai după confirmarea organizatorului.</p>
            </div>
          </div>
        )}

        {/* Holder details */}
        <div className="ticket-details">
          <DetailRow k="Titular" v={ticket.holder_name} />
          <DetailRow k="Email" v={ticket.holder_email} />
          <DetailRow k="Tip bilet" v={ticketType?.name ?? "Acces"} />
          {order && <DetailRow k="Plată" v={order.amount_bani === 0 ? "Gratuit" : order.status === "paid" ? "Cash confirmat" : `${(order.amount_bani / 100).toLocaleString("ro-RO")} RON · de achitat cash`} />}
          {ticket.checked_in_at && (
            <DetailRow
              k="Check-in"
              v={new Date(ticket.checked_in_at).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}
            />
          )}
          <DetailRow k="Cod bilet" v={ticket.code} mono last />
        </div>

        <p className="ticket-foot">
          {isAwaitingPayment ? "Prezintă codul QR când efectuezi plata și la intrarea în eveniment." : "Arată codul QR la intrare. Un bilet, o singură folosire."} · Interact Sf. Sava
        </p>
      </main>
    </div>
  );
}

function BandStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ticket-band__stat">
      <div className="ticket-band__stat-label">{label}</div>
      <div className="ticket-band__stat-value">{value}</div>
    </div>
  );
}

function DetailRow({ k, v, mono, last }: { k: string; v: string; mono?: boolean; last?: boolean }) {
  return (
    <div className="ticket-detail" style={last ? { borderBottom: "none" } : undefined}>
      <span>{k}</span>
      <strong style={mono ? { fontFamily: "var(--font-mono)", letterSpacing: "0.1em" } : undefined}>{v}</strong>
    </div>
  );
}

function googleCalendarUrl(event: Database["public"]["Tables"]["events"]["Row"]) {
  const calendarDate = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${calendarDate(event.starts_at)}/${calendarDate(event.ends_at)}`,
    location: [event.venue, event.venue_line].filter(Boolean).join(", "),
  });
  if (event.about) query.set("details", event.about);
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

function TicketStyles({ bandGradient }: { bandGradient: string }) {
  return (
    <style>{`
      .ticket-page { min-height: 100vh; padding-top: 92px; background: var(--slate-50); color: var(--slate-900); }
      .ticket-shell { width: min(900px, calc(100% - 40px)); margin: 0 auto; padding: 40px 0 72px; }

      .ticket-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
      .ticket-head__eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--brand-cyan-700); }
      .ticket-head h1 { margin: 8px 0 0; font-size: clamp(28px, 5vw, 36px); font-weight: 800; letter-spacing: -0.025em; color: var(--slate-900); }
      .ticket-head__actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
      .ticket-head__actions a {
        min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
        padding: 0 13px; border: 1px solid var(--slate-200); border-radius: var(--radius-md);
        background: var(--white); color: var(--slate-700); font-size: 12px; font-weight: 700; text-decoration: none;
        transition: border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
      }
      .ticket-head__actions a:focus-visible { border-color: var(--brand-cyan); outline: 3px solid var(--brand-cyan-100); outline-offset: 2px; }

      .ticket-wallet {
        display: flex;
        border-radius: var(--radius-xl);
        overflow: hidden;
        background: var(--white);
        border: 0;
        box-shadow: var(--shadow-lg);
        min-height: 340px;
      }

      .ticket-band {
        flex: 1; position: relative; overflow: hidden;
        padding: 36px 40px; color: #fff;
        background: ${bandGradient};
      }
      .ticket-band__inner { position: relative; }
      .ticket-band__brand { font-size: 12px; font-weight: 700; letter-spacing: 0.16em; opacity: 0.9; }
      .ticket-band__event { display: flex; align-items: flex-end; justify-content: space-between; gap: 22px; margin-top: 22px; }
      .ticket-band__event > div:first-child { min-width: 0; }
      .ticket-band__serif { margin-top: 24px; font-family: var(--font-display); font-style: italic; font-size: 16px; opacity: 0.85; }
      .ticket-band__title { margin-top: 4px; font-size: clamp(30px, 4vw, 40px); font-weight: 800; letter-spacing: -0.025em; line-height: 1.02; }
      .ticket-band__poster {
        position: relative; width: 92px; height: 116px; flex: 0 0 auto; overflow: hidden;
        border-radius: var(--radius-md); background: rgba(255,255,255,.12); box-shadow: 0 2px 6px rgba(15,23,42,.16);
      }
      .ticket-band__poster img { object-fit: cover; }
      .ticket-band__stats { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 36px; margin-top: 32px; }
      .ticket-band__stat-label { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; opacity: 0.75; }
      .ticket-band__stat-value { margin-top: 5px; font-size: 16px; font-weight: 700; }

      .ticket-perf { position: relative; width: 2px; background: var(--white); flex-shrink: 0; }
      .ticket-perf__line { position: absolute; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); border-left: 2px dashed var(--slate-300); }
      .ticket-perf__hole { position: absolute; left: 50%; transform: translateX(-50%); width: 16px; height: 16px; border-radius: 50%; background: var(--slate-50); }
      .ticket-perf__hole--a { top: -8px; }
      .ticket-perf__hole--b { bottom: -8px; }

      .ticket-stub {
        width: 300px; flex-shrink: 0;
        padding: 32px;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
        background: var(--white);
      }
      .ticket-stub__plate { position: relative; padding: 14px; border-radius: var(--radius-lg); border: 1px solid var(--slate-200); background: #fff; }
      .ticket-stub__void {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        background: rgba(248,250,252,0.72); border-radius: var(--radius-lg);
      }
      .ticket-stub__void span { font-weight: 800; font-size: 20px; color: var(--danger); letter-spacing: 0.12em; }
      .ticket-stub__code { font-family: var(--font-mono); font-weight: 600; font-size: 15px; letter-spacing: 0.12em; color: var(--slate-900); }

      .ticket-details {
        margin-top: 24px;
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-lg);
        overflow: hidden;
      }
      .ticket-payment-note {
        display: flex; align-items: flex-start; gap: 14px;
        margin-top: 24px; padding: 18px 20px;
        border: 1px solid #F5C66A; border-radius: var(--radius-lg);
        background: var(--warning-100); color: #78350F;
      }
      .ticket-payment-note svg { flex-shrink: 0; margin-top: 1px; }
      .ticket-payment-note strong { display: block; color: #5F2C0B; font-size: 14px; }
      .ticket-payment-note p { max-width: 70ch; margin: 5px 0 0; font-size: 13px; line-height: 1.55; }
      .ticket-detail {
        display: flex; align-items: center; justify-content: space-between;
        padding: 15px 22px; border-bottom: 1px solid var(--slate-100);
      }
      .ticket-detail span { color: var(--slate-500); font-size: 14px; font-weight: 500; }
      .ticket-detail strong { color: var(--slate-900); font-size: 14px; font-weight: 600; }

      .ticket-foot { margin-top: 22px; text-align: center; font-size: 12px; color: var(--slate-500); }

      @media (hover: hover) and (pointer: fine) {
        .ticket-head__actions a:hover { border-color: var(--slate-300); color: var(--slate-900); }
      }

      @media (max-width: 820px) {
        .ticket-page { padding-top: 76px; }
      }

      @media (max-width: 760px) {
        .ticket-head { align-items: flex-start; flex-direction: column; }
        .ticket-head__actions { justify-content: flex-start; }
        .ticket-wallet { flex-direction: column; min-height: 0; }
        .ticket-band { padding: 28px 24px; }
        .ticket-band__stats { gap: 18px 24px; margin-top: 24px; }
        .ticket-perf { width: 100%; height: 2px; }
        .ticket-perf__line { top: 50%; bottom: auto; left: 0; right: 0; transform: translateY(-50%); border-left: none; border-top: 2px dashed var(--slate-300); }
        .ticket-perf__hole { top: 50%; transform: translate(0, -50%); }
        .ticket-perf__hole--a { left: -8px; }
        .ticket-perf__hole--b { left: auto; right: -8px; }
        .ticket-stub { width: 100%; padding: 28px 24px; }
        .ticket-stub__void { position: static; min-height: 44px; margin-top: 12px; background: var(--danger-100); }
      }

      @media (max-width: 480px) {
        .ticket-shell { width: calc(100% - 32px); padding-top: 32px; }
        .ticket-head__actions { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
        .ticket-head__actions a { padding: 0 10px; }
        .ticket-band__event { align-items: flex-start; }
        .ticket-band__poster { width: 78px; height: 98px; }
        .ticket-band__stats { grid-template-columns: 1fr; gap: 14px; }
        .ticket-detail { align-items: flex-start; flex-direction: column; gap: 5px; padding: 14px 18px; }
        .ticket-detail strong { max-width: 100%; overflow-wrap: anywhere; }
      }
    `}</style>
  );
}
