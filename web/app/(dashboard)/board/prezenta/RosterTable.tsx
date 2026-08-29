"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { formatDateTime } from "@/lib/dashboard/format";
import { correctAttendance } from "./actions";

export interface RosterRow {
  memberId: string;
  name: string;
  grade: string | null;
  avatarUrl: string | null;
  attendanceStatus: string | null;
  checkedInAt: string | null;
  confirmedBy: string | null;
}

export function RosterTable({ rows, meetingId, canCorrect }: { rows: RosterRow[]; meetingId: string; canCorrect: boolean }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "present" | "absent">("all");
  const [selected, setSelected] = useState<RosterRow | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const visible = useMemo(() => rows.filter((row) => row.name.toLocaleLowerCase("ro").includes(search.trim().toLocaleLowerCase("ro")) && (filter === "all" || (filter === "present" ? row.attendanceStatus === "present" : row.attendanceStatus !== "present"))), [filter, rows, search]);

  function openCorrection(row: RosterRow) { setSelected(row); setReason(""); setMessage(null); dialogRef.current?.showModal(); }
  function close() { dialogRef.current?.close(); setSelected(null); }
  function submit() { if (!selected) return; startTransition(async () => { const result = await correctAttendance({ meetingId, memberId: selected.memberId, newStatus: selected.attendanceStatus === "present" ? "reversed" : "present", reason }); setMessage(result.message); if (result.ok) window.setTimeout(() => { close(); window.location.reload(); }, 700); }); }

  return <>
    <div className="roster-toolbar"><label><Search size={16} /><span className="sr-only">Caută membru</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută după nume" /></label><div role="group" aria-label="Filtru prezență">{(["all","present","absent"] as const).map((value) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "Toți" : value === "present" ? "Prezenți" : "Neconfirmați"}</button>)}</div></div>
    <div className="dash-card roster-table-wrap"><table className="roster-table"><thead><tr><th>Membru</th><th>Clasa</th><th>Status</th><th>Ora scanării</th><th>Confirmat de</th>{canCorrect && <th><span className="sr-only">Acțiuni</span></th>}</tr></thead><tbody>{visible.map((row) => <tr key={row.memberId}><td><strong>{row.name}</strong></td><td>{row.grade ?? "—"}</td><td><span className={row.attendanceStatus === "present" ? "dash-status dash-status--success" : "dash-status dash-status--danger"}>{row.attendanceStatus === "present" ? "Prezent" : "Neconfirmat"}</span></td><td>{row.checkedInAt ? formatDateTime(row.checkedInAt) : "—"}</td><td>{row.confirmedBy ?? "—"}</td>{canCorrect && <td><button type="button" onClick={() => openCorrection(row)}>Corectează</button></td>}</tr>)}</tbody></table>{!visible.length && <div className="dash-empty"><strong>Niciun rezultat</strong>Schimbă termenul de căutare sau filtrul.</div>}</div>
    <dialog className="dash-dialog" ref={dialogRef} onCancel={close}>{selected && <><div className="dash-dialog-head"><div><span className="dash-eyebrow">Corecție auditată</span><h2>{selected.name}</h2></div><button type="button" onClick={close} aria-label="Închide"><X size={19} /></button></div><p>Schimbi starea din <strong>{selected.attendanceStatus === "present" ? "Prezent" : "Neconfirmat"}</strong> în <strong>{selected.attendanceStatus === "present" ? "Anulat" : "Prezent"}</strong>.</p><div className="dash-field"><label htmlFor="correction-reason">Motiv obligatoriu</label><textarea id="correction-reason" value={reason} onChange={(event) => setReason(event.target.value)} autoFocus /></div>{message && <p role="status" className="dash-form-message">{message}</p>}<div className="dash-dialog-actions"><button type="button" className="dash-button dash-button--secondary" onClick={close}>Renunță</button><button type="button" className="dash-button" disabled={pending || reason.trim().length < 3} onClick={submit}>{pending ? "Se salvează..." : "Salvează corecția"}</button></div></>}</dialog>
  </>;
}
