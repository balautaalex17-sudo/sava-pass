"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, X } from "lucide-react";
import { formatDateTime } from "@/lib/dashboard/format";
import { ATTENDANCE_LABELS, attendanceClass, filterAttendanceRows, type AttendanceTableRow, type AttendanceFilter, type AttendanceSort } from "@/lib/dashboard/attendance";
import { AbsenceRequestControl } from "@/components/dashboard/AbsenceRequestControl";
import { correctAttendance } from "./actions";

export function RosterTable({ rows, view, selectedId, canCorrect, canReview, viewerId }: {
  rows: AttendanceTableRow[];
  view: "member" | "meeting";
  selectedId: string;
  canCorrect: boolean;
  canReview: boolean;
  viewerId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AttendanceFilter>("all");
  const [sort, setSort] = useState<AttendanceSort>(view === "member" ? "meeting-desc" : "person-asc");
  const [selected, setSelected] = useState<AttendanceTableRow | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const visible = useMemo(() => filterAttendanceRows(rows, search, filter, sort), [rows, search, filter, sort]);
  const exportQuery = new URLSearchParams({ view, [view === "member" ? "member" : "meeting"]: selectedId, search, filter, sort });

  function close() { if (pending) return; dialogRef.current?.close(); setSelected(null); }
  function openCorrection(row: AttendanceTableRow) {
    setSelected(row); setReason(""); setMessage(null); dialogRef.current?.showModal();
  }
  function submit() {
    if (!selected) return;
    startTransition(async () => {
      const result = await correctAttendance({
        meetingId: selected.meetingId, memberId: selected.memberId,
        newStatus: selected.attendanceStatus === "present" ? "reversed" : "present", reason,
      });
      setMessage(result.message);
      if (result.ok) { dialogRef.current?.close(); setSelected(null); router.refresh(); }
    });
  }

  return <>
    <div className="roster-toolbar">
      <label><Search size={16} /><span className="sr-only">Caută persoană sau ședință</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută persoană sau ședință" />
      </label>
      <div role="group" aria-label="Filtru prezență">
        {(["all", "present", "absent", "excused", "pending"] as const).map((value) =>
          <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {{ all: "Toate", present: "Prezenți", absent: "Absenți", excused: "Motivate", pending: "Cereri în așteptare" }[value]}
          </button>)}
      </div>
    </div>
    <div className="attendance-table-options">
      <label htmlFor="attendance-sort">Sortează după
        <select id="attendance-sort" value={sort} onChange={(event) => setSort(event.target.value as AttendanceSort)}>
          <option value="person-asc">Persoană: A–Z</option><option value="person-desc">Persoană: Z–A</option>
          <option value="meeting-desc">Ședință: cele mai recente</option><option value="meeting-asc">Ședință: cele mai vechi</option>
        </select>
      </label>
      <span role="status">{visible.length} înregistrări</span>
      <a className="dash-button dash-button--secondary" href={`/api/board/attendance/export?${exportQuery}`}><Download size={16} /> Exportă CSV</a>
    </div>
    <div className="dash-card roster-table-wrap" tabIndex={0} role="region" aria-label="Tabel de prezență, derulează orizontal pentru toate coloanele">
      <table className="roster-table attendance-table">
        <caption className="sr-only">Prezențe și absențe {view === "member" ? "pe persoană" : "pe ședință"}</caption>
        <thead><tr><th scope="col">Persoană</th><th scope="col">Ședință</th><th scope="col">Status</th><th scope="col">Confirmare</th><th scope="col">Motivare</th>{canCorrect && <th scope="col">Acțiuni</th>}</tr></thead>
        <tbody>{visible.map((row) => <tr key={`${row.meetingId}:${row.memberId}`}>
          <td><strong>{row.name}</strong><small>{row.grade ?? "Fără clasă"}</small></td>
          <td><strong>{row.meetingTitle}</strong><small>{formatDateTime(row.meetingStartsAt)}</small></td>
          <td><span className={attendanceClass(row.result)}>{ATTENDANCE_LABELS[row.result]}</span></td>
          <td>{row.checkedInAt ? <>{formatDateTime(row.checkedInAt)}<small>{row.confirmedBy}</small></> : "—"}</td>
          <td>{row.request ? <AbsenceRequestControl request={row.request} meetingId={row.meetingId} canReview={canReview && row.result === "absent"} isOwn={row.memberId === viewerId} /> : "—"}</td>
          {canCorrect && <td>{!["draft", "cancelled"].includes(row.result) && <button type="button" onClick={() => openCorrection(row)}>Corectează</button>}</td>}
        </tr>)}</tbody>
      </table>
      {!visible.length && <div className="dash-empty"><strong>Niciun rezultat</strong>Schimbă termenul de căutare sau filtrul.</div>}
    </div>
    {message && !selected && <p role="status" className="dash-form-message">{message}</p>}
    <dialog className="dash-dialog" ref={dialogRef} aria-labelledby="correction-title" onCancel={(event) => { event.preventDefault(); close(); }}>
      {selected && <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <div className="dash-dialog-head"><div><span className="dash-eyebrow">Corecție auditată</span><h2 id="correction-title">{selected.name}</h2></div><button type="button" onClick={close} disabled={pending} aria-label="Închide"><X size={19} /></button></div>
        <p>{selected.meetingTitle}</p>
        <p>Schimbi starea din <strong>{ATTENDANCE_LABELS[selected.result]}</strong> în <strong>{selected.attendanceStatus === "present" ? "Confirmare anulată" : "Prezent"}</strong>.</p>
        <div className="dash-field"><label htmlFor="correction-reason">Motiv obligatoriu</label><textarea id="correction-reason" value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} maxLength={500} disabled={pending} autoFocus /></div>
        {message && <p role="status" className="dash-form-message">{message}</p>}
        <div className="dash-dialog-actions"><button type="button" className="dash-button dash-button--secondary" onClick={close} disabled={pending}>Renunță</button><button type="submit" className="dash-button" disabled={pending || reason.trim().length < 3}>{pending ? "Se salvează…" : "Salvează corecția"}</button></div>
      </form>}
    </dialog>
  </>;
}
