import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getActiveEvents, priceRon } from "@/lib/events";
import { resolveReservationRoute } from "@/lib/reservation-route";

import { ReservationChooser } from "./ReservationChooser";

export const metadata: Metadata = {
  title: "Alege evenimentul",
  description: "Alege evenimentul Interact Sf. Sava pentru care vrei să rezervi un bilet.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ReservationPage() {
  const activeEvents = await getActiveEvents();
  const decision = resolveReservationRoute(activeEvents);

  if (decision.kind === "redirect") {
    redirect(decision.href);
  }

  const choices = activeEvents.map((event) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    subtitle: event.subtitle,
    dateLabel: event.date_long,
    timeLabel: event.doors,
    venue: event.venue,
    photoUrl: event.photo_url,
    priceRon: priceRon(event.price_bani),
  }));

  return <ReservationChooser choices={choices} />;
}
