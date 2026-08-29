"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { updateApplication, type ApplicationActionState } from "../actions";
import type { MembershipApplication } from "@/lib/supabase/types";

const initial: ApplicationActionState = {};

export function ApplicationReviewForm({ application }: { application: MembershipApplication }) {
  const [state, action, pending] = useActionState(updateApplication, initial);
  const displayStatus = application.status === "interview_scheduled"
    ? "selected_for_interview"
    : application.status;

  return (
    <form action={action} className="review-form">
      <input type="hidden" name="id" value={application.id} />
      <label>
        <span>Status</span>
        <select name="status" defaultValue={displayStatus}>
          <option value="submitted">Trimisă</option>
          <option value="under_review">În evaluare</option>
          <option value="selected_for_interview">Selectat pentru interviu</option>
          <option value="interview_completed">Interviu încheiat</option>
          <option value="accepted">Acceptat</option>
          <option value="waiting_list">Listă de așteptare</option>
          <option value="rejected">Respins</option>
        </select>
      </label>
      <label>
        <span>Notițe private</span>
        <textarea name="private_notes" rows={6} defaultValue={application.private_notes ?? ""} placeholder="Vizibile doar echipei autorizate." />
      </label>
      <label>
        <span>Mesaj pentru candidat</span>
        <textarea name="result_message" rows={4} defaultValue={application.result_message ?? ""} placeholder="Apare în pagina candidatului și în notificarea de rezultat." />
      </label>
      <div className="review-form__foot">
        <p role="status" aria-live="polite" className={state.error ? "is-error" : ""}>{state.error ?? state.message}</p>
        <button type="submit" disabled={pending} className="pressable">
          <Save size={15} /> {pending ? "Se salvează…" : "Salvează evaluarea"}
        </button>
      </div>
    </form>
  );
}
