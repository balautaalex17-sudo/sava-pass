import { notFound } from "next/navigation";
import { eventIsBookable, getEventBySlug } from "@/lib/events";
import { getAvailability } from "@/lib/event-availability";
import { formatCompactEventDate } from "@/lib/event-display";
import { EventPurchaseExperience } from "@/components/events/EventPurchaseExperience";
import styles from "@/components/events/event-purchase.module.css";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ticket?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return {
    title: event ? `Rezervare ${event.title}` : "Rezervare",
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const [{ slug }, { ticket }] = await Promise.all([params, searchParams]);
  const event = await getEventBySlug(slug);
  if (!event || !eventIsBookable(event)) notFound();
  const { purchaseState, sold, remaining, ticketTypes } = await getAvailability(event);
  const cause = event.charitable_cause?.trim() || null;

  return (
    <div className={`sp-light ${styles.checkoutLayout}`}>
      <main id="continut-principal">
        <EventPurchaseExperience
          checkoutPage
          initialTicketId={ticket}
          event={{
            slug: event.slug,
            title: event.title,
            dateLabel: formatCompactEventDate(event.starts_at),
            dateLong: event.date_long,
            timeLabel: event.doors,
            venue: event.venue,
            photoUrl: event.photo_url,
            capacity: event.capacity,
            causeCopy: cause || null,
            causeTitle: "Cauza susținută",
          }}
          requestKey={crypto.randomUUID()}
          state={purchaseState}
          sold={sold}
          seatsLeft={remaining}
          ticketTypes={ticketTypes}
        />
      </main>
    </div>
  );
}
