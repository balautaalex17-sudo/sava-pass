import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { EventRecord } from "@/lib/event-types";
import { CATEGORY_LABELS, formatEventDate } from "@/lib/event-display";
import { EventVisual } from "./EventVisual";
import styles from "./evenimente.module.css";

export function EventCard({
  event,
  prominent = false,
}: {
  event: EventRecord;
  prominent?: boolean;
}) {
  const href = event.internalTicketingUrl || `/evenimente/${event.slug}`;
  const isActive = event.eventStatus === "upcoming" || event.eventStatus === "ongoing";
  const canReserve = isActive && Boolean(event.registrationUrl);

  return (
    <article className={`${styles.eventCard} ${prominent ? styles.eventCardProminent : ""}`} data-category={event.category} data-event-card data-cover-src={event.coverImage.src || "typographic-fallback"}>
      <EventVisual event={event} />
      <div className={styles.cardBody}>
        <div className={styles.cardTopline}>
          <span>{CATEGORY_LABELS[event.category]}</span>
          <span className={`${styles.status} ${styles[`status_${event.eventStatus.replace("-", "_")}`]}`}>
            {isActive ? "Activ" : "Eveniment încheiat"}
          </span>
        </div>
        <p className={styles.cardDate}>{formatEventDate(event, true)}</p>
        <h3><Link href={href}>{event.title}</Link></h3>
        <p className={styles.cardDescription}>{event.shortDescription}</p>
        <div className={styles.cardFacts}>
          {event.venueName && <span><b>Loc</b>{event.venueName}</span>}
          {event.charitableCause && <span><b>Cauză</b>{event.charitableCause}</span>}
        </div>
        <Link
          className={styles.detailLink}
          href={href}
          aria-label={canReserve ? `Rezervă bilet pentru ${event.title}` : `Eveniment încheiat: ${event.title}`}
        >
          {canReserve ? "Rezervă bilet" : "Eveniment încheiat"} <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
