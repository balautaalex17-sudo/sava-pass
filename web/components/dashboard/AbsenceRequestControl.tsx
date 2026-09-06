"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { REQUEST_LABELS, type AbsenceRequest } from "@/lib/dashboard/attendance";
import { reviewAbsenceRequest, submitAbsenceRequest } from "@/lib/dashboard/attendance-actions";
import { formatDateTime } from "@/lib/dashboard/format";

export function AbsenceRequestControl({ meetingId, request, canSubmit = false, canReview = false, isOwn = false }: {
  meetingId: string;
  request: AbsenceRequest | null;
  canSubmit?: boolean;
  canReview?: boolean;
  isOwn?: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function submit(decision?: "approved" | "rejected") {
    startTransition(async () => {
      try {
        const result = request && decision
          ? await reviewAbsenceRequest({ requestId: request.id, decision, note: text })
          : await submitAbsenceRequest({ meetingId, reason: text });
        setMessage(result.message);
        if (result.ok) { setSaved(true); setExpanded(false); router.refresh(); }
      } catch {
        setMessage("Conexiunea a fost întreruptă. Încearcă din nou.");
      }
    });
  }

  if (!request && !canSubmit) return null;
  return (
    <div className="absence-control">
      {request ? <>
        <span className={`dash-status${request.status === "approved" ? " dash-status--success" : request.status === "rejected" ? " dash-status--danger" : " dash-status--warning"}`}>
          {REQUEST_LABELS[request.status] ?? request.status}
        </span>
        {request.reason && <details><summary>Detalii cerere</summary>
          <p className="absence-reason">{request.reason}</p>
          <small>Trimisă: {formatDateTime(request.created_at)}</small>
          {request.reviewed_at && <small>Decizie: {formatDateTime(request.reviewed_at)}</small>}
          {request.review_note && <p className="absence-reason"><strong>Răspuns board:</strong> {request.review_note}</p>}
        </details>}
        {request.status === "pending" && canReview && !isOwn && !saved && <>
          <label htmlFor={`${id}-note`}>Răspuns către membru (opțional)</label>
          <textarea id={`${id}-note`} value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} rows={2} disabled={pending} />
          <div className="absence-buttons">
            <button type="button" className="dash-button" disabled={pending} onClick={() => submit("approved")}>Acceptă</button>
            <button type="button" className="dash-button dash-button--secondary" disabled={pending} onClick={() => submit("rejected")}>Respinge</button>
          </div>
        </>}
        {request.status === "pending" && isOwn && canReview && <small>Alt membru al board-ului trebuie să decidă.</small>}
      </> : !saved && <>
        <button type="button" className="dash-button dash-button--secondary" aria-expanded={expanded} aria-controls={`${id}-form`} disabled={pending} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Renunță" : "Cere motivarea absenței"}
        </button>
        {expanded && <form id={`${id}-form`} onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <label htmlFor={`${id}-reason`}>Motivul absenței</label>
          <textarea id={`${id}-reason`} value={text} onChange={(event) => setText(event.target.value)} required minLength={10} maxLength={2000} rows={3} disabled={pending} aria-describedby={`${id}-help`} />
          <small id={`${id}-help`}>10–2000 de caractere. Motivul este vizibil doar pentru tine și board.</small>
          <button type="submit" className="dash-button" disabled={pending || text.trim().length < 10}>Trimite cererea</button>
        </form>}
      </>}
      {(pending || message) && <p role="status" className="dash-form-message">{pending ? "Se salvează…" : message}</p>}
    </div>
  );
}
