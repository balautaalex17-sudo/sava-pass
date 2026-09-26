"use client";

import { useId, useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { reviewDepartmentRequest } from "@/lib/dashboard/department-request-actions";
import { departmentBalanceWarning } from "@/lib/dashboard/department-requests";
import type { MemberDepartment } from "@/lib/dashboard/member-departments";
import styles from "./department-requests.module.css";

export function DepartmentRequestReview({ requestId, target, balanceWarning, isOwn = false }: {
  requestId: string; target: MemberDepartment; balanceWarning: boolean; isOwn?: boolean;
}) {
  const id = useId();
  const [note, setNote] = useState("");
  const [freshWarning, setFreshWarning] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const warning = balanceWarning || freshWarning;

  function review(decision: "approved" | "rejected") {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await reviewDepartmentRequest({ requestId, decision, note, acceptImbalance: decision === "approved" && warning });
        setMessage(result.message);
        if (result.balanceWarning) setFreshWarning(true);
        if (result.ok) setSaved(true);
      } catch { setMessage("Conexiunea a fost întreruptă. Încearcă din nou."); }
    });
  }

  if (isOwn) return <p className={styles.help}>Alt membru al Board-ului trebuie să evalueze propria ta cerere.</p>;
  return <div className={styles.form}>
    {!saved && <>
      {warning && <p className={styles.warning} id={`${id}-warning`} role="status"><TriangleAlert size={19} aria-hidden="true" /><span>{departmentBalanceWarning(target)}</span></p>}
      <div className="dash-field"><label htmlFor={`${id}-note`}>Răspuns către membru (opțional)</label>
        <textarea id={`${id}-note`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={2} disabled={pending} />
      </div>
      <div className={styles.actions}>
        <button type="button" className="dash-button" disabled={pending} aria-describedby={warning ? `${id}-warning` : undefined} onClick={() => review("approved")}>{warning ? "Aprobă totuși" : "Aprobă cererea"}</button>
        <button type="button" className="dash-button dash-button--secondary" disabled={pending} onClick={() => review("rejected")}>Respinge</button>
      </div>
    </>}
    {(pending || message) && <p role="status" className="dash-form-message">{pending ? "Se salvează decizia…" : message}</p>}
  </div>;
}
