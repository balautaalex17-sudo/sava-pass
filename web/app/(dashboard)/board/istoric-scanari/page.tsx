import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/dashboard/auth";
import {
  formatDateTime,
  formatShortDate,
  formatTime,
} from "@/lib/dashboard/format";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Istoric scanări",
  robots: { index: false, follow: false },
};

type AttendanceLog = {
  id: string;
  result: string;
  error_code: string | null;
  scanned_at: string;
  token_fingerprint: string;
  meetings: { title: string } | null;
  member: { full_name: string } | null;
  scanner: { full_name: string } | null;
};

type TicketLog = {
  id: string;
  event_id: string;
  created_at: string;
  events: { title: string } | null;
  tickets: {
    holder_name: string;
    code: string;
    event_ticket_types: { name: string; price_bani: number } | null;
    orders: { amount_bani: number } | null;
  } | null;
  profiles: { full_name: string } | null;
};

type TicketEventGroup = {
  eventId: string;
  eventName: string;
  latestScanAt: string;
  rows: TicketLog[];
};

const resultLabels: Record<string, string> = {
  accepted: "Acceptată",
  already_present: "Deja prezent",
  expired_token: "QR expirat",
  invalid_token: "QR invalid",
  wrong_qr_type: "Tip QR greșit",
  inactive_member: "Membru inactiv",
  attendance_closed: "Prezență închisă",
  self_scan_blocked: "Auto-scanare blocată",
  unauthorized: "Neautorizat",
  error: "Eroare",
};

