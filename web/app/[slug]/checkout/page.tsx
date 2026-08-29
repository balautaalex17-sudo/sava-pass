import { notFound } from "next/navigation";
import { eventIsBookable, getEventBySlug, getEventStats, getEventTicketTypes, getTicketTypeSoldCounts, priceRon, seatsLeft } from "@/lib/events";
import { CheckoutClient } from "./CheckoutClient";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

// Perf (U5): cached event details, but live availability — render per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return {
    title: event ? `Rezervare ${event.title}` : "Rezervare",
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || !eventIsBookable(event)) notFound();

  const [stats, ticketTypes, typeSold] = await Promise.all([
    getEventStats(event.id),
    getEventTicketTypes(event.id),
    getTicketTypeSoldCounts(event.id),
  ]);
  const left = seatsLeft(event, stats?.sold ?? 0);
  const availableTypes = ticketTypes
    .map((type) => ({
      id: type.id,
      name: type.name,
      description: type.description,
      priceRon: priceRon(type.price_bani),
      seatsLeft: Math.max(0, type.capacity - (typeSold[type.id] ?? 0)),
    }));

  return (
    <CheckoutClient
      requestKey={crypto.randomUUID()}
      event={{
        slug: event.slug,
        title: event.title,
        subtitle: event.subtitle,
        dateLabel: event.date_label,
        venue: event.venue,
        photoUrl: event.photo_url,
      }}
      seatsLeft={left}
      ticketTypes={availableTypes}
    />
  );
}
