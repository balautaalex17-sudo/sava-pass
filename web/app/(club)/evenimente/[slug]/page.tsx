import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { HomeNav } from "@/app/HomeNav";
import { SiteFooter } from "@/components/club/SiteFooter";
import { getManagedEventBySlug, getManagedRelatedEvents } from "@/lib/event-archive";
import { CATEGORY_LABELS, STATUS_LABELS, formatEventDate, formatEventTime } from "@/lib/event-display";
import { EventCard } from "../EventCard";
import { EventVisual } from "../EventVisual";
import styles from "../evenimente.module.css";
import detailStyles from "./event-detail.module.css";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getManagedEventBySlug((await params).slug);
  if (!event) return { title: "Eveniment negăsit · SavaPass" };
  return {
    title: `${event.title} · Evenimente SavaPass`,
    description: event.shortDescription,
    robots: { index: false, follow: false },
    openGraph: event.coverImage.src ? { images: [{ url: event.coverImage.src, alt: event.coverImage.alt }] } : undefined,
  };
}

export default async function EventDetailPage({ params }: Props) {
  const event = await getManagedEventBySlug((await params).slug);
  if (!event) notFound();
  const related = await getManagedRelatedEvents(event, 2);
  const time = formatEventTime(event);
  const ctaHref = event.registrationUrl;

  return (
    <div className={`${styles.detailShell} ${detailStyles.detailPage}`}>
      <HomeNav active="evenimente" immersive dark />
      <main className={styles.detailMain} id="continut-principal">
        <Link href="/evenimente" className={styles.backLink}><ArrowLeft size={18} aria-hidden="true" />Înapoi la evenimente</Link>
        <header className={`${styles.detailHero} ${detailStyles.hero}`}>
          <div className={styles.detailIntro}>
            <p className={styles.detailMeta}>
              <span>{CATEGORY_LABELS[event.category]}</span>
              <span aria-hidden="true">·</span>
              <span>{STATUS_LABELS[event.eventStatus]}</span>
            </p>
            <h1>{event.title}</h1>
            {event.subtitle && <p className={styles.detailSubtitle}>{event.subtitle}</p>}
            <p className={styles.detailLead}>{event.shortDescription}</p>
            <dl className={styles.factList}>
              <div><dt>Data</dt><dd>{formatEventDate(event, true)}</dd></div>
              {time && <div><dt>Ora</dt><dd>{time}</dd></div>}
              {event.venueName && <div><dt>Locul</dt><dd>{event.venueName}</dd></div>}
              {(event.donationText || event.ticketPrice) && <div><dt>Participare</dt><dd>{event.ticketPrice || event.donationText}</dd></div>}
            </dl>
            {ctaHref && <a href={ctaHref} className={styles.primaryLink} target={ctaHref.startsWith("http") ? "_blank" : undefined} rel={ctaHref.startsWith("http") ? "noopener noreferrer" : undefined}>Deschide înscrierea<ArrowUpRight size={18} aria-hidden="true" /></a>}
          </div>
          <EventVisual event={event} priority className={styles.detailVisual} />
        </header>

        <section className={detailStyles.story} aria-labelledby="story-title">
          <article className={detailStyles.article}>
            <h2 className={detailStyles.title} id="story-title">Despre eveniment</h2>
            <p className={detailStyles.copy}>{event.fullDescription || event.shortDescription}</p>
            {event.charitableCause && (
              <section className={detailStyles.cause} aria-labelledby="cause-title">
                <h3 className={detailStyles.causeTitle} id="cause-title">Cauza susținută</h3>
                <p className={detailStyles.causeText}>{event.charitableCause}</p>
              </section>
            )}
            {(event.address || event.mapsUrl) && (
              <section className={detailStyles.info}>
                <h3>Locație</h3>
                {event.address && <p>{event.address}</p>}
                {event.mapsUrl && <a href={event.mapsUrl} target="_blank" rel="noopener noreferrer">Deschide în Maps <ArrowUpRight size={16} aria-hidden="true" /></a>}
              </section>
            )}
            {event.collaborators.length > 0 && <section className={detailStyles.info}><h3>Colaboratori</h3><p>{event.collaborators.join(" · ")}</p></section>}
            {event.sponsors.length > 0 && <section className={detailStyles.info}><h3>Sponsori</h3><p>{event.sponsors.join(" · ")}</p></section>}
          </article>
        </section>

        {related.length > 0 && (
          <section className={detailStyles.related} aria-labelledby="related-title">
            <h2 className={detailStyles.relatedTitle} id="related-title">Alte evenimente</h2>
            <div className={detailStyles.relatedGrid}>{related.map((candidate) => <EventCard event={candidate} key={candidate.id} />)}</div>
          </section>
        )}
      </main>
      <SiteFooter eventHref="/evenimente" />
    </div>
  );
}
