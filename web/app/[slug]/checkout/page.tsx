import { notFound, redirect } from "next/navigation";
import { eventIsBookable, getEventBySlug } from "@/lib/events";
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

  redirect(`/${event.slug}?checkout=1`);
}
