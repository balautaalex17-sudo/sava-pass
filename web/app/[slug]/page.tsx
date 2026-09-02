import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  MapPin,
} from "lucide-react";
import {
  EventPurchaseExperience,
  type PurchaseState,
} from "@/components/events/EventPurchaseExperience";
import { HomeNav } from "@/app/HomeNav";
import { Chip } from "@/components/ui/Chip";
import { formatCompactEventDate } from "@/lib/event-display";
import { isEventEnded } from "@/lib/event-lifecycle";
import {
  getEventBySlug,
  getEventStats,
  getEventTicketTypes,
  getTicketTypeSoldCounts,
  priceRon,
  seatsLeft,
} from "@/lib/events";
import type { Metadata } from "next";
import styles from "./event-page.module.css";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ checkout?: string }>;
}

type ProgramItem = { t: string; l: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Eveniment negăsit" };
  return {
    title: `${event.title} - SavaPass`,
    description: event.about ?? event.subtitle ?? undefined,
    robots: { index: event.status !== "draft" },
  };
}

function splitEventStory(about: string | null) {
  if (!about) return { story: null, cause: null, causeTitle: null };
  const sentences = about.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  const cause = sentences.find((sentence) => /\b(fond|fondurile|dona|donațiile|susțin|susține|sprijin|cauz)/i.test(sentence)) ?? null;
  const causeTitle = cause?.match(/[„"]([^”"]+)[”"]/)?.[1] ?? null;
  const storySentences = cause ? sentences.filter((sentence) => sentence !== cause) : sentences;
  return {
    story: storySentences.length ? storySentences.join(" ") : about,
    cause,
    causeTitle,
  };
}

function bucharestTime(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: "Europe/Bucharest",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export default async function EventPage({ params, searchParams }: Props) {
  const [{ slug }, query]: [{ slug: string }, { checkout?: string }] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const event = await getEventBySlug(slug, { includeDraftForAdmin: true });
  if (!event) notFound();

  const [stats, rawTicketTypes, typeSold] = await Promise.all([
    getEventStats(event.id),
    getEventTicketTypes(event.id),
    getTicketTypeSoldCounts(event.id),
  ]);

  const sold = stats?.sold ?? 0;
  const remaining = seatsLeft(event, sold);
  const ticketTypes = rawTicketTypes.map((type) => ({
    id: type.id,
    name: type.name,
    description: type.description,
    priceRon: priceRon(type.price_bani),
    seatsLeft: Math.min(remaining, Math.max(0, type.capacity - (typeSold[type.id] ?? 0))),
  }));
  const ended = isEventEnded(event);
  const allTypesSoldOut = ticketTypes.length > 0 && ticketTypes.every((type) => type.seatsLeft <= 0);
  const purchaseState: PurchaseState = event.status === "draft"
    ? "unavailable"
    : ended
      ? "ended"
      : ticketTypes.length === 0
        ? "unavailable"
        : remaining <= 0 || allTypesSoldOut
          ? "sold_out"
          : "active";
  const availableTicketTypes = ticketTypes.filter((type) => type.seatsLeft > 0);
  const startingPrice = availableTicketTypes.length
    ? Math.min(...availableTicketTypes.map((type) => type.priceRon))
    : null;
  const { story, cause, causeTitle } = splitEventStory(event.about);
  const lead = event.subtitle ?? story?.split(/(?<=[.!?])\s+/)[0] ?? `${event.date_long} · ${event.venue}`;
  const program = Array.isArray(event.program)
    ? (event.program as ProgramItem[]).filter((item) => typeof item?.t === "string" && typeof item?.l === "string")
    : [];
  const schedule = program.length
    ? program
    : [
        { t: event.doors, l: "Începutul evenimentului" },
        { t: bucharestTime(event.ends_at), l: "Încheiere" },
      ];
  const perks = Array.isArray(event.perks)
    ? (event.perks as unknown[]).filter((perk): perk is string => typeof perk === "string" && perk.trim().length > 0)
    : [];
  const mapQuery = event.venue_line?.replace(/\s*[·•]\s*/g, ", ") ?? event.venue;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
  const statusLabel = purchaseState === "active"
    ? "Bilete disponibile"
    : purchaseState === "sold_out"
      ? "Sold out"
      : purchaseState === "ended"
        ? "Eveniment încheiat"
        : "Biletele nu sunt disponibile";
  const statusTone = purchaseState === "active" ? "brand" : purchaseState === "sold_out" ? "warning" : "used";

  return (
    <div className={`sp-light ${styles.page}`}>
      <HomeNav active="rezerva" immersive />

      <main id="continut-principal">
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.poster}>
              {event.photo_url ? (
                <Image
                  src={event.photo_url}
                  alt={`Afișul evenimentului ${event.title}`}
                  fill
                  priority
                  className={styles.posterImage}
                  sizes="(max-width: 860px) calc(100vw - 40px), 400px"
                />
              ) : (
                <div className={styles.posterFallback} aria-hidden="true">{event.title}</div>
              )}
            </div>

            <div className={styles.heroCopy}>
              <div className={styles.heroTopline}>
                <Chip tone={statusTone} dot={purchaseState === "active"}>{statusLabel}</Chip>
                <span>Organizat de Interact Sf. Sava</span>
              </div>
              <h1>{event.title}</h1>
              <p className={styles.lead}>{lead}</p>

              <dl className={styles.heroFacts}>
                <HeroFact icon={<CalendarDays size={19} strokeWidth={1.75} />} label="Data" value={event.date_long} />
                <HeroFact icon={<Clock3 size={19} strokeWidth={1.75} />} label="Ora" value={event.doors} />
                <HeroFact icon={<MapPin size={19} strokeWidth={1.75} />} label="Locația" value={event.venue} />
              </dl>

              {purchaseState === "active" && startingPrice !== null ? (
                <div className={styles.heroAction}>
                  <div>
                    <span>{ticketTypes.length > 1 ? "Bilete de la" : "Bilet"}</span>
                    <strong>{startingPrice === 0 ? "Gratuit" : `${startingPrice.toLocaleString("ro-RO")} RON`}</strong>
                  </div>
                  <a href="#bilete" className="pressable hover-dim">
                    Alege biletul <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className={styles.layout}>
          <div className={styles.content}>
            {story ? (
              <section className={styles.section} aria-labelledby="despre-eveniment">
                <h2 id="despre-eveniment">Despre eveniment</h2>
                <p className={styles.story}>{story}</p>
              </section>
            ) : null}

            <section className={styles.section} aria-labelledby="program-eveniment">
              <div className={styles.sectionHeading}>
                <div>
                  <h2 id="program-eveniment">Program</h2>
                  <p>{event.date_long}</p>
                </div>
                <Clock3 size={21} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <ol className={styles.schedule}>
                {schedule.map((item, index) => (
                  <li key={`${item.t}-${item.l}-${index}`}>
                    <time>{item.t}</time>
                    <span>{item.l}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className={styles.section} aria-labelledby="locatie-eveniment">
              <div className={styles.sectionHeading}>
                <div>
                  <h2 id="locatie-eveniment">Locație</h2>
                  <p>Detaliile pentru sosire</p>
                </div>
                <MapPin size={21} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className={styles.locationCard}>
                <div className={styles.venue}>
                  <div>
                    <strong>{event.venue}</strong>
                    {event.venue_line ? <span>{event.venue_line}</span> : null}
                    <span className={styles.mapStatus} aria-hidden="true">
                      <span className={styles.mapSignal} />
                      Hartă interactivă
                    </span>
                  </div>
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                    Deschide în Maps <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" />
                  </a>
                </div>
                <div className={`${styles.mapFrame} anim-rise`} data-reveal="scale">
                  <iframe
                    src={mapEmbedUrl}
                    title={`Hartă Google Maps pentru ${event.venue}`}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </section>

            {cause ? (
              <section className={`${styles.section} ${styles.cause}`} aria-labelledby="cauza-eveniment">
                <HeartHandshake size={26} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <span>Impactul biletului tău</span>
                  <h2 id="cauza-eveniment">{causeTitle ?? "Cauza susținută"}</h2>
                  <p>{cause}</p>
                </div>
              </section>
            ) : null}

            {perks.length > 0 ? (
              <section className={styles.section} aria-labelledby="informatii-utile">
                <h2 id="informatii-utile">Ce include biletul</h2>
                <ul className={styles.perks}>
                  {perks.map((perk) => (
                    <li key={perk}><CheckCircle2 size={17} strokeWidth={1.75} aria-hidden="true" />{perk}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className={`${styles.section} ${styles.organizer}`} aria-label="Organizator">
              <Image src="/logo-wordmark.jpg" alt="" width={48} height={48} />
              <div>
                <span>Organizator</span>
                <strong>Interact Sf. Sava</strong>
                <p>Evenimente create de liceeni pentru comunitate.</p>
              </div>
            </section>
          </div>

          <EventPurchaseExperience
            event={{
              slug: event.slug,
              title: event.title,
              dateLabel: formatCompactEventDate(event.starts_at),
              dateLong: event.date_long,
              timeLabel: event.doors,
              venue: event.venue,
              photoUrl: event.photo_url,
              capacity: event.capacity,
              causeCopy: cause,
              causeTitle,
            }}
            requestKey={crypto.randomUUID()}
            state={purchaseState}
            sold={sold}
            seatsLeft={remaining}
            ticketTypes={ticketTypes}
            initialCheckout={query.checkout === "1"}
          />
        </div>
      </main>
    </div>
  );
}

function HeroFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <span className={styles.heroFactIcon} aria-hidden="true">{icon}</span>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
