import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Eye, Pencil } from "lucide-react";
import { StatusControl } from "@/app/(staff)/admin/events/StatusControl";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { formatDateTime } from "@/lib/dashboard/format";
import { getActiveEvent, getAllEventsForAdmin, priceRon } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Evenimente publice",
  robots: { index: false, follow: false },
};

export default async function BoardEventsPage() {
  await requirePagePermission("manage_public_events");

  const [events, homepageEvent] = await Promise.all([
    getAllEventsForAdmin(),
    getActiveEvent(),
  ]);
  const { data: stats } = await supabaseAdmin.from("event_stats").select("event_id, sold, checked_in");
  const statsByEvent = new Map((stats ?? []).map((row) => [row.event_id, row]));
  const activeCount = events.filter((event) => event.status === "active").length;
  const publicCount = events.filter((event) => event.status !== "draft").length;
  // This server page evaluates expired active events once for the current request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const needsClosingCount = events.filter(
    (event) => event.status === "active" && new Date(event.starts_at).getTime() <= now,
  ).length;

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <span className="dash-eyebrow">Publicare simplă</span>
          <h1>Evenimente</h1>
          <p>Publici maximum 3 evenimente active. Toate apar în pagina Evenimente, iar cel mai apropiat apare și pe homepage.</p>
        </div>
        <Link href="/board/evenimente/new" className="dash-button"><CalendarPlus size={17} /> Eveniment nou</Link>
      </header>

      <section className="board-event-publishing-guide" aria-label="Reguli de publicare">
        <div>
          <strong>{activeCount}/3 active</strong>
          <span>{publicCount} {publicCount === 1 ? "eveniment public" : "evenimente publice"}</span>
        </div>
        <p>
          <b>Flux:</b> creezi o ciornă → publici → apeși „Încheie” după eveniment. Evenimentul rămâne public în arhivă.
        </p>
        <Link href="/evenimente"><Eye size={16} /> Vezi pagina publică</Link>
      </section>

      {needsClosingCount > 0 && (
        <p className="board-event-close-notice">
          {needsClosingCount === 1
            ? "Un eveniment activ are data trecută. Apasă „Încheie” pentru a elibera un loc."
            : `${needsClosingCount} evenimente active au data trecută. Apasă „Încheie” pentru a elibera locurile.`}
        </p>
      )}

      <div className="dash-card board-events-table">
        <table>
          <thead><tr><th>Eveniment</th><th>Status</th><th>Bilete</th><th>Preț</th><th><span className="sr-only">Acțiuni</span></th></tr></thead>
          <tbody>
            {events.map((event) => {
              const eventStats = statsByEvent.get(event.id);
              const sold = eventStats?.sold ?? 0;
              const checkedIn = eventStats?.checked_in ?? 0;
              const needsClosing = event.status === "active" && new Date(event.starts_at).getTime() <= now;
              const isHomepageEvent = event.id === homepageEvent?.id;
              const statusLabel = event.status === "draft"
                ? "Ciornă"
                : event.status === "past"
                  ? "Încheiat"
                  : "Activ";
              const statusClass = event.status === "active" && !needsClosing
                ? " dash-status--success"
                : event.status === "draft" || needsClosing
                  ? " dash-status--warning"
                  : "";
              const visibility = event.status === "draft"
                ? "Ascuns de pe site"
                : isHomepageEvent
                  ? `Homepage + Evenimente${needsClosing ? " · data a trecut" : ""}`
                  : `Pagina Evenimente${needsClosing ? " · data a trecut" : ""}`;

              return (
                <tr key={event.id}>
                  <td><strong>{event.title}</strong><span>{formatDateTime(event.starts_at)} · {event.venue}</span></td>
                  <td>
                    <span className={`dash-status${statusClass}`}>{statusLabel}</span>
                    <span className="board-event-visibility">{visibility}</span>
                  </td>
                  <td><strong>{sold} / {event.capacity}</strong><span>{checkedIn} intrați</span></td>
                  <td>{priceRon(event.price_bani)} RON</td>
                  <td>
                    <div className="board-event-actions">
                      {event.status !== "draft" && <Link href={`/${event.slug}`} aria-label={`Vezi ${event.title}`} title="Vezi pe site"><Eye size={16} /></Link>}
                      <Link href={`/board/evenimente/${event.id}`} className="board-event-edit-link" aria-label={`Editează ${event.title}`}><Pencil size={15} /> Editează</Link>
                      {event.status !== "active" && (
                        <StatusControl
                          id={event.id}
                          status="active"
                          label={activeCount >= 3 ? "Limită 3/3" : "Publică"}
                          disabledReason={activeCount >= 3 ? "Încheie un eveniment activ înainte să publici altul." : null}
                        />
                      )}
                      {event.status === "active" && <StatusControl id={event.id} status="past" label="Încheie" />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!events.length && <div className="dash-empty"><strong>Niciun eveniment</strong>Creează primul eveniment SavaPass.</div>}
      </div>
    </div>
  );
}
