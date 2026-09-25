import type { Metadata } from "next";
import { Download } from "lucide-react";
import { PortalLink as Link } from "@/components/dashboard/PortalLink";
import { PortalFilterForm } from "@/components/dashboard/PortalFilterForm";
import { requirePagePermission } from "@/lib/dashboard/auth";
import {
  getRegistrationEvents,
  getRegistrationPage,
  registrationFiltersSchema,
  registrationStatusLabels,
  REGISTRATIONS_PER_PAGE,
  type RegistrationFilters,
} from "@/lib/dashboard/event-registrations";
import { formatDateTime, formatShortDate } from "@/lib/dashboard/format";
import styles from "./registrations.module.css";

export const metadata: Metadata = {
  title: "Înscrieri evenimente",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ event?: string; status?: string; sort?: string; page?: string }>;

function queryHref(filters: RegistrationFilters, page?: number) {
  const query = new URLSearchParams({ event: filters.event, status: filters.status, sort: filters.sort });
  if (page) query.set("page", String(page));
  return `/board/inscrieri-evenimente?${query}`;
}

function formatPrice(priceBani: number) {
  return (priceBani / 100).toLocaleString("ro-RO", { style: "currency", currency: "RON" });
}

export default async function EventRegistrationsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePagePermission("manage_public_events");
  const parsed = registrationFiltersSchema.safeParse(await searchParams);
  const filters = parsed.success ? parsed.data : registrationFiltersSchema.parse({});
  const [events, firstPage] = await Promise.all([
    getRegistrationEvents(),
    getRegistrationPage(filters, (filters.page - 1) * REGISTRATIONS_PER_PAGE, REGISTRATIONS_PER_PAGE),
  ]);
  const totalPages = Math.max(1, Math.ceil(firstPage.count / REGISTRATIONS_PER_PAGE));
  const currentPage = Math.min(filters.page, totalPages);
  const rows = currentPage === filters.page
    ? firstPage.rows
    : (await getRegistrationPage(filters, (currentPage - 1) * REGISTRATIONS_PER_PAGE, REGISTRATIONS_PER_PAGE)).rows;
  const exportQuery = new URLSearchParams({ event: filters.event, status: filters.status, sort: filters.sort });

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <span className="dash-eyebrow">Evenimente</span>
          <h1>Înscrieri</h1>
          <p>Toți participanții cu bilet emis, inclusiv rezervările cash și biletele anulate sau expirate.</p>
        </div>
        <a className="dash-button" href={`/api/board/event-registrations/export?${exportQuery}`}>
          <Download size={17} aria-hidden="true" /> Exportă Excel
        </a>
      </header>

      <PortalFilterForm action="/board/inscrieri-evenimente" className={styles.filters} submitLabel="Aplică filtrele">
        <label htmlFor="registrations-event">Eveniment
          <select id="registrations-event" name="event" defaultValue={filters.event}>
            <option value="">Toate evenimentele</option>
            {events.map((event) => <option value={event.id} key={event.id}>{event.title} · {formatShortDate(event.starts_at)}</option>)}
          </select>
        </label>
        <label htmlFor="registrations-status">Status
          <select id="registrations-status" name="status" defaultValue={filters.status}>
            <option value="all">Toate statusurile</option>
            {Object.entries(registrationStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label htmlFor="registrations-sort">Sortează
          <select id="registrations-sort" name="sort" defaultValue={filters.sort}>
            <option value="newest">Cele mai noi</option>
            <option value="oldest">Cele mai vechi</option>
            <option value="name">Nume A–Z</option>
          </select>
        </label>
      </PortalFilterForm>

      <div className={styles.summary} role="status">
        <strong>{firstPage.count.toLocaleString("ro-RO")}</strong> {firstPage.count === 1 ? "înscriere" : "înscrieri"}
        {filters.event ? ` · ${events.find((event) => event.id === filters.event)?.title ?? "Eveniment"}` : " · toate evenimentele"}
      </div>

      <div className={`dash-card ${styles.tableWrap}`}>
        <table className={styles.table}>
          <thead><tr>
            <th>Participant</th><th>Eveniment</th><th>Bilet</th><th>Status</th><th>Preț</th><th>Înscris la</th><th>Intrat la</th>
          </tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.holderName}</strong><a href={`mailto:${row.holderEmail}`}>{row.holderEmail}</a>{row.holderPhone && <a href={`tel:${row.holderPhone}`}>{row.holderPhone}</a>}</td>
                <td><strong>{row.eventTitle}</strong></td>
                <td><strong>{row.ticketType}</strong><span>{row.code}</span></td>
                <td><span className={`dash-status ${row.status === "paid" || row.status === "checked_in" ? "dash-status--success" : row.status === "reserved" ? "dash-status--warning" : ""}`}>{registrationStatusLabels[row.status]}</span></td>
                <td>{formatPrice(row.priceBani)}</td>
                <td><time dateTime={row.issuedAt}>{formatDateTime(row.issuedAt)}</time></td>
                <td>{row.checkedInAt ? <time dateTime={row.checkedInAt}>{formatDateTime(row.checkedInAt)}</time> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="dash-empty"><strong>Nicio înscriere găsită</strong><p>Încearcă alt eveniment sau alt status.</p></div>}
      </div>

      {totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Pagini înscrieri">
          <span>Pagina {currentPage} din {totalPages}</span>
          <div>
            {currentPage > 1 && <Link href={queryHref(filters, currentPage - 1)}>Anterior</Link>}
            {currentPage < totalPages && <Link href={queryHref(filters, currentPage + 1)}>Următor</Link>}
          </div>
        </nav>
      )}
    </div>
  );
}
