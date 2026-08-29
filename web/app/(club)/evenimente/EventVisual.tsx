import Image from "next/image";
import type { EventRecord } from "@/lib/event-types";
import { formatEventDate } from "@/lib/event-display";
import styles from "./evenimente.module.css";

export function EventVisual({
  event,
  priority = false,
  sizes = "(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 38vw",
  className = "",
}: {
  event: EventRecord;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  if (!event.coverImage.src) {
    return (
      <div className={`${styles.fallbackVisual} ${className}`} data-category={event.category} aria-label={event.coverImage.alt} role="img">
        <span className={styles.fallbackYear}>{event.startDate?.slice(0, 4) || "SAVA"}</span>
        <strong>{event.title}</strong>
        <span>{formatEventDate(event)}</span>
      </div>
    );
  }

  const isPoster = event.coverImage.type === "poster";
  return (
    <div className={`${styles.eventVisual} ${isPoster ? styles.posterVisual : styles.photoVisual} ${className}`} data-category={event.category}>
      <Image
        src={event.coverImage.src}
        alt={event.coverImage.alt}
        fill
        priority={priority}
        quality={86}
        sizes={sizes}
        className={isPoster ? styles.posterImage : styles.photoImage}
        style={{ objectPosition: event.coverImage.position || "center" }}
      />
    </div>
  );
}
