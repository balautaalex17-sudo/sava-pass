import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Banknote, CheckCircle, Clock, MapPin } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { FlowNav } from "@/components/ui/FlowNav";
import { eventIsBookable, getEventBySlug, getEventStats, getEventTicketTypes, getTicketTypeSoldCounts, priceRon, seatsLeft } from "@/lib/events";
import type { Metadata } from "next";

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

  const [stats, ticketTypes, typeSold] = await Promise.all([
    getEventStats(event.id),
    getEventTicketTypes(event.id),
    getTicketTypeSoldCounts(event.id),
  ]);
  const sold = stats?.sold ?? 0;
  const left = seatsLeft(event, sold);
  const availableTypes = ticketTypes;
  const isSoldOut = left === 0 || !availableTypes.some((type) => (typeSold[type.id] ?? 0) < type.capacity);
  const isActive = eventIsBookable(event);
  const accent = event.accent ?? "#009FE3";
  const price = priceRon(availableTypes.length ? Math.min(...availableTypes.map((type) => type.price_bani)) : event.price_bani);
  const program = Array.isArray(event.program) ? (event.program as ProgramItem[]) : [];
  const perks = Array.isArray(event.perks) ? (event.perks as string[]) : [];
  const statusLabel = event.status === "draft" ? "Schiță" : isActive ? "În vânzare" : "Încheiat";

  return (
    <div className="sp-light event-page">
      <EventStyles accent={accent} />
      <FlowNav backHref="/" />

      {/* Hero banner */}
      <div className="event-hero">
        {event.photo_url ? (
          <Image src={event.photo_url} alt={event.title} fill priority className="event-hero__img" sizes="(max-width: 760px) 100vw, 1120px" />
        ) : (
          <div className="event-hero__fallback" style={{ background: accent }} />
        )}
        <div className="event-hero__shade" />
        <div className="event-hero__inner">
          <Chip tone="dark" dot={false}>{statusLabel}</Chip>
          <h1>{event.title}</h1>
          {event.subtitle && <p className="event-hero__sub">{event.subtitle}</p>}
        </div>
      </div>

      <main className="event-body" id="detalii">
        {/* Left column */}
        <div className="event-main">
          <div className="event-facts">
            <InfoCell icon={<Clock size={17} strokeWidth={1.75} />} label="Data & ora" value={event.date_long} sub={event.doors} accent={accent} />
            <InfoCell icon={<MapPin size={17} strokeWidth={1.75} />} label="Locație" value={event.venue} sub={event.venue_line ?? ""} accent={accent} />
          </div>

          {event.about && (
            <section className="event-copy">
              <h2>Despre eveniment</h2>
              <p>{event.about}</p>
            </section>
          )}

          {program.length > 0 && (
            <section className="event-copy" id="program">
              <h2>Programul serii</h2>
              <div className="event-program">
                {program.map((item) => (
                  <div key={`${item.t}-${item.l}`}>
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
              <div className="event-perks">
                {perks.map((perk) => (
                  <span key={perk}>
                    <CheckCircle size={14} strokeWidth={2} />
                    {perk}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="event-organizer">
            <Image src="/logo-wordmark.jpg" alt="Interact Sf. Sava" width={52} height={52} />
            <div>
              <span>ORGANIZATOR</span>
              <strong>Interact Sf. Sava · Curtea Veche</strong>
            </div>
          </section>
        </div>

        {/* Sticky purchase card */}
        <aside className="event-buy">
          <div className="event-buy__card">
            <div className="event-buy__price">
              {availableTypes.length > 1 && <span className="event-buy__from">de la</span>}
              <span className="event-buy__amount">{price}</span>
              <span className="event-buy__unit">RON / bilet</span>
            </div>

            {availableTypes.length > 0 && <div className="event-buy__types">{availableTypes.map((type) => <div key={type.id}><span><b>{type.name}</b><small>{Math.max(0, type.capacity - (typeSold[type.id] ?? 0))} locuri</small></span><strong>{priceRon(type.price_bani) === 0 ? "Gratuit" : `${priceRon(type.price_bani)} RON`}</strong></div>)}</div>}

            {isActive ? (
              isSoldOut ? (
                <div className="event-buy__stock event-buy__stock--out">
                  <span className="event-buy__dot" /> Sold out · toate locurile vândute
                </div>
              ) : (
                <div className="event-buy__stock">
                  <span className="event-buy__dot" />
                  {left} din {event.capacity} locuri disponibile
                </div>
              )
            ) : (
              <div className="event-buy__stock event-buy__stock--out">
                <span className="event-buy__dot" /> Eveniment din arhivă
              </div>
            )}

            <div className="event-buy__divider" />

            <div className="event-buy__total">
              <span>Total cash</span>
              <strong>{price} RON</strong>
            </div>

            {isActive && !isSoldOut ? (
              <Link href={`/${event.slug}/checkout`} className="pressable hover-dim event-buy__btn">
                Rezervă bilet <ArrowRight size={18} strokeWidth={2.2} />
              </Link>
            ) : (
              <div className="event-buy__btn event-buy__btn--disabled">
                {isActive ? "Sold out" : "Indisponibil"}
              </div>
            )}

            <div className="event-buy__secure">
              <Banknote size={13} strokeWidth={1.75} /> Plată cash · QR pe email instant
            </div>
          </div>
        </aside>
      </main>

    </div>
  );
}

function InfoCell({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="event-fact">
      <div className="event-fact__head">
        <span className="event-fact__icon" style={{ color: accent }}>{icon}</span>
        <span className="event-fact__label">{label}</span>
      </div>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function EventStyles({ accent }: { accent: string }) {
  return (
    <style>{`
      .event-page { min-height: 100vh; background: var(--slate-50); color: var(--slate-900); }

      .event-hero {
        position: relative;
        height: 360px;
        background: var(--brand-navy);
        overflow: hidden;
      }
      .event-hero__img { object-fit: cover; object-position: center 35%; }
      .event-hero__fallback { position: absolute; inset: 0; }
      .event-hero__shade {
        position: absolute; inset: 0;
        background: linear-gradient(180deg, rgba(15,23,42,0.45) 0%, rgba(15,23,42,0.12) 38%, rgba(15,23,42,0.88) 100%);
      }
      .event-hero__inner {
        position: relative;
        width: min(1120px, calc(100% - 40px));
        margin: 0 auto;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding-bottom: 34px;
      }
      .event-hero__inner h1 {
        margin: 14px 0 0;
        color: #fff;
        font-size: clamp(34px, 6vw, 58px);
        font-weight: 800;
        line-height: 1.0;
        letter-spacing: -0.035em;
      }
      .event-hero__sub {
        margin: 10px 0 0;
        color: rgba(255,255,255,0.85);
        font-family: var(--font-display);
        font-style: italic;
        font-size: clamp(18px, 2.6vw, 22px);
      }

      .event-body {
        width: min(1120px, calc(100% - 40px));
        margin: 0 auto;
        padding: 44px 0 96px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 380px;
        gap: 56px;
        align-items: start;
      }

      .event-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .event-fact {
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-lg);
        padding: 18px;
      }
      .event-fact__head { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; }
      .event-fact__icon {
        width: 34px; height: 34px; flex-shrink: 0;
        border-radius: var(--radius-sm);
        background: var(--brand-cyan-50);
        display: grid; place-items: center;
      }
      .event-fact__label {
        color: var(--slate-500);
        font-size: 11px; font-weight: 700;
        letter-spacing: 0.08em; text-transform: uppercase;
      }
      .event-fact strong { display: block; color: var(--slate-900); font-size: 16px; font-weight: 700; line-height: 1.3; }
      .event-fact small { display: block; margin-top: 3px; color: var(--slate-500); font-size: 13px; }

      .event-copy { margin-top: 36px; }
      .event-copy h2 {
        margin: 0 0 12px;
        color: var(--slate-900);
        font-size: 13px; font-weight: 700;
        letter-spacing: 0.14em; text-transform: uppercase;
        color: var(--brand-cyan-700);
      }
      .event-copy > p { margin: 0; color: var(--slate-700); font-size: 17px; line-height: 1.7; max-width: 620px; text-wrap: pretty; }

      .event-program {
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-lg);
        overflow: hidden;
      }
      .event-program div {
        display: flex; align-items: center; gap: 20px;
        padding: 16px 22px;
        border-bottom: 1px solid var(--slate-100);
      }
      .event-program div:last-child { border-bottom: none; }
      .event-program time {
        width: 52px; flex-shrink: 0;
        color: ${accent};
        font-family: var(--font-mono); font-size: 14px; font-weight: 600;
      }
      .event-program span { color: var(--slate-900); font-size: 16px; font-weight: 500; }

      .event-perks { display: flex; flex-wrap: wrap; gap: 10px; }
      .event-perks span {
        display: inline-flex; align-items: center; gap: 7px;
        padding: 10px 16px;
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-pill);
        color: var(--slate-700); font-size: 15px; font-weight: 500;
      }
      .event-perks svg { color: var(--success); }

      .event-organizer {
        margin-top: 36px;
        display: flex; align-items: center; gap: 16px;
        padding: 18px;
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-lg);
      }
      .event-organizer img { border-radius: var(--radius-md); object-fit: cover; }
      .event-organizer span { display: block; color: var(--slate-500); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; }
      .event-organizer strong { display: block; margin-top: 2px; color: var(--slate-900); font-size: 16px; }

      /* Sticky purchase card */
      .event-buy { position: sticky; top: 92px; }
      .event-buy__card {
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-xl);
        padding: 26px;
        box-shadow: 0 30px 70px -30px rgba(15,23,42,0.22);
      }
      .event-buy__price { display: flex; align-items: baseline; gap: 8px; }
      .event-buy__from { color: var(--slate-500); font-size: 12px; font-weight: 700; }
      .event-buy__amount { font-size: 38px; font-weight: 800; color: var(--slate-900); letter-spacing: -0.02em; }
      .event-buy__unit { font-size: 16px; font-weight: 700; color: var(--slate-500); }
      .event-buy__types { display: grid; gap: 7px; margin-top: 15px; }
      .event-buy__types>div { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 11px; border: 1px solid var(--slate-200); border-radius: 10px; background: var(--slate-50); }
      .event-buy__types span { display: grid; }
      .event-buy__types b { color: var(--slate-900); font-size: 12px; }
      .event-buy__types small { color: var(--slate-500); font-size: 9px; }
      .event-buy__types strong { color: ${accent}; font-size: 11px; }
      .event-buy__stock {
        margin-top: 8px;
        display: inline-flex; align-items: center; gap: 7px;
        font-size: 13px; font-weight: 600; color: var(--success);
      }
      .event-buy__stock--out { color: var(--slate-500); }
      .event-buy__dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
      .event-buy__divider { height: 1px; background: var(--slate-100); margin: 22px 0; }
      .event-buy__total { display: flex; align-items: center; justify-content: space-between; }
      .event-buy__total span { font-size: 16px; font-weight: 700; color: var(--slate-900); }
      .event-buy__total strong { font-size: 24px; font-weight: 800; color: var(--slate-900); }
      .event-buy__btn {
        display: flex; align-items: center; justify-content: center; gap: 9px;
        width: 100%; margin-top: 20px; padding: 16px;
        border-radius: var(--radius-md);
        background: linear-gradient(135deg, ${accent} 0%, #2563EB 100%);
        color: #fff; font-weight: 700; font-size: 16px; text-decoration: none;
        box-shadow: 0 14px 34px rgba(0,159,227,0.32);
      }
      .event-buy__btn--disabled {
        background: var(--slate-100); color: var(--slate-500);
        box-shadow: none; cursor: not-allowed;
      }
      .event-buy__secure {
        margin-top: 14px;
        display: flex; align-items: center; justify-content: center; gap: 7px;
        font-size: 12px; color: var(--slate-500);
      }

      @media (max-width: 900px) {
        .event-hero { height: 280px; }
        .event-body { display: block; padding: 28px 0 72px; }
        .event-buy { position: static; margin-top: 36px; }
        .event-buy__secure { margin-top: 16px; }
      }
      @media (max-width: 480px) {
        .event-facts { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
