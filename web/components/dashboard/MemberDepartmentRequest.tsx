"use client";

import { useId, useState, useTransition } from "react";
import { ArrowRightLeft } from "lucide-react";
import { submitDepartmentRequest } from "@/lib/dashboard/department-request-actions";
import { DEPARTMENT_REQUEST_LABELS, type DepartmentRequest } from "@/lib/dashboard/department-requests";
import type { MemberDepartment } from "@/lib/dashboard/member-departments";
import { formatDateTime } from "@/lib/dashboard/format";
import styles from "./department-requests.module.css";

export function MemberDepartmentRequest({ department, request }: { department: MemberDepartment; request: DepartmentRequest | null }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const target = department === "hr" ? "PR" : "HR";
  const hasPendingRequest = request?.status === "pending" || submitted;

  function submit() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await submitDepartmentRequest({ reason });
        setMessage(result.message);
        if (result.ok) { setSubmitted(true); setExpanded(false); }
      } catch { setMessage("Conexiunea a fost întreruptă. Încearcă din nou."); }
    });
  }

  return <section className={`dash-card ${styles.card}`} aria-labelledby={`${id}-title`}>
    <div className={styles.heading}>
      <div><h2 id={`${id}-title`}>Departamentul tău</h2><p>Vrei să te implici în cealaltă echipă? Trimite o cerere către Board.</p></div>
      <span className="dash-status dash-status--success">{department.toUpperCase()}</span>
    </div>
    {request && <div className={styles.details}>
      <div className={styles.heading}>
        <strong>Cerere {request.from_department.toUpperCase()} → {request.to_department.toUpperCase()}</strong>
        <span className={`dash-status dash-status--${request.status === "approved" ? "success" : request.status === "rejected" ? "danger" : "warning"}`}>{DEPARTMENT_REQUEST_LABELS[request.status]}</span>
      </div>
      <p className={styles.meta}>Trimisă pe {formatDateTime(request.created_at)}</p>
      <p className={styles.text}>{request.reason}</p>
      {request.review_note && <p className={styles.text}><strong>Răspuns Board:</strong> {request.review_note}</p>}
      {request.reviewed_at && <p className={styles.meta}>Evaluată pe {formatDateTime(request.reviewed_at)}</p>}
    </div>}
    {hasPendingRequest ? <p className={styles.help}>Cererea este în așteptarea Board-ului. Rămâi în {department.toUpperCase()} până la aprobare.</p> : <>
      <div><button type="button" className="dash-button dash-button--secondary" aria-expanded={expanded} aria-controls={`${id}-form`} onClick={() => setExpanded(!expanded)} disabled={pending}>
        <ArrowRightLeft size={16} aria-hidden="true" />{expanded ? "Renunță" : "Cere schimbarea departamentului"}
      </button></div>
      {expanded && <form id={`${id}-form`} className={styles.form} onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <div className="dash-field"><label htmlFor={`${id}-reason`}>De ce vrei să treci din {department.toUpperCase()} în {target}?</label>
          <textarea id={`${id}-reason`} value={reason} onChange={(event) => setReason(event.target.value)} required minLength={10} maxLength={2000} rows={3} disabled={pending} aria-describedby={`${id}-help`} />
        </div>
        <p id={`${id}-help`} className={styles.help}>10–2000 de caractere. Poți trimite cererea indiferent de proporția HR / PR. Board-ul decide dacă o aprobă.</p>
        <div><button type="submit" className="dash-button" disabled={pending || reason.trim().length < 10}>{pending ? "Se trimite…" : "Trimite cererea"}</button></div>
      </form>}
    </>}
    {message && <p role="status" className="dash-form-message">{message}</p>}
  </section>;
}
