import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarPlus, Eye, Pencil } from "lucide-react";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { formatDateTime } from "@/lib/dashboard/format";
import { getEventStatus, isEventEnded, sortPublicEvents } from "@/lib/event-lifecycle";
import { getAllEventsForAdmin, priceRon } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  EndEventDialog,
  RemoveFeaturedButton,
  SlotAssignmentForm,
  type FeaturedCandidate,
} from "./EventManagementControls";
import { EventManagementTabs } from "./EventManagementTabs";

export const metadata: Metadata = {
  title: "Evenimente pe Despre",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function BoardEventsPage() {
  await requirePagePermission("manage_public_events");

  const [events, statsResult] = await Promise.all([
    getAllEventsForAdmin(),
    supabaseAdmin.from("event_stats").select("event_id, sold, checked_in"),
  ]);
  const statsByEvent = new Map((statsResult.data ?? []).map((row) => [row.event_id, row]));
  const publicEvents = events.filter((event) => event.status !== "draft");
  const endedEvents = sortPublicEvents(publicEvents).filter((event) => isEventEnded(event));
  const featuredEvents = publicEvents.filter((event) => event.featured_slot !== null);
  const candidates: FeaturedCandidate[] = sortPublicEvents(
    publicEvents.filter((event) => event.featured_slot === null),
  ).map((event) => ({
    id: event.id,
    title: event.title,
    ended: isEventEnded(event),
  }));
  const activeWithoutSlot = sortPublicEvents(
    publicEvents.filter((event) => event.featured_slot === null && !isEventEnded(event)),
  );
  const drafts = events.filter((event) => event.status === "draft");

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <span className="dash-eyebrow">Poziții alese manual</span>
          <h1>Evenimente pe Despre</h1>
          <p>Administrezi exact cele trei poziții de pe pagina Despre. Poziția și statusul evenimentului sunt independente.</p>
        </div>
        <div className="board-event-head-actions">
          <Link href="/despre" className="dash-button dash-button--secondary"><Eye size={17} /> Vezi Despre</Link>
          <Link href="/board/evenimente/new" className="dash-button"><CalendarPlus size={17} /> Eveniment nou</Link>
        </div>
      </header>

      <EventManagementTabs
        active="featured"
        featuredCount={featuredEvents.length}
        endedCount={endedEvents.length}
      />

      <section className="board-event-publishing-guide" aria-label="Reguli pentru pozițiile Despre">
        <div>
          <strong>{featuredEvents.length}/3 poziții ocupate</strong>
          <span>{publicEvents.length} evenimente publice în total</span>
        </div>
        <p><b>Important:</b> încheierea nu scoate evenimentul din slot. Doar o eliminare sau înlocuire explicită îi schimbă poziția pe Despre.</p>
        <Link href="/evenimente"><Eye size={16} /> Vezi Evenimente</Link>
      </section>

      <section className="board-event-workspace" aria-labelledby="featured-slots-title">
        <div className="board-event-workspace__head">
          <span className="dash-eyebrow">Ordine fixă</span>
          <h2 id="featured-slots-title">Cele trei sloturi</h2>
          <p>Sloturile sunt randate pe `/despre` în ordinea 1, 2, 3. Data evenimentului nu schimbă această ordine.</p>
        </div>

        <div className="board-featured-grid">
          {([1, 2, 3] as const).map((slot) => {
            const event = featuredEvents.find((candidate) => candidate.featured_slot === slot) ?? null;
            if (!event) {
              return (
                <article className="dash-card board-featured-slot board-featured-slot--empty" key={slot}>
                  <div className="board-featured-slot__topline"><span>Slot {slot}</span><span className="dash-status">Liber</span></div>
                  <div className="board-featured-slot__empty">
                    <strong>Niciun eveniment ales</strong>
                    <p>Alege un eveniment activ sau încheiat. Alegerea nu îi schimbă statusul.</p>
                  </div>
                  <SlotAssignmentForm slot={slot} candidates={candidates} />
                </article>
              );
            }

            const ended = isEventEnded(event);
            const stats = statsByEvent.get(event.id);
            return (
              <article className="dash-card board-featured-slot" key={slot}>
                <div className="board-featured-slot__topline">
                  <span>Slot {slot}</span>
                  <span className={`dash-status${ended ? "" : " dash-status--success"}`}>
                    {getEventStatus(event) === "ended" ? "Eveniment încheiat" : "Activ"}
                  </span>
                </div>
                <div className="board-featured-slot__media">
                  {event.photo_url ? (
                    <Image src={event.photo_url} alt="" fill sizes="(max-width: 900px) 100vw, 33vw" />
                  ) : (
                    <span aria-hidden>{String(slot).padStart(2, "0")}</span>
                  )}
                </div>
                <div className="board-featured-slot__copy">
                  <h3>{event.title}</h3>
                  <p>{formatDateTime(event.starts_at)} – {formatDateTime(event.ends_at)}</p>
                  <small>{event.venue} · {stats?.sold ?? 0}/{event.capacity} bilete · {priceRon(event.price_bani)} RON</small>
                </div>
                <div className="board-featured-slot__actions">
                  <Link href={`/${event.slug}`} className="dash-button dash-button--secondary"><Eye size={15} /> Vezi</Link>
                  <Link href={`/board/evenimente/${event.id}`} className="dash-button dash-button--secondary"><Pencil size={15} /> Editează</Link>
                  {!ended && <EndEventDialog eventId={event.id} eventTitle={event.title} />}
                  <RemoveFeaturedButton eventId={event.id} slot={slot} />
                </div>
                {ended && (
                  <div className="board-featured-slot__replace">
                    <strong>Înlocuiește acest eveniment încheiat</strong>
                    <p>Evenimentul vechi rămâne în Arhivă și pe pagina Evenimente.</p>
                    <SlotAssignmentForm slot={slot} expectedOccupantId={event.id} candidates={candidates} replace />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="board-event-source" aria-labelledby="active-unfeatured-title">
        <div className="board-event-source__head">
          <div><span className="dash-eyebrow">Tot active</span><h3 id="active-unfeatured-title">Evenimente active fără slot</h3></div>
          <p>{activeWithoutSlot.length} {activeWithoutSlot.length === 1 ? "eveniment" : "evenimente"}</p>
        </div>
        <div className="dash-card board-events-table">
          <table>
            <thead><tr><th>Eveniment</th><th>Status</th><th>Bilete</th><th><span className="sr-only">Acțiuni</span></th></tr></thead>
            <tbody>
              {activeWithoutSlot.map((event) => {
                const stats = statsByEvent.get(event.id);
                return (
                  <tr key={event.id}>
                    <td><strong>{event.title}</strong><span>{formatDateTime(event.starts_at)} – {formatDateTime(event.ends_at)}</span></td>
                    <td><span className="dash-status dash-status--success">Activ</span><span>Nu apare pe Despre</span></td>
                    <td><strong>{stats?.sold ?? 0} / {event.capacity}</strong><span>{stats?.checked_in ?? 0} intrați</span></td>
                    <td><div className="board-event-actions"><Link href={`/board/evenimente/${event.id}`} className="board-event-edit-link"><Pencil size={15} /> Editează</Link><EndEventDialog eventId={event.id} eventTitle={event.title} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!activeWithoutSlot.length && <div className="dash-empty"><strong>Niciun eveniment activ fără slot</strong>Toate evenimentele active sunt deja poziționate sau nu există încă.</div>}
        </div>
      </section>

      {drafts.length > 0 && (
        <section className="board-event-source" aria-labelledby="draft-events-title">
          <div className="board-event-source__head">
            <div><span className="dash-eyebrow">Ascunse</span><h3 id="draft-events-title">Ciorne</h3></div>
            <p>{drafts.length}</p>
          </div>
          <div className="dash-card board-events-table">
            <table>
              <thead><tr><th>Eveniment</th><th>Status</th><th><span className="sr-only">Acțiuni</span></th></tr></thead>
              <tbody>{drafts.map((event) => <tr key={event.id}><td><strong>{event.title}</strong><span>{formatDateTime(event.starts_at)}</span></td><td><span className="dash-status dash-status--warning">Ciornă</span></td><td><div className="board-event-actions"><Link href={`/board/evenimente/${event.id}`} className="board-event-edit-link"><Pencil size={15} /> Editează și publică</Link></div></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
