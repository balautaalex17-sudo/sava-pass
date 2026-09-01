import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { ClubPage } from "@/components/club/ClubPage";
import { getManagedPublishedEvents, ticketingEventToArchiveEvent } from "@/lib/event-archive";
import { academicYearForDate, formatEventDate } from "@/lib/event-display";
import type { EventRecord } from "@/lib/event-types";
import { getPublicEvents } from "@/lib/events";
import { EventVisual } from "./EventVisual";
import { EventsExplorer } from "./EventsExplorer";
import causeStyles from "./cause-wall.module.css";
import styles from "./events-index.module.css";

export const metadata: Metadata = {
  title: "Evenimente · Interact Sf. Sava",
  description: "Descoperă evenimentele culturale și caritabile organizate de Interact Sf. Sava – Curtea Veche.",
};

export const revalidate = 300;

const CAUSE_ORGANIZATIONS = [
  { name: "Touched Romania", match: "Touched Romania", logo: "/causes/touched-romania.jpg", website: "https://touchedromania.org/", tone: "light" },
  { name: "SOS Satele Copiilor", match: "SOS Satele Copiilor", logo: "/causes/sos-satele-copiilor.svg", website: "https://www.sos-satelecopiilor.ro/", tone: "red" },
  { name: "Ajungem MARI", match: "Ajungem MARI", logo: "/causes/ajungem-mari.png", website: "https://www.ajungemmari.ro/", tone: "light" },
  { name: "Asociația Casa Bună", match: "Asociația Casa Bună", logo: "/causes/casa-buna.png", website: "https://asociatiacasabuna.ro/", tone: "dark" },
  { name: "Dăruiește Aripi", match: "Dăruiește Aripi", logo: "/causes/daruieste-aripi.svg", website: "https://www.daruiestearipi.ro/", tone: "light" },
  { name: "Asociația P.A.V.E.L.", match: "Asociația P.A.V.E.L.", logo: "/causes/pavel.png", website: "https://asociatiapavel.ro/", tone: "light" },
] as const;

function featuredLabel(event: EventRecord) {
  if (event.eventStatus === "ongoing") return "În desfășurare";
  return "Activ";
}

function ExplorerFallback() {
  return (
    <section className={styles.archiveLoading} aria-label="Se pregătesc evenimentele">
      <div /><div /><div />
      <p>Se pregătesc filtrele și evenimentele…</p>
    </section>
  );
}

async function ticketingEventsWithTimeout() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      getPublicEvents().catch(() => []),
      new Promise<Awaited<ReturnType<typeof getPublicEvents>>>((resolve) => {
        timer = setTimeout(() => resolve([]), 2000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export default async function EventsPage() {
  const [ticketingRows, historicalEvents] = await Promise.all([
    ticketingEventsWithTimeout(),
    getManagedPublishedEvents(),
  ]);
  const ticketingEvents = ticketingRows.map(ticketingEventToArchiveEvent);
  const ticketingSlugs = new Set(ticketingEvents.map((event) => event.slug));
  const activeEvents = ticketingEvents.filter((event) => event.eventStatus === "upcoming" || event.eventStatus === "ongoing");
  const inactiveEvents = [
    ...ticketingEvents.filter((event) => event.eventStatus === "past"),
    ...historicalEvents.filter((event) => !ticketingSlugs.has(event.slug)),
  ].sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  const events = [...activeEvents, ...inactiveEvents];
  const featured = activeEvents[0] || events[0] || null;
  const charitableCount = historicalEvents.filter((event) => event.charitableCause).length;
  const causeOrganizations = CAUSE_ORGANIZATIONS.map((cause) => ({
    ...cause,
    editions: historicalEvents.filter((event) => event.charitableCause?.includes(cause.match)).length,
  })).filter((cause) => cause.editions > 0);

  const hero = (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Evenimente Interact</p>
          <h1>Evenimente cu scop. Experiențe care rămân.</h1>
          <p className={styles.heroLead}>
            Organizăm și susținem evenimente care inspiră, educă și aduc oamenii împreună. Fiecare participare contribuie la binele comunității.
          </p>
          <div className={styles.heroActions}>
            <Link href="#toate-evenimentele" className={styles.primaryButton}>
              Vezi evenimentele active <ArrowDown size={17} aria-hidden="true" />
            </Link>
            <Link href="#impact" className={styles.textLink}>
              Descoperă cauzele noastre <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {featured && (
          <Link
            href={featured.internalTicketingUrl || `/evenimente/${featured.slug}`}
            className={styles.featuredCard}
            aria-label={`Vezi evenimentul ${featured.title}`}
          >
            <EventVisual
              event={featured}
              priority
              sizes="(max-width: 760px) calc(100vw - 40px), 500px"
              className={styles.featuredMedia}
            />
            <div className={styles.featuredBody}>
              <span className={styles.featuredStatus}><i aria-hidden="true" />{featuredLabel(featured)}</span>
              <h2>{featured.title}</h2>
              <div className={styles.featuredMeta}>
                <span><CalendarDays size={14} aria-hidden="true" />{formatEventDate(featured)}</span>
                {featured.venueName && <span><MapPin size={14} aria-hidden="true" />{featured.venueName}</span>}
              </div>
              <p>{featured.shortDescription}</p>
              <span className={styles.featuredLink}>Detalii și galerie <ArrowUpRight size={16} aria-hidden="true" /></span>
            </div>
          </Link>
        )}
      </div>
    </header>
  );

  return (
    <ClubPage active="evenimente" hero={hero} showWatermark={false}>
      <main className={styles.main} id="continut-principal">
        <Suspense fallback={<ExplorerFallback />}>
          <EventsExplorer events={events} years={Array.from(new Set(events.map((event) => academicYearForDate(event.startDate)).filter((year): year is string => Boolean(year))))} />
        </Suspense>

        {causeOrganizations.length > 0 && (
          <section className={styles.impactSection} id="impact" aria-labelledby="impact-title">
            <div className={styles.impactIntro}>
              <p className={styles.kicker}>Cauze reale</p>
              <h2 id="impact-title">Evenimentele noastre susțin cauze reale.</h2>
              <p>Dincolo de fiecare afiș există o organizație sau o comunitate pe care am ales să o susținem.</p>
              <div className={styles.impactNumber}><strong>{charitableCount}</strong><span>ediții din arhivă au o cauză publică asociată</span></div>
              <Link href="/proiecte" className={styles.textLink}>Vezi proiectele noastre <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>

            <ul className={causeStyles.causeList} aria-label="Organizații și cauze susținute">
              {causeOrganizations.map((cause) => {
                const toneClass = cause.tone === "red"
                  ? causeStyles.causeLogoRed
                  : cause.tone === "dark"
                    ? causeStyles.causeLogoDark
                    : causeStyles.causeLogoLight;

                return (
                  <li className={causeStyles.causeItem} key={cause.name}>
                    <a href={cause.website} target="_blank" rel="noopener noreferrer" className={causeStyles.causeLink}>
                      <span className={`${causeStyles.causeLogo} ${toneClass}`}>
                        <Image
                          src={cause.logo}
                          alt={`Logo ${cause.name}`}
                          fill
                          sizes="(max-width: 560px) 104px, (max-width: 1180px) 120px, 100px"
                          className={causeStyles.causeImage}
                        />
                      </span>
                      <span className={causeStyles.causeCopy}>
                        <strong>{cause.name}</strong>
                        <span>{cause.editions} {cause.editions === 1 ? "ediție susținută" : "ediții susținute"}</span>
                      </span>
                      <ArrowUpRight className={causeStyles.causeArrow} size={17} aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </ClubPage>
  );
}
