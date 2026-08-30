import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Eye, Pencil } from "lucide-react";
import { StatusControl } from "@/app/(staff)/admin/events/StatusControl";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { getManagedArchiveEvents } from "@/lib/event-archive";
import { CATEGORY_LABELS, STATUS_LABELS, formatEventDate } from "@/lib/event-display";
import { getActiveEvent, getAllEventsForAdmin, getPastEvents, priceRon } from "@/lib/events";
import { formatDateTime } from "@/lib/dashboard/format";
import { GOLDEN_HOUR } from "@/lib/golden-hour";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Evenimente publice",
  robots: { index: false, follow: false },
};

const statusLabels = { draft: "Ciornă", active: "Public pe site", past: "Arhivat" } as const;

export default async function BoardEventsPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  await requirePagePermission("manage_public_events");
  const params = await searchParams;
  const view = params.view === "archive" ? "archive" : "ticketing";
  const [events, importedRows, homepageEvent, homepagePastEvents] = await Promise.all([
    getAllEventsForAdmin(),
    getManagedArchiveEvents(),
    getActiveEvent(),
    getPastEvents(),
  ]);
  const ticketingSlugs = new Set(events.map((event) => event.slug));
  const importedEvents = importedRows
    .filter((event) => !ticketingSlugs.has(event.slug))
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  const { data: stats } = await supabaseAdmin.from("event_stats").select("event_id, sold, checked_in");
  const statsByEvent = new Map((stats ?? []).map((row) => [row.event_id, row]));
  const activeCount = events.filter((event) => event.status === "active").length;
  const homepageEventId = homepageEvent?.id;
  const homepageArchiveIds = new Set(homepagePastEvents.slice(0, 2).map((event) => event.id));

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <span className="dash-eyebrow">Două zone de editare</span>
          <h1>Evenimente</h1>
          <p>Alege separat ce editezi pe homepage și ce editezi în arhiva publică a paginii Evenimente.</p>
        </div>
        {view === "ticketing"
          ? <Link href="/board/evenimente/new" className="dash-button"><CalendarPlus size={17} /> Eveniment nou</Link>
          : <Link href="/evenimente" className="dash-button dash-button--secondary"><Eye size={17} /> Vezi pagina Evenimente</Link>}
      </header>

      <nav className="board-event-view-tabs" aria-label="Zone de editare evenimente">
        <Link href="/board/evenimente?view=ticketing" className="board-event-view-tab" aria-current={view === "ticketing" ? "page" : undefined}>
          <span><strong>Homepage și bilete</strong><small>Eveniment principal + „Din arhivă”</small></span>
          <b>{events.length}</b>
        </Link>
        <Link href="/board/evenimente?view=archive" className="board-event-view-tab" aria-current={view === "archive" ? "page" : undefined}>
          <span><strong>Pagina Evenimente</strong><small>Golden Hour + arhiva importată</small></span>
          <b>{importedEvents.length}</b>
        </Link>
      </nav>

      {view === "ticketing" && (
        <section className="board-event-workspace">
          <header className="board-event-workspace__head">
            <span className="dash-eyebrow">Homepage și bilete</span>
            <h2>Evenimente cu bilete</h2>
            <p>Aceste rânduri controlează evenimentul principal și cardurile „Din arhivă” de pe homepage. Cele mai recente două evenimente arhivate apar acolo; toate cele publice apar și în pagina Evenimente.</p>
          </header>

          <div className="dash-card board-events-table">
            <table>
              <thead><tr><th>Eveniment</th><th>Status</th><th>Apare în</th><th>Bilete</th><th>Preț</th><th><span className="sr-only">Acțiuni</span></th></tr></thead>
              <tbody>
                {events.map((event) => {
                  const eventStats = statsByEvent.get(event.id);
                  const sold = eventStats?.sold ?? 0;
                  const checkedIn = eventStats?.checked_in ?? 0;
                  const placement = event.status === "draft"
                    ? { title: "Ascuns peste tot", detail: "Publică pentru a-l afișa" }
                    : event.id === homepageEventId
                      ? { title: "Homepage · principal", detail: "Și în pagina Evenimente" }
                      : homepageArchiveIds.has(event.id)
                        ? { title: "Homepage · Din arhivă", detail: "Și în pagina Evenimente" }
                        : { title: "Pagina Evenimente", detail: "Nu apare pe homepage" };
                  return (
                    <tr key={event.id}>
                      <td><strong>{event.title}</strong><span>{formatDateTime(event.starts_at)} · {event.venue}</span></td>
                      <td><span className={`dash-status${event.status === "active" ? " dash-status--success" : event.status === "draft" ? " dash-status--warning" : ""}`}>{statusLabels[event.status]}</span></td>
                      <td><span className="board-event-placement">{placement.title}</span><span>{placement.detail}</span></td>
                      <td><strong>{sold} / {event.capacity}</strong><span>{checkedIn} intrați</span></td>
                      <td>{priceRon(event.price_bani)} RON</td>
                      <td>
                        <div className="board-event-actions">
                          {event.status !== "draft" && <Link href={`/${event.slug}`} aria-label={`Vezi ${event.title}`} title="Vezi pe site"><Eye size={16} /></Link>}
                          <Link href={`/board/evenimente/${event.id}`} className="board-event-edit-link" aria-label={`Editează ${event.title}`}><Pencil size={15} /> Editează</Link>
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
        </section>
      )}

      {view === "archive" && (
        <section className="board-event-workspace">
          <header className="board-event-workspace__head">
            <span className="dash-eyebrow">Pagina Evenimente</span>
            <h2>Golden Hour și arhiva importată</h2>
            <p>Aici editezi cardurile aduse din Instagram. Dacă un eveniment are și o versiune cu bilete, îl editezi din primul tab; Golden Hour apare și pe homepage când nu există un eveniment activ cu bilete.</p>
          </header>

          <div className="dash-card board-events-table">
            <table>
              <thead><tr><th>Eveniment</th><th>Vizibilitate</th><th>Apare în</th><th>Categorie</th><th>Loc</th><th><span className="sr-only">Acțiuni</span></th></tr></thead>
              <tbody>
                {importedEvents.map((event) => {
                  const isGoldenHour = event.slug === GOLDEN_HOUR.slug;
                  const placement = event.publishingStatus === "draft"
                    ? { title: "Ascuns peste tot", detail: "Publică pentru a-l afișa" }
                    : isGoldenHour
                      ? { title: "Homepage · rezervă", detail: "Și în pagina Evenimente" }
                      : { title: "Pagina Evenimente", detail: "Arhivă publică" };
                  return (
                    <tr key={event.id}>
                      <td><strong>{event.title}</strong><span>{formatEventDate(event)}</span></td>
                      <td>
                        <span className={`dash-status${event.publishingStatus === "published" && event.eventStatus !== "past" ? " dash-status--success" : event.publishingStatus === "draft" ? " dash-status--warning" : ""}`}>
                          {event.publishingStatus === "draft" ? "Ascuns" : STATUS_LABELS[event.eventStatus]}
                        </span>
                      </td>
                      <td>
                        <span className="board-event-placement">{placement.title}</span>
                        <span>{placement.detail}</span>
                      </td>
                      <td>{CATEGORY_LABELS[event.category]}</td>
                      <td>{event.venueName || "Necompletat"}</td>
                      <td>
                        <div className="board-event-actions">
                          {event.publishingStatus === "published" && <Link href={`/evenimente/${event.slug}`} aria-label={`Vezi ${event.title}`} title="Vezi pe site"><Eye size={16} /></Link>}
                          <Link href={`/board/evenimente/arhiva/${event.slug}`} className="board-event-edit-link" aria-label={`Editează ${event.title}`}><Pencil size={15} /> Editează</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!importedEvents.length && <div className="dash-empty"><strong>Nicio arhivă importată</strong>Evenimentele importate vor apărea aici.</div>}
          </div>
        </section>
      )}
    </div>
  );
}
