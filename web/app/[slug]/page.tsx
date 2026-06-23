import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle, ChevronLeft, Clock, MapPin } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { Logo } from "@/components/ui/Logo";
import { getEventBySlug, getEventStats, priceRon, seatsLeft } from "@/lib/events";
import type { Metadata } from "next";
import { BuyCta } from "./BuyCta";

interface Props {
  params: Promise<{ slug: string }>;
}

// Perf (U5): event details come from the cache (getEventBySlug), but seat
// availability (getEventStats) must be live — render per request.
export const dynamic = "force-dynamic";

type ProgramItem = { t: string; l: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Eveniment negăsit" };
  return {
    title: `${event.title} - SavaPass`,
    description: event.about ?? event.subtitle ?? undefined,
    robots: { index: event.status === "active" },
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug, { includeDraftForAdmin: true });
  if (!event) notFound();

  const stats = await getEventStats(event.id);
  const sold = stats?.sold ?? 0;
  const left = seatsLeft(event, sold);
  const isSoldOut = left === 0;
  const isActive = event.status === "active";
  const accent = event.accent ?? "#009FE3";
  const program = Array.isArray(event.program) ? event.program as ProgramItem[] : [];
  const perks = Array.isArray(event.perks) ? event.perks as string[] : [];
  const posterChipLabel = event.status === "draft" ? "Schiță" : isActive ? "În vânzare" : "Arhivă";

  return (
    <div className="event-page">
      <EventStyles />
      <header className="event-nav">
        <Link href="/" className="pressable event-nav__back" aria-label="Înapoi la pagina principală">
          <ChevronLeft size={20} strokeWidth={1.75} />
        </Link>
        <Link href="/" className="logo-spin event-nav__logo">
          <Logo size={18} />
        </Link>
        <div className="event-nav__spacer" />
      </header>

      <main className="event-stage">
        <div className="event-poster anim-fade">
          {event.photo_url ? (
            <Image src={event.photo_url} alt={event.title} fill priority className="event-poster__image" sizes="(max-width: 900px) 100vw, 560px" />
          ) : (
            <div className="event-poster__fallback" style={{ background: accent }} />
          )}
          <div className="event-poster__shade" />
          <div className="event-poster__chip">
            <Chip tone="dark" dot={false}>{posterChipLabel}</Chip>
          </div>
          <div className="event-poster__caption">
            <span>{priceRon(event.price_bani)} RON</span>
            <small>{event.date_label}</small>
          </div>
        </div>

        <section className="event-sheet anim-rise">
          <h1>{event.title}</h1>
          {event.subtitle && <p className="event-subtitle">{event.subtitle}</p>}

          <div className="event-facts">
            <InfoCell icon={<Clock size={15} strokeWidth={1.75} />} label="Data" value={event.date_long} sub={event.doors} />
            <InfoCell icon={<MapPin size={15} strokeWidth={1.75} />} label="Locul" value={event.venue} sub={event.venue_line ?? ""} />
          </div>

          {isActive && (
            <div className="event-stock">
              {isSoldOut ? (
                <Chip tone="used" dot={false}>Sold out</Chip>
              ) : (
                <Chip tone={left < 15 ? "warning" : "brand"} dot={left < 15}>
                  {left} loc{left === 1 ? "" : "uri"} rămase
                </Chip>
              )}
              <span>{sold} cumpărate până acum</span>
            </div>
          )}

          {isActive && !isSoldOut && (
            <Link href={`/${event.slug}/checkout`} className="pressable hover-dim event-inline-cta">
              Cumpără bilet · <span>{priceRon(event.price_bani)} RON</span>
            </Link>
          )}

          {event.about && (
            <section className="event-copy">
              <h2>Despre eveniment</h2>
              <p>{event.about}</p>
            </section>
          )}

          {program.length > 0 && (
            <section className="event-copy">
              <h2>Programul serii</h2>
              <div className="event-program anim-stagger">
                {program.map((item, index) => (
                  <div key={`${item.t}-${item.l}`} className="anim-rise-fast" style={{ "--i": Math.min(index, 6) } as React.CSSProperties}>
                    <time>{item.t}</time>
                    <span>{item.l}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {perks.length > 0 && (
            <section className="event-copy">
              <h2>Biletul include</h2>
              <div className="event-perks anim-stagger">
                {perks.map((perk, index) => (
                  <span key={perk} className="anim-rise-fast" style={{ "--i": Math.min(index, 6) } as React.CSSProperties}>
                    <CheckCircle size={13} strokeWidth={1.75} />
                    {perk}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="event-organizer">
            <Image src="/logo-wordmark.jpg" alt="Interact Sf. Sava" width={44} height={44} />
            <div>
              <span>ORGANIZATOR</span>
              <strong>Interact Sf. Sava · Curtea Veche</strong>
            </div>
          </section>
        </section>
      </main>

      {isActive && (
        <BuyCta slug={event.slug} priceRon={priceRon(event.price_bani)} isSoldOut={isSoldOut} accent={accent} />
      )}
    </div>
  );
}

function InfoCell({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="event-fact">
      <span className="event-fact__icon">{icon}</span>
      <div>
        <span className="event-fact__label">{label}</span>
        <strong>{value}</strong>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}

function EventStyles() {
  return (
    <style>{`
      .event-page {
        min-height: 100vh;
        background: var(--im-ink);
        color: var(--im-fg);
      }

      .event-nav {
        position: sticky;
        top: 0;
        z-index: var(--z-nav);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        background: rgba(7,10,18,0.92);
        border-bottom: 1px solid var(--im-line);
      }

      .event-nav__back,
      .event-nav__logo {
        text-decoration: none;
      }

      .event-nav__back {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-pill);
        background: var(--im-ink-3);
        border: 1px solid var(--im-line);
        display: grid;
        place-items: center;
        color: var(--im-fg);
        box-shadow: none;
      }

      .event-nav__spacer {
        width: 36px;
      }

      .event-stage {
        width: min(1120px, calc(100% - 40px));
        margin: 0 auto;
        padding: 34px 0 96px;
        display: grid;
        grid-template-columns: minmax(360px, 0.95fr) 440px;
        align-items: start;
        gap: 34px;
      }

      .event-poster {
        position: sticky;
        top: 86px;
        min-height: 620px;
        border-radius: var(--radius-xl);
        overflow: hidden;
        background: var(--im-ink-2);
        box-shadow: var(--im-shadow);
        border: 1px solid var(--im-line);
      }

      .event-poster__image {
        object-fit: cover;
      }

      .event-poster__fallback,
      .event-poster__shade {
        position: absolute;
        inset: 0;
      }

      .event-poster__shade {
        background: linear-gradient(180deg, rgba(15,23,42,0.06) 30%, rgba(15,23,42,0.78) 100%);
      }

      .event-poster__chip {
        position: absolute;
        left: 22px;
        top: 22px;
      }

      .event-poster__caption {
        position: absolute;
        left: 24px;
        right: 24px;
        bottom: 24px;
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 20px;
        color: white;
      }

      .event-poster__caption span {
        font-family: var(--font-mono);
        font-size: 24px;
        font-weight: 800;
      }

      .event-poster__caption small {
        color: rgba(255,255,255,0.72);
        font-size: 13px;
      }

      .event-sheet {
        background: var(--im-ink-2);
        border: 1px solid var(--im-line);
        border-radius: var(--radius-xl);
        padding: 28px;
        box-shadow: var(--im-shadow);
      }

      .event-sheet h1 {
        margin: 0;
        color: var(--im-fg);
        font-size: 32px;
        font-weight: 800;
        line-height: 1.05;
        letter-spacing: -0.03em;
      }

      .event-subtitle {
        margin: 7px 0 0;
        color: var(--im-fg-2);
        font-family: var(--font-display);
        font-size: 17px;
        font-style: italic;
      }

      .event-facts {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 20px;
      }

      .event-fact {
        display: flex;
        gap: 10px;
        padding: 14px;
        border: 1px solid var(--im-line);
        border-radius: var(--radius-md);
        background: var(--im-ink-3);
      }

      .event-fact__icon {
        color: var(--im-cyan);
        margin-top: 1px;
        flex-shrink: 0;
      }

      .event-fact__label {
        display: block;
        color: var(--im-fg-3);
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .event-fact strong {
        display: block;
        margin-top: 3px;
        color: var(--im-fg);
        font-size: 13px;
        line-height: 1.3;
      }

      .event-fact small {
        display: block;
        margin-top: 2px;
        color: var(--im-fg-2);
        font-size: 12px;
      }

      .event-stock {
        margin-top: 14px;
        display: flex;
        align-items: center;
        gap: 9px;
        color: var(--im-fg-2);
        font-size: 13px;
      }

      .event-inline-cta {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        margin-top: 20px;
        padding: 15px 18px;
        border-radius: var(--radius-md);
        background: var(--grad-brand);
        color: white;
        text-decoration: none;
        font-weight: 800;
        box-shadow: var(--im-glow);
      }

      .event-inline-cta span {
        font-family: var(--font-mono);
      }

      .event-copy {
        margin-top: 30px;
      }

      .event-copy h2 {
        margin: 0 0 10px;
        color: var(--im-fg);
        font-size: 16px;
        font-weight: 800;
      }

      .event-copy p {
        margin: 0;
        color: var(--im-fg-2);
        font-size: 15px;
        line-height: 1.62;
      }

      .event-program {
        border: 1px solid var(--im-line);
        border-radius: var(--radius-lg);
        overflow: hidden;
      }

      .event-program div {
        display: flex;
        gap: 14px;
        align-items: center;
        padding: 14px 16px;
        border-bottom: 1px solid var(--im-line-soft);
        background: var(--im-ink-2);
      }

      .event-program div:last-child {
        border-bottom: none;
      }

      .event-program time {
        width: 44px;
        flex-shrink: 0;
        color: var(--im-cyan-light);
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: 800;
      }

      .event-program span {
        color: var(--im-fg);
        font-size: 14px;
        font-weight: 600;
      }

      .event-perks {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .event-perks span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 13px;
        border: 1px solid var(--im-line);
        border-radius: var(--radius-pill);
        color: var(--im-fg-2);
        font-size: 13px;
        font-weight: 600;
      }

      .event-perks svg {
        color: var(--success);
      }

      .event-organizer {
        margin-top: 30px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: var(--im-ink-3);
        border: 1px solid var(--im-line);
        border-radius: var(--radius-lg);
      }

      .event-organizer img {
        border-radius: var(--radius-sm);
        object-fit: cover;
      }

      .event-organizer span {
        display: block;
        color: var(--im-fg-3);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.06em;
      }

      .event-organizer strong {
        display: block;
        margin-top: 2px;
        color: var(--im-fg);
        font-size: 14px;
      }

      @media (max-width: 900px) {
        .event-stage {
          width: 100%;
          padding: 0 0 132px;
          display: block;
        }

        .event-poster {
          position: relative;
          top: auto;
          min-height: auto;
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
          aspect-ratio: 3 / 4;
          max-height: 520px;
          border-radius: 0;
          box-shadow: none;
        }

        .event-sheet {
          position: relative;
          z-index: 1;
          max-width: 440px;
          margin: -28px auto 0;
          border-left: none;
          border-right: none;
          border-bottom: none;
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          box-shadow: none;
          padding: 28px 20px;
        }

        .event-inline-cta {
          display: none;
        }
      }

      @media (max-width: 480px) {
        .event-facts {
          grid-template-columns: 1fr;
        }

        .event-sheet h1 {
          font-size: 30px;
        }
      }
    `}</style>
  );
}
