import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Pencil, Search } from "lucide-react";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { formatDateTime } from "@/lib/dashboard/format";
import { isEventEnded, sortPublicEvents } from "@/lib/event-lifecycle";
import { normalizeSearch } from "@/lib/event-display";
import { getAllEventsForAdmin, priceRon } from "@/lib/events";
import {
  ArchivePlacementControl,
  RemoveFeaturedButton,
  type SlotChoice,
} from "../EventManagementControls";
import { EventManagementTabs } from "../EventManagementTabs";

export const metadata: Metadata = {
  title: "Arhivă evenimente",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type ArchivePageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function BoardArchiveEventsPage({ searchParams }: ArchivePageProps) {
  await requirePagePermission("manage_public_events");

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const normalizedQuery = normalizeSearch(query);
  const events = await getAllEventsForAdmin();
  const publicEvents = events.filter((event) => event.status !== "draft");
  const endedEvents = sortPublicEvents(publicEvents).filter((event) => isEventEnded(event));
  const featuredEvents = publicEvents.filter((event) => event.featured_slot !== null);
  const visibleEvents = normalizedQuery
    ? endedEvents.filter((event) => normalizeSearch([
        event.title,
        event.venue,
        event.date_label,
        event.date_long,
      ].join(" ")).includes(normalizedQuery))
    : endedEvents;
  const slots: SlotChoice[] = ([1, 2, 3] as const).map((slot) => {
    const occupant = featuredEvents.find((event) => event.featured_slot === slot) ?? null;
    return {
      slot,
      occupantId: occupant?.id ?? null,
      occupantTitle: occupant?.title ?? null,
      occupantEnded: occupant ? isEventEnded(occupant) : false,
    };
  });

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <span className="dash-eyebrow">Istoric păstrat</span>
          <h1>Arhivă evenimente</h1>
          <p>Toate evenimentele încheiate apar aici, inclusiv cele care ocupă în continuare un slot pe Despre.</p>
        </div>
        <Link href="/evenimente" className="dash-button dash-button--secondary"><Eye size={17} /> Vezi Evenimente</Link>
      </header>

      <EventManagementTabs
        active="archive"
        featuredCount={featuredEvents.length}
        endedCount={endedEvents.length}
      />

      <section className="board-event-publishing-guide" aria-label="Regulile arhivei">
        <div><strong>{endedEvents.length} încheiate</strong><span>{featuredEvents.filter((event) => isEventEnded(event)).length} rămân pe Despre</span></div>
        <p><b>Arhiva nu schimbă poziția:</b> un eveniment poate fi simultan încheiat și afișat pe Despre. Adăugarea într-un slot nu îl reactivează.</p>
        <Link href="/board/evenimente">Gestionează sloturile</Link>
      </section>

      <form className="board-archive-search" role="search" action="/board/evenimente/arhiva">
        <label className="sr-only" htmlFor="archive-event-search">Caută un eveniment încheiat</label>
        <span className="board-archive-search__field">
          <Search size={17} aria-hidden="true" />
          <input id="archive-event-search" name="q" type="search" defaultValue={query} placeholder="Caută după nume, dată sau locație" />
        </span>
        <button className="dash-button dash-button--secondary" type="submit">Caută</button>
        {query && <Link href="/board/evenimente/arhiva">Șterge căutarea</Link>}
      </form>

      <div className="dash-card board-events-table">
        <table>
          <thead><tr><th>Eveniment</th><th>Status</th><th>Despre</th><th>Preț</th><th><span className="sr-only">Acțiuni</span></th></tr></thead>
          <tbody>
            {visibleEvents.map((event) => {
              const currentSlot = event.featured_slot as 1 | 2 | 3 | null;
              return (
                <tr key={event.id}>
                  <td><strong>{event.title}</strong><span>{formatDateTime(event.starts_at)} · {event.venue}</span></td>
                  <td><span className="dash-status">Eveniment încheiat</span><span>Încheiat la {formatDateTime(event.manually_ended_at ?? event.ends_at)}</span></td>
                  <td>
                    <ArchivePlacementControl eventId={event.id} currentSlot={currentSlot} slots={slots} />
                    {currentSlot && <RemoveFeaturedButton eventId={event.id} slot={currentSlot} />}
                  </td>
                  <td>{priceRon(event.price_bani)} RON</td>
                  <td><div className="board-event-actions"><Link href={`/${event.slug}`} aria-label={`Vezi ${event.title}`} title="Vezi pe site"><Eye size={16} /></Link><Link href={`/board/evenimente/${event.id}`} className="board-event-edit-link"><Pencil size={15} /> Editează</Link></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visibleEvents.length && (
          <div className="dash-empty"><strong>{query ? "Niciun rezultat" : "Arhiva este goală"}</strong>{query ? "Încearcă un alt nume, an sau loc." : "Evenimentele apar automat aici după ora de încheiere sau după încheierea manuală."}</div>
        )}
      </div>
    </div>
  );
}
