import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { EventRecord } from "@/lib/event-types";
import { academicYearForDate, CATEGORY_LABELS, formatEventDate } from "@/lib/event-display";
import { EventVisual } from "./EventVisual";
import styles from "./events-index.module.css";

export function CompactEventCard({ event }: { event: EventRecord }) {
  const academicYear = academicYearForDate(event.startDate);
  const href = event.internalTicketingUrl || `/evenimente/${event.slug}`;

  return (
    <article
      className={styles.eventCard}
      data-category={event.category}
      data-event-card
      data-cover-src={event.coverImage.src || "typographic-fallback"}
    >
      <EventVisual
        event={event}
        sizes="(max-width: 599px) 40vw, (max-width: 820px) 50vw, (max-width: 1100px) 33vw, 220px"
        className={styles.cardMedia}
      />
      <div className={styles.cardBody}>
        <div className={styles.cardTopline}>
          <span>{CATEGORY_LABELS[event.category]}</span>
          {academicYear && <span>Anul {academicYear.slice(0, 4)}–{academicYear.slice(-2)}</span>}
        </div>
        <p className={styles.cardDate}><CalendarDays size={14} aria-hidden="true" />{formatEventDate(event)}</p>
        <h3>{event.title}</h3>
        <p className={styles.cardDescription}>{event.shortDescription}</p>
        {event.venueName && <p className={styles.cardVenue}><MapPin size={14} aria-hidden="true" />{event.venueName}</p>}
        <Link className={styles.cardLink} href={href} aria-label={`Vezi detaliile evenimentului ${event.title}`}>
          Vezi detalii <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
