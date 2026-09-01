import type { Metadata } from "next";
import Link from "next/link";
import { Archive, ChevronLeft, Eye, Pencil, Search } from "lucide-react";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { getManagedArchiveEvents } from "@/lib/event-archive";
import { CATEGORY_LABELS, formatEventDate, normalizeSearch } from "@/lib/event-display";
import { getAllEventsForAdmin } from "@/lib/events";

export const metadata: Metadata = {
  title: "Evenimente vechi",
  robots: { index: false, follow: false },
};

type ArchivePageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function BoardArchiveEventsPage({ searchParams }: ArchivePageProps) {
  await requirePagePermission("manage_public_events");

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const normalizedQuery = normalizeSearch(query);
  const [archiveRows, ticketingEvents] = await Promise.all([
    getManagedArchiveEvents(),
    getAllEventsForAdmin(),
  ]);
  const ticketingSlugs = new Set(ticketingEvents.map((event) => event.slug));
  const importedEvents = archiveRows
    .filter((event) => !ticketingSlugs.has(event.slug))
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  const visibleEvents = normalizedQuery
    ? importedEvents.filter((event) => normalizeSearch([
      event.title,
      event.venueName,
      event.startDate,
      CATEGORY_LABELS[event.category],
    ].filter(Boolean).join(" ")).includes(normalizedQuery))
    : importedEvents;
  const publishedCount = importedEvents.filter((event) => event.publishingStatus === "published").length;

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <div className="dash-editor-context">
            <Link href="/board/evenimente" className="dash-back-link"><ChevronLeft size={16} /> Evenimente noi</Link>
            <span className="dash-eyebrow"><Archive size={14} /> Arhivă editabilă</span>
          </div>
          <h1>Evenimente vechi</h1>
          <p>Aici modifici evenimentele importate. Evenimentele noi și biletele lor rămân în ecranul principal.</p>
        </div>
        <Link href="/evenimente" className="dash-button dash-button--secondary"><Eye size={17} /> Vezi pagina publică</Link>
      </header>

      <section className="board-event-publishing-guide" aria-label="Starea arhivei">
        <div>
          <strong>{publishedCount} publice</strong>
          <span>{importedEvents.length} evenimente vechi</span>
        </div>
        <p><b>Separat de bilete:</b> poți schimba textul, data, locația, afișul și vizibilitatea fiecărui eveniment vechi.</p>
        <Link href="/board/evenimente"><ChevronLeft size={16} /> Evenimente noi</Link>
      </section>

      <form className="board-archive-search" role="search" action="/board/evenimente/arhiva">
        <label className="sr-only" htmlFor="archive-event-search">Caută un eveniment vechi</label>
        <span className="board-archive-search__field">
          <Search size={17} aria-hidden="true" />
          <input
            id="archive-event-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Caută după nume, dată sau locație"
          />
        </span>
        <button className="dash-button dash-button--secondary" type="submit">Caută</button>
        {query && <Link href="/board/evenimente/arhiva">Șterge căutarea</Link>}
      </form>

      <div className="dash-card board-events-table">
        <table>
          <thead>
            <tr><th>Eveniment</th><th>Vizibilitate</th><th>Categorie</th><th>Loc</th><th><span className="sr-only">Acțiuni</span></th></tr>
          </thead>
          <tbody>
            {visibleEvents.map((event) => (
              <tr key={event.id}>
                <td><strong>{event.title}</strong><span>{formatEventDate(event, true)}</span></td>
                <td>
                  <span className={`dash-status${event.publishingStatus === "published" ? " dash-status--success" : " dash-status--warning"}`}>
                    {event.publishingStatus === "published" ? "Public" : "Ascuns"}
                  </span>
                </td>
                <td>{CATEGORY_LABELS[event.category]}</td>
                <td>{event.venueName || "Necompletat"}</td>
                <td>
                  <div className="board-event-actions">
                    {event.publishingStatus === "published" && (
                      <Link href={`/evenimente/${event.slug}`} aria-label={`Vezi ${event.title}`} title="Vezi pe site"><Eye size={16} /></Link>
                    )}
                    <Link href={`/board/evenimente/arhiva/${event.slug}`} className="board-event-edit-link" aria-label={`Editează ${event.title}`}>
                      <Pencil size={15} /> Editează
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleEvents.length && (
          <div className="dash-empty">
            <strong>{query ? "Niciun rezultat" : "Niciun eveniment vechi"}</strong>
            {query ? "Încearcă un alt nume, an sau loc." : "Evenimentele importate vor apărea aici."}
          </div>
        )}
      </div>
    </div>
  );
}
