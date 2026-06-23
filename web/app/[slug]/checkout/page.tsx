import { notFound } from "next/navigation";
import { getEventBySlug, getEventStats, priceRon, seatsLeft } from "@/lib/events";
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
    title: event ? `Checkout ${event.title}` : "Checkout",
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status !== "active") notFound();

  const stats = await getEventStats(event.id);
  const left = seatsLeft(event, stats?.sold ?? 0);

  return (
    <CheckoutClient
      event={{
        slug: event.slug,
        title: event.title,
        subtitle: event.subtitle,
        dateLabel: event.date_label,
        venue: event.venue,
        photoUrl: event.photo_url,
        priceRon: priceRon(event.price_bani),
      }}
      seatsLeft={left}
    />
  );
}
