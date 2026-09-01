import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { ClubPage } from "@/components/club/ClubPage";
import { ticketingEventToArchiveEvent } from "@/lib/event-archive";
import { getPublicEvents } from "@/lib/events";
import { CompactEventCard } from "./CompactEventCard";
import styles from "./events-index.module.css";

export const metadata: Metadata = {
  title: "Evenimente · Interact Sf. Sava",
  description: "Evenimentele active și edițiile încheiate organizate de Interact Sf. Sava.",
};

export const revalidate = 300;

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
  const rows = await ticketingEventsWithTimeout();
  const events = rows.map(ticketingEventToArchiveEvent);
  const activeEvents = events
    .filter((event) => event.eventStatus === "upcoming" || event.eventStatus === "ongoing")
    .sort((a, b) => (a.startDate || "9999-12-31").localeCompare(b.startDate || "9999-12-31"));
  const pastEvents = events
    .filter((event) => event.eventStatus === "past")
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  const firstSectionHref = activeEvents.length > 0 ? "#evenimente-active" : "#evenimente-incheiate";

  const hero = (
    <header className={styles.hero}>
      <div className={`${styles.heroInner} ${styles.heroInnerSimple}`}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Calendarul clubului</p>
          <h1>Evenimente</h1>
          <p className={styles.heroLead}>
            Evenimentele active apar primele. După încheiere, rămân aici ca arhivă a clubului.
          </p>
          <div className={styles.heroActions}>
            <Link href={firstSectionHref} className={styles.primaryButton}>
              Vezi evenimentele <ArrowDown size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );

  return (
    <ClubPage active="evenimente" hero={hero} showWatermark={false}>
      <main className={styles.main} id="continut-principal">
        <section className={styles.eventsSection} id="evenimente-active" aria-labelledby="active-events-title">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="active-events-title">Active</h2>
              <p>{activeEvents.length > 0 ? "Rezervările sunt deschise pentru aceste evenimente." : "Nu există momentan un eveniment activ."}</p>
            </div>
            {activeEvents.length > 0 && <span className={styles.sectionCount}>{activeEvents.length}/3 publicate</span>}
          </div>

          {activeEvents.length > 0 ? (
            <div className={styles.eventsGrid}>
              {activeEvents.map((event) => <CompactEventCard event={event} key={event.id} />)}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>Următorul eveniment este în pregătire.</strong>
              <p>Când echipa îl publică, va apărea aici și pe homepage.</p>
            </div>
          )}
        </section>

        <section className={`${styles.eventsSection} ${styles.pastEventsSection}`} id="evenimente-incheiate" aria-labelledby="past-events-title">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="past-events-title">Încheiate</h2>
              <p>Evenimentele trecute rămân publice aici.</p>
            </div>
            {pastEvents.length > 0 && <span className={styles.sectionCount}>{pastEvents.length} {pastEvents.length === 1 ? "ediție" : "ediții"}</span>}
          </div>

          {pastEvents.length > 0 ? (
            <div className={styles.eventsGrid}>
              {pastEvents.map((event) => <CompactEventCard event={event} key={event.id} />)}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>Arhiva este goală.</strong>
              <p>Un eveniment ajunge aici după ce îl marchezi „Încheiat” în Board.</p>
            </div>
          )}
        </section>
      </main>
    </ClubPage>
  );
}
