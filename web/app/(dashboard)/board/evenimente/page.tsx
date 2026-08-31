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
const HOMEPAGE_ARCHIVE_LIMIT = 2;

export default async function BoardEventsPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  await requirePagePermission("manage_public_events");
  const params = await searchParams;
  const view = params.view === "events" || params.view === "archive" ? "events" : "homepage";
  const [events, importedRows, homepageEvent, homepagePastEvents] = await Promise.all([
    getAllEventsForAdmin(),
    getManagedArchiveEvents(),
    getActiveEvent(),
    getPastEvents(),
  ]);
  const publicTicketingEvents = events.filter((event) => event.status !== "draft");
  const publicTicketingSlugs = new Set(publicTicketingEvents.map((event) => event.slug));
  const importedEvents = importedRows
    .filter((event) => !publicTicketingSlugs.has(event.slug))
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  const { data: stats } = await supabaseAdmin.from("event_stats").select("event_id, sold, checked_in");
  const statsByEvent = new Map((stats ?? []).map((row) => [row.event_id, row]));
  const activeCount = events.filter((event) => event.status === "active").length;
  const homepageEventId = homepageEvent?.id;
  const homepageArchivedEvents = homepagePastEvents.slice(0, HOMEPAGE_ARCHIVE_LIMIT);
  const homepageArchiveIds = new Set(homepageArchivedEvents.map((event) => event.id));
  const homepageFallback = homepageEvent
    ? null
    : importedRows.find((event) => event.slug === GOLDEN_HOUR.slug && event.publishingStatus === "published") ?? null;
  const homepageVisibleCount = homepageArchivedEvents.length + Number(Boolean(homepageEvent || homepageFallback));
  const publicImportedCount = importedEvents.filter((event) => event.publishingStatus === "published").length;
  const publicEventsPageCount = publicTicketingEvents.length + publicImportedCount;
  const hiddenEventsPageCount = events.filter((event) => event.status === "draft").length
    + importedEvents.filter((event) => event.publishingStatus === "draft").length;

  const renderTicketingRow = (
    event: (typeof events)[number],
    placement: { title: string; detail: string },
  ) => {
    const eventStats = statsByEvent.get(event.id);
    const sold = eventStats?.sold ?? 0;
    const checkedIn = eventStats?.checked_in ?? 0;

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
  };

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <span className="dash-eyebrow">Două suprafețe publice</span>
          <h1>Evenimente</h1>
          <p>Filele de mai jos oglindesc exact ce vede publicul pe homepage și în pagina Evenimente.</p>
        </div>
        {view === "homepage"
          ? <Link href="/board/evenimente/new" className="dash-button"><CalendarPlus size={17} /> Eveniment nou</Link>
          : <Link href="/evenimente" className="dash-button dash-button--secondary"><Eye size={17} /> Vezi pagina Evenimente</Link>}
      </header>

      <nav className="board-event-view-tabs" aria-label="Zone de editare evenimente">
        <Link href="/board/evenimente?view=homepage" className="board-event-view-tab" aria-current={view === "homepage" ? "page" : undefined}>
          <span><strong>Homepage</strong><small>Eveniment principal + maximum două carduri „Din arhivă”</small></span>
          <b>{homepageVisibleCount}</b>
        </Link>
        <Link href="/board/evenimente?view=events" className="board-event-view-tab" aria-current={view === "events" ? "page" : undefined}>
          <span>
            <strong>Pagina Evenimente</strong>
            <small>{publicEventsPageCount} publice{hiddenEventsPageCount ? ` · ${hiddenEventsPageCount} ${hiddenEventsPageCount === 1 ? "ascuns" : "ascunse"}` : ""}</small>
          </span>
          <b>{publicEventsPageCount}</b>
        </Link>
      </nav>

      {view === "homepage" && (
        <section className="board-event-workspace">
          <header className="board-event-workspace__head">
            <span className="dash-eyebrow">Exact ca pe homepage</span>
            <h2>Eveniment principal și „Din arhivă”</h2>
            <p>Primul rând este cardul mare. Următoarele două sunt singurele carduri afișate în „Din arhivă”. Restul evenimentelor rămân în fila Pagina Evenimente.</p>
          </header>

          <div className="dash-card board-events-table">
            <table>
              <thead><tr><th>Eveniment</th><th>Status</th><th>Apare în</th><th>Bilete</th><th>Preț</th><th><span className="sr-only">Acțiuni</span></th></tr></thead>
              <tbody>
                {homepageEvent && renderTicketingRow(homepageEvent, { title: "Homepage · principal", detail: "Cardul mare" })}
                {!homepageEvent && homepageFallback && (
                  <tr key={homepageFallback.id}>
                    <td><strong>{homepageFallback.title}</strong><span>{formatEventDate(homepageFallback)} · {homepageFallback.venueName || "Loc necompletat"}</span></td>
                    <td><span className="dash-status dash-status--success">{STATUS_LABELS[homepageFallback.eventStatus]}</span></td>
                    <td><span className="board-event-placement">Homepage · principal de rezervă</span><span>Cardul mare</span></td>
                    <td><strong>Importat</strong><span>Fără bilete SavaPass</span></td>
                    <td>{homepageFallback.ticketPrice || "—"}</td>
                    <td>
                      <div className="board-event-actions">
                        <Link href={`/evenimente/${homepageFallback.slug}`} aria-label={`Vezi ${homepageFallback.title}`} title="Vezi pe site"><Eye size={16} /></Link>
                        <Link href={`/board/evenimente/arhiva/${homepageFallback.slug}`} className="board-event-edit-link" aria-label={`Editează ${homepageFallback.title}`}><Pencil size={15} /> Editează</Link>
                      </div>
                    </td>
                  </tr>
                )}
                {!homepageEvent && !homepageFallback && (
                  <tr className="board-homepage-empty-row">
                    <td><strong>Niciun eveniment principal</strong><span>Homepage-ul afișează mesajul „Revenim curând cu o ediție nouă.”</span></td>
                    <td><span className="dash-status">Stare goală</span></td>
                    <td><span className="board-event-placement">Homepage · principal</span><span>Imagine neutră de comunitate</span></td>
                    <td>—</td>
                    <td>—</td>
                    <td><Link href="/board/evenimente/new" className="dash-button dash-button--secondary">Creează</Link></td>
                  </tr>
                )}
                {homepageArchivedEvents.map((event) => renderTicketingRow(event, { title: "Homepage · Din arhivă", detail: "Card mic" }))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === "events" && (
        <section className="board-event-workspace">
          <header className="board-event-workspace__head">
            <span className="dash-eyebrow">Pagina Evenimente</span>
            <h2>Toate evenimentele publice</h2>
            <p>Această filă include exact sursele reunite în pagina Evenimente: evenimentele cu bilete și arhiva importată. Cele ascunse rămân listate doar ca să le poți publica.</p>
          </header>

          <div className="board-event-source">
            <header className="board-event-source__head">
              <div><span className="dash-eyebrow">SavaPass</span><h3>Evenimente cu bilete</h3></div>
              <p>{publicTicketingEvents.length} publice{events.length > publicTicketingEvents.length ? ` · ${events.length - publicTicketingEvents.length} ciorne` : ""}</p>
            </header>
            <div className="dash-card board-events-table">
              <table>
                <thead><tr><th>Eveniment</th><th>Status</th><th>Apare în</th><th>Bilete</th><th>Preț</th><th><span className="sr-only">Acțiuni</span></th></tr></thead>
                <tbody>
                  {events.map((event) => {
                    const placement = event.status === "draft"
                      ? { title: "Nu apare public", detail: "Publică pentru a-l afișa" }
                      : event.id === homepageEventId
                        ? { title: "Homepage · principal", detail: "Și în pagina Evenimente" }
                        : homepageArchiveIds.has(event.id)
                          ? { title: "Homepage · Din arhivă", detail: "Și în pagina Evenimente" }
                          : { title: "Pagina Evenimente", detail: "Nu apare pe homepage" };
                    return renderTicketingRow(event, placement);
                  })}
                </tbody>
              </table>
              {!events.length && <div className="dash-empty"><strong>Niciun eveniment cu bilete</strong>Creează primul eveniment SavaPass.</div>}
            </div>
          </div>

          <div className="board-event-source">
            <header className="board-event-source__head">
              <div><span className="dash-eyebrow">Instagram și istoric</span><h3>Arhivă importată</h3></div>
              <p>{publicImportedCount} publice{importedEvents.length > publicImportedCount ? ` · ${importedEvents.length - publicImportedCount} ascunse` : ""}</p>
            </header>
            <div className="dash-card board-events-table">
              <table>
                <thead><tr><th>Eveniment</th><th>Vizibilitate</th><th>Apare în</th><th>Categorie</th><th>Loc</th><th><span className="sr-only">Acțiuni</span></th></tr></thead>
                <tbody>
                  {importedEvents.map((event) => {
                    const isHomepageFallback = homepageFallback?.slug === event.slug;
                    const placement = event.publishingStatus === "draft"
                      ? { title: "Nu apare public", detail: "Publică pentru a-l afișa" }
                      : isHomepageFallback
                        ? { title: "Homepage · principal de rezervă", detail: "Și în pagina Evenimente" }
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
          </div>
        </section>
      )}
    </div>
  );
}