function formatPrice(priceBani: number): string {
  return (priceBani / 100).toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function groupTicketScans(rows: TicketLog[]): TicketEventGroup[] {
  const groups = new Map<string, TicketEventGroup>();

  for (const row of rows) {
    const existing = groups.get(row.event_id);
    if (existing) {
      existing.rows.push(row);
      continue;
    }

    groups.set(row.event_id, {
      eventId: row.event_id,
      eventName: row.events?.title ?? "Eveniment",
      latestScanAt: row.created_at,
      rows: [row],
    });
  }

  return [...groups.values()].sort(
    (left, right) =>
      new Date(right.latestScanAt).getTime() -
      new Date(left.latestScanAt).getTime(),
  );
}

export default async function ScanHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requirePagePermission("view_scan_audit_log");
  const query = await searchParams;
  const type = ["attendance", "tickets"].includes(query.type ?? "")
    ? query.type
    : "all";

  const [attendanceResult, ticketResult] = await Promise.all([
    type === "tickets"
      ? Promise.resolve({ data: [] })
      : supabaseAdmin
          .from("attendance_scans")
          .select(
            "id, result, error_code, scanned_at, token_fingerprint, meetings(title), member:profiles!attendance_scans_member_id_fkey(full_name), scanner:profiles!attendance_scans_scanner_user_id_fkey(full_name)",
          )
          .order("scanned_at", { ascending: false })
          .limit(150),
    type === "attendance"
      ? Promise.resolve({ data: [] })
      : supabaseAdmin
          .from("scans")
          .select(
            "id, event_id, created_at, events(title), tickets(holder_name, code, event_ticket_types(name, price_bani), orders(amount_bani)), profiles!scans_scanned_by_fkey(full_name)",
          )
          .in("action", ["check_in", "legacy_check_in"])
          .in("result", ["accepted", "ok"])
          .order("created_at", { ascending: false })
          .limit(500),
  ]);

  const attendanceLogs = (attendanceResult.data ?? []) as unknown as AttendanceLog[];
  const ticketGroups = groupTicketScans(
    (ticketResult.data ?? []) as unknown as TicketLog[],
  );

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <span className="dash-eyebrow">Board Management</span>
          <h1>Istoric scanări</h1>
          <p>
            Intrările la evenimente sunt grupate pe eveniment. Istoricul de
            prezență la ședințe rămâne separat.
          </p>
        </div>
      </header>

      <form method="get" className="scan-history-filter">
        <label htmlFor="scan-type">
          Tip
          <select id="scan-type" name="type" defaultValue={type}>
            <option value="all">Toate</option>
            <option value="tickets">Bilete evenimente</option>
            <option value="attendance">Prezență ședințe</option>
          </select>
        </label>
        <button className="dash-button" type="submit">
          Filtrează
        </button>
      </form>

      {type !== "attendance" && (
        <section className="scan-history-section" aria-labelledby="ticket-history-title">
          <div className="dash-section-head">
            <div>
              <span>Acces evenimente</span>
              <h2 id="ticket-history-title">Participanți scanați</h2>
            </div>
          </div>

          {ticketGroups.length ? (
            <div className="scan-history-events">
              {ticketGroups.map((group) => (
                <section className="dash-card scan-history-event" key={group.eventId}>
                  <header className="scan-history-event__head">
                    <div>
                      <span>Eveniment</span>
                      <h3>{group.eventName}</h3>
                    </div>
                    <strong>
                      {group.rows.length} {group.rows.length === 1 ? "participant" : "participanți"}
                    </strong>
                  </header>

                  <div className="scan-history-table scan-history-table--tickets">
                    <table>
                      <thead>
                        <tr>
                          <th>Participant</th>
                          <th>Tip bilet</th>
                          <th>Data</th>
                          <th>Ora</th>
                          <th>Preț bilet</th>
                          <th>Scanat de</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => {
                          const priceBani =
                            row.tickets?.event_ticket_types?.price_bani ??
                            row.tickets?.orders?.amount_bani ??
                            0;

                          return (
                            <tr key={row.id}>
                              <td>
                                <strong>{row.tickets?.holder_name ?? "Participant"}</strong>
                                <small>{row.tickets?.code ?? "Cod indisponibil"}</small>
                              </td>
                              <td>{row.tickets?.event_ticket_types?.name ?? "Bilet standard"}</td>
                              <td>{formatShortDate(row.created_at)}</td>
                              <td>
                                <time dateTime={row.created_at}>{formatTime(row.created_at)}</time>
                              </td>
                              <td><strong>{formatPrice(priceBani)}</strong></td>
                              <td>{row.profiles?.full_name ?? "Board"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="dash-card dash-empty">
              <strong>Nicio intrare scanată</strong>
              Tabelele evenimentelor vor apărea după prima scanare reușită.
            </div>
          )}
        </section>
      )}

      {type !== "tickets" && (
        <section className="scan-history-section" aria-labelledby="attendance-history-title">
          <div className="dash-section-head">
            <div>
              <span>Prezență internă</span>
              <h2 id="attendance-history-title">Scanări la ședințe</h2>
            </div>
          </div>
          <div className="dash-card scan-history-table">
            <table>
              <thead>
                <tr>
                  <th>Data și ora</th>
                  <th>Rezultat</th>
                  <th>Membru</th>
                  <th>Întâlnire</th>
                  <th>Scanat de</th>
                  <th>Amprentă</th>
                </tr>
              </thead>
              <tbody>
                {attendanceLogs.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.scanned_at)}</td>
                    <td>
                      <span
                        className={
                          row.result === "accepted"
                            ? "dash-status dash-status--success"
                            : row.result.startsWith("already")
                              ? "dash-status dash-status--warning"
                              : "dash-status dash-status--danger"
                        }
                      >
                        {resultLabels[row.result] ?? row.result}
                      </span>
                      {row.error_code && <small>{row.error_code}</small>}
                    </td>
                    <td><strong>{row.member?.full_name ?? "Cod necunoscut"}</strong></td>
                    <td>{row.meetings?.title ?? "Întâlnire"}</td>
                    <td>{row.scanner?.full_name ?? "Board"}</td>
                    <td><code>{row.token_fingerprint.slice(0, 12)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!attendanceLogs.length && (
              <div className="dash-empty">
                <strong>Nicio scanare de prezență</strong>
                Nu există înregistrări pentru filtrul ales.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
