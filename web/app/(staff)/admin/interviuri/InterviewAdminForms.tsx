"use client";

import { useActionState, useMemo, useState } from "react";
import { CalendarPlus, Layers3, Save } from "lucide-react";
import { INTERVIEW_COMMITTEE_ROLES } from "@/lib/recruitment-spec";

import {
  bulkScheduleInterviews,
  completeInterview,
  createInterviewPeriod,
  scheduleInterview,
  type InterviewActionState,
} from "./actions";

type Option = { id: string; label: string; meta?: string };
type SlotOption = Option & { startsAt: string; full?: boolean };

const initial: InterviewActionState = {};

export function PeriodForm({ campaigns }: { campaigns: Option[] }) {
  const [state, action, pending] = useActionState(createInterviewPeriod, initial);
  return (
    <form action={action} className="iv-form">
      <label><span>Campanie</span><select name="campaign_id" required>{campaigns.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label><span>Nume perioadă</span><input name="title" required placeholder="Interviuri · seria 1" /></label>
      <div className="iv-form__two"><label><span>Început</span><input name="starts_at" type="datetime-local" required /></label><label><span>Final</span><input name="ends_at" type="datetime-local" required /></label></div>
      <div className="iv-form__two"><label><span>Minute / slot</span><input name="slot_duration_minutes" type="number" min="10" max="180" defaultValue="20" required /></label><label><span>Sală</span><input name="default_location" placeholder="Sala 12" /></label></div>
      <label><span>Link online · opțional</span><input name="default_meeting_url" type="url" placeholder="https://meet.google.com/..." /></label>
      <label className="iv-check"><input type="checkbox" name="generate_slots" defaultChecked /><span>Generează automat sloturile dintre început și final</span></label>
      <ActionFoot state={state} pending={pending} label="Creează perioada" icon={<CalendarPlus size={15} />} />
    </form>
  );
}

export function ScheduleForm({ candidates, slots, interviewers, defaultApplicationId }: { candidates: Option[]; slots: SlotOption[]; interviewers: Option[]; defaultApplicationId?: string }) {
  const [state, action, pending] = useActionState(scheduleInterview, initial);
  return (
    <form action={action} className="iv-form">
      <label><span>Candidat</span><select name="application_id" defaultValue={defaultApplicationId} required><option value="">Alege candidatul</option>{candidates.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.meta}</option>)}</select></label>
      <label><span>Slot</span><select name="slot_id" required><option value="">Alege ora</option>{slots.map((item) => <option key={item.id} value={item.id} disabled={item.full}>{item.label}{item.full ? " · ocupat" : ""}</option>)}</select></label>
      <fieldset><legend>Comisia de 4 persoane</legend><div className="iv-committee-grid">{INTERVIEW_COMMITTEE_ROLES.map(([role, label, hint]) => <label key={role}><span>{label}</span><select name={`committee_${role}`} required><option value="">Alege persoana</option>{interviewers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><small>{hint}</small></label>)}</div></fieldset>
      <div className="iv-form__two"><label><span>Loc · suprascrie slotul</span><input name="location" placeholder="Se folosește sala slotului" /></label><label><span>Link online</span><input name="meeting_url" type="url" placeholder="Opțional" /></label></div>
      <label><span>Motivul schimbării · doar la reprogramare</span><input name="reason" placeholder="Conflict de orar, la cererea candidatului…" /></label>
      <ActionFoot state={state} pending={pending} label="Salvează programarea" icon={<Save size={15} />} />
    </form>
  );
}

export function BulkScheduleForm({ candidates, periods, interviewers }: { candidates: Option[]; periods: Option[]; interviewers: Option[] }) {
  const [state, action, pending] = useActionState(bulkScheduleInterviews, initial);
  const [selected, setSelected] = useState<string[]>([]);
  const selectedValue = useMemo(() => selected.join(","), [selected]);
  return (
    <form action={action} className="iv-form">
      <input type="hidden" name="application_ids" value={selectedValue} />
      <label><span>Perioadă cu sloturi libere</span><select name="period_id" required><option value="">Alege perioada</option>{periods.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <fieldset><legend>Candidați · în ordinea programării</legend><div className="iv-candidate-list">{candidates.map((item) => { const on = selected.includes(item.id); return <button type="button" key={item.id} aria-pressed={on} className={on ? "is-selected" : ""} onClick={() => setSelected((items) => on ? items.filter((id) => id !== item.id) : [...items, item.id])}><span>{item.label}</span><small>{item.meta}</small></button>; })}</div></fieldset>
      <fieldset><legend>Comisia pentru toate interviurile</legend><div className="iv-committee-grid">{INTERVIEW_COMMITTEE_ROLES.map(([role, label]) => <label key={role}><span>{label}</span><select name={`committee_${role}`} required><option value="">Alege persoana</option>{interviewers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>)}</div></fieldset>
      <ActionFoot state={state} pending={pending || !selected.length} label={`Programează ${selected.length || ""} în serie`} icon={<Layers3 size={15} />} />
    </form>
  );
}

export function InterviewReviewForm({ interviewId, isAdmin }: { interviewId: string; isAdmin: boolean }) {
  const [state, action, pending] = useActionState(completeInterview, initial);
  return (
    <form action={action} className="iv-review-form">
      <input type="hidden" name="interview_id" value={interviewId} />
      <select name="attendance" defaultValue="completed"><option value="completed">Prezent · încheiat</option><option value="no_show">Absent</option><option value="late">Întârziat · descalificat automat</option></select>
      <input name="score" type="number" min="0" max="40" step="1" placeholder="Scor / 40" />
      <textarea name="private_notes" rows={3} placeholder="Notițe private de interviu" />
      {isAdmin && <select name="decision" defaultValue=""><option value="">Fără decizie încă</option><option value="accepted">Acceptat</option><option value="waiting_list">Listă de așteptare</option><option value="rejected">Respins</option></select>}
      <button type="submit" disabled={pending} className="pressable">{pending ? "Se salvează…" : "Salvează interviul"}</button>
      <p className={state.error ? "is-error" : ""} role="status" aria-live="polite">{state.error ?? state.message}</p>
    </form>
  );
}

function ActionFoot({ state, pending, label, icon }: { state: InterviewActionState; pending: boolean; label: string; icon: React.ReactNode }) {
  return <div className="iv-action-foot"><p className={state.error ? "is-error" : ""} role="status" aria-live="polite">{state.error ?? state.message}</p><button type="submit" className="pressable" disabled={pending}>{icon}{pending ? "Se lucrează…" : label}</button></div>;
}
