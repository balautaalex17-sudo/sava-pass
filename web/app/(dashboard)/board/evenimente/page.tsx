import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Eye, Pencil } from "lucide-react";
import { StatusControl } from "@/app/(staff)/admin/events/StatusControl";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { getManagedArchiveEvents } from "@/lib/event-archive";
import { CATEGORY_LABELS, STATUS_LABELS, formatEventDate } from "@/lib/event-display";
import { getAllEventsForAdmin, priceRon } from "@/lib/events";
import { formatDateTime } from "@/lib/dashboard/format";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Evenimente publice",
  robots: { index: false, follow: false },
};

const statusLabels = { draft: "Ciornă", active: "Public pe site", past: "Arhivat" } as const;

export default async function BoardEventsPage() {
  await requirePagePermission("manage_public_events");
  const [events, importedRows] = await Promise.all([getAllEventsForAdmin(), getManagedArchiveEvents()]);
  const ticketingSlugs = new Set(events.map((event) => event.slug));
  const importedEvents = importedRows
    .filter((event) => !ticketingSlugs.has(event.slug))
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  const { data: stats } = await supabaseAdmin.from("event_stats").select("event_id, sold, checked_in");
  const statsByEvent = new Map((stats ?? []).map((row) => [row.event_id, row]));
  const activeCount = events.filter((event) => event.status === "active").length;

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <span className="dash-eyebrow">Site public și bilete</span>
          <h1>Evenimente</h1>
          <p>Poți publica simultan până la 3 evenimente. Cel mai apropiat apare pe pagina principală, iar toate apar în pagina de evenimente.</p>
        </div>
        <Link href="/board/evenimente/new" className="dash-button"><CalendarPlus size={17} /> Eveniment nou</Link>
      </header>

      <div className="dash-card board-events-table">
        <table>
          <thead><tr><th>Eveniment</th><th>Status</th><th>Bilete</th><th>Preț</th><th><span className="sr-only">Acțiuni</span></th></tr></thead>
          <tbody>
            {events.map((event) => {
              const eventStats = statsByEvent.get(event.id);
              const sold = eventStats?.sold ?? 0;
              const checkedIn = eventStats?.checked_in ?? 0;
              return (
                <tr key={event.id}>
                  <td><strong>{event.title}</strong><span>{formatDateTime(event.starts_at)} · {event.venue}</span></td>
                  <td><span className={`dash-status${event.status === "active" ? " dash-status--success" : event.status === "draft" ? " dash-status--warning" : ""}`}>{statusLabels[event.status]}</span></td>
                  <td><strong>{sold} / {event.capacity}</strong><span>{checkedIn} intrați</span></td>
                  <td>{priceRon(event.price_bani)} RON</td>
                  <td>
                    <div className="board-event-actions">
                      {event.status !== "draft" && <Link href={`/${event.slug}`} aria-label={`Vezi ${event.title}`} title="Vezi pe site"><Eye size={16} /></Link>}
                      <Link href={`/board/evenimente/${event.id}`} aria-label={`Editează ${event.title}`} title="Editează"><Pencil size={16} /></Link>
                      {event.status !== "active" && <StatusControl id={event.id} status="active" label={activeCount >= 3 ? "Limită 3/3" : "Publică"} disabledReason={activeCount >= 3 ? "Arhivează un eveniment activ înainte să publici altul." : null} />}
                      {event.status === "active" && <StatusControl id={event.id} status="past" label="Arhivează" />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!events.length && <div className="dash-empty"><strong>Niciun eveniment</strong>Creează primul eveniment public SavaPass.</div>}
      </div>

      <section style={{ display: "grid", gap: 14, marginTop: 28 }}>
        <header>
          <span className="dash-eyebrow">Carduri publice importate</span>
          <h2 style={{ margin: "5px 0 4px", fontSize: 22 }}>Arhivă și eveniment promovat</h2>
          <p style={{ margin: 0, color: "var(--dash-muted)", fontSize: 13, lineHeight: 1.6 }}>
            Aici editezi Golden Hour și evenimentele aduse din Instagram. Modificările apar pe pagina Evenimente, iar Golden Hour apare și pe homepage când nu există un eveniment activ cu bilete.
          </p>
        </header>

        <div className="dash-card board-events-table">
          <table>
            <thead><tr><th>Eveniment</th><th>Vizibilitate</th><th>Categorie</th><th>Loc</th><th><span className="sr-only">Acțiuni</span></th></tr></thead>
            <tbody>
              {importedEvents.map((event) => (
                <tr key={event.id}>
                  <td><strong>{event.title}</strong><span>{formatEventDate(event)}</span></td>
                  <td>
                    <span className={`dash-status${event.publishingStatus === "published" && event.eventStatus !== "past" ? " dash-status--success" : event.publishingStatus === "draft" ? " dash-status--warning" : ""}`}>
                      {event.publishingStatus === "draft" ? "Ascuns" : STATUS_LABELS[event.eventStatus]}
                    </span>
                  </td>
                  <td>{CATEGORY_LABELS[event.category]}</td>
                  <td>{event.venueName || "Necompletat"}</td>
                  <td>
                    <div className="board-event-actions">
                      {event.publishingStatus === "published" && <Link href={`/evenimente/${event.slug}`} aria-label={`Vezi ${event.title}`} title="Vezi pe site"><Eye size={16} /></Link>}
                      <Link href={`/board/evenimente/arhiva/${event.slug}`} aria-label={`Editează ${event.title}`} title="Editează"><Pencil size={16} /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!importedEvents.length && <div className="dash-empty"><strong>Nicio arhivă importată</strong>Evenimentele importate vor apărea aici.</div>}
        </div>
      </section>
    </div>
  );
}
