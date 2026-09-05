import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { EventEditor } from "@/app/(staff)/admin/events/EventEditor";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { isEventEnded } from "@/lib/event-lifecycle";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Editor eveniment",
  robots: { index: false, follow: false },
};

export default async function BoardEventEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("manage_public_events");
  const { id } = await params;
  const isNew = id === "new";
  // All inputs are known after authorization; no query depends on the event row.
  const [eventResult, { count }, { data: ticketTypes }, { data: mediaAssets }, { data: featuredEvents }] = await Promise.all([
    isNew ? Promise.resolve(null) : supabaseAdmin.from("events").select("*").eq("id", id).maybeSingle(),
    isNew ? Promise.resolve({ count: 0 }) : supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).eq("event_id", id),
    isNew ? Promise.resolve({ data: [] }) : supabaseAdmin.from("event_ticket_types").select("*").eq("event_id", id).order("sort").order("created_at"),
    supabaseAdmin.from("media_assets").select("id, file_name, public_url, source_kind").eq("archived", false).eq("excluded", false).order("quality_score", { ascending: false }),
    supabaseAdmin.from("events").select("id, title, status, ends_at, manually_ended_at, featured_slot").not("featured_slot", "is", null).order("featured_slot"),
  ]);
  if (!isNew && !eventResult?.data) notFound();

  const featuredSlots = ([1, 2, 3] as const).map((slot) => {
    const occupant = featuredEvents?.find((candidate) => candidate.featured_slot === slot) ?? null;
    return {
      slot,
      eventId: occupant?.id ?? null,
      eventTitle: occupant?.title ?? null,
      ended: occupant ? isEventEnded(occupant) : false,
    };
  });

  return (
    <div className="dash-page board-event-editor-page">
      <header className="dash-page-head">
        <div>
          <Link href="/board/evenimente" className="dash-back-link"><ChevronLeft size={16} /> Evenimente</Link>
          <h1>{isNew ? "Eveniment nou" : eventResult!.data!.title}</h1>
          <p>{count ? "Adresa publică este blocată deoarece există deja rezervări." : "Completează datele, ora de final și poziția opțională de pe Despre."}</p>
        </div>
      </header>
      <div className="board-event-editor">
        <EventEditor event={eventResult?.data ?? null} ticketTypes={ticketTypes ?? []} mediaAssets={mediaAssets ?? []} hasOrders={(count ?? 0) > 0} featuredSlots={featuredSlots} />
      </div>
    </div>
  );
}
