import Image from "next/image";
import { AnimatedNavLink as Link } from "@/app/AnimatedNavLink";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Ticket,
} from "lucide-react";


import styles from "./rezerva.module.css";

export interface ReservationChoice {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  photoUrl: string | null;
  priceRon: number;
}

export function ReservationChooser({ choices }: { choices: ReservationChoice[] }) {
  return (
    <div className={`sp-light ${styles.page}`}>

      <main className={styles.main} id="continut-principal">
        <header className={styles.header}>
          <div className={styles.headerIcon} aria-hidden="true">
            <Ticket size={24} strokeWidth={1.75} />
          </div>
          <div>
            <h1>Alege evenimentul</h1>
            <p>Sunt mai multe evenimente active. Alege unul și continuă rezervarea.</p>
          </div>
          <span className={styles.count}>
            <i aria-hidden="true" />
            {choices.length} evenimente active
          </span>
        </header>

        <ol className={styles.eventList} aria-label="Evenimente cu rezervări deschise">
          {choices.map((event, index) => (
            <li key={event.id}>
              <Link
                href={`/${event.slug}?checkout=1`}
                className={`${styles.eventChoice} pressable`}
                aria-label={`Rezervă bilet pentru ${event.title}`}
              >
                <div className={styles.poster}>
                  {event.photoUrl ? (
                    <Image
                      src={event.photoUrl}
                      alt={`Afișul evenimentului ${event.title}`}
                      fill
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      sizes="(max-width: 620px) 112px, 176px"
                      className={styles.posterImage}
                    />
                  ) : (
                    <span className={styles.posterFallback}>{event.title}</span>
                  )}
                </div>

                <div className={styles.eventDetails}>
                  <span className={styles.status}><i aria-hidden="true" />Rezervări deschise</span>
                  <h2>{event.title}</h2>
                  {event.subtitle ? <p>{event.subtitle}</p> : null}

                  <ul className={styles.facts}>
                    <li>
                      <CalendarDays size={17} strokeWidth={1.75} aria-hidden="true" />
                      <span><small>Data</small><strong>{event.dateLabel}</strong></span>
                    </li>
                    <li>
                      <Clock3 size={17} strokeWidth={1.75} aria-hidden="true" />
                      <span><small>Ora</small><strong>{event.timeLabel}</strong></span>
                    </li>
                    <li>
                      <MapPin size={17} strokeWidth={1.75} aria-hidden="true" />
                      <span><small>Locul</small><strong>{event.venue}</strong></span>
                    </li>
                  </ul>
                </div>

                <div className={styles.action}>
                  <span>
                    {event.priceRon === 0 ? "Gratuit" : `${event.priceRon.toLocaleString("ro-RO")} RON`}
                  </span>
                  <strong>
                    Alege
                    <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
                  </strong>
                </div>
              </Link>
            </li>
          ))}
        </ol>

        <Link href="/evenimente" className={styles.allEventsLink}>
          Vezi toate evenimentele
          <ArrowRight size={17} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </main>
    </div>
  );
}
