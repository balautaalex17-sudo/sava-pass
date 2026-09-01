"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  assignFeaturedSlot,
  endEvent,
  removeFeaturedSlot,
  type EventActionState,
} from "@/app/(staff)/admin/events/actions";

export type FeaturedCandidate = {
  id: string;
  title: string;
  ended: boolean;
};

export type SlotChoice = {
  slot: 1 | 2 | 3;
  occupantId: string | null;
  occupantTitle: string | null;
  occupantEnded: boolean;
};

function MutationMessage({ state }: { state: EventActionState }) {
  const message = state.errors?.general ?? state.message;
  if (!message) return null;
  return (
    <p
      className={`dash-form-message ${state.errors?.general ? "dash-form-message--error" : "dash-form-message--success"}`}
      role="status"
    >
      {message}
    </p>
  );
}

export function EndEventDialog({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [state, action, pending] = useActionState(endEvent, {} as EventActionState);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    dialogRef.current?.close();
    router.refresh();
  }, [router, state.ok]);

  return (
    <>
      <button type="button" className="dash-button dash-button--secondary" onClick={() => dialogRef.current?.showModal()}>
        Încheie evenimentul
      </button>
      <dialog ref={dialogRef} className="dash-dialog" onCancel={() => dialogRef.current?.close()}>
        <div className="dash-dialog-head">
          <div>
            <span className="dash-eyebrow">Acțiune permanentă</span>
            <h2>Închei „{eventTitle}”?</h2>
          </div>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Închide"><X size={19} /></button>
        </div>
        <p>
          Evenimentul nu va mai putea fi reactivat. Dacă este afișat pe pagina Despre,
          va rămâne în aceeași poziție, dar va apărea ca „Eveniment încheiat”.
        </p>
        <form action={action}>
          <input type="hidden" name="id" value={eventId} />
          <MutationMessage state={state} />
          <div className="dash-dialog-actions">
            <button type="button" className="dash-button dash-button--secondary" disabled={pending} onClick={() => dialogRef.current?.close()}>
              Anulează
            </button>
            <button type="submit" className="dash-button" disabled={pending}>
              {pending ? "Se încheie..." : "Încheie evenimentul"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function SlotAssignmentForm({
  slot,
  expectedOccupantId,
  candidates,
  replace = false,
}: {
  slot: 1 | 2 | 3;
  expectedOccupantId?: string | null;
  candidates: FeaturedCandidate[];
  replace?: boolean;
}) {
  const [state, action, pending] = useActionState(assignFeaturedSlot, {} as EventActionState);
  const [eventId, setEventId] = useState("");

  return (
    <form action={action} className="board-featured-assignment">
      <input type="hidden" name="target_slot" value={slot} />
      <input type="hidden" name="expected_occupant_id" value={expectedOccupantId ?? ""} />
      <label>
        <span className="sr-only">Eveniment pentru Slotul {slot}</span>
        <select name="event_id" required value={eventId} onChange={(event) => setEventId(event.target.value)} disabled={pending || !candidates.length}>
          <option value="">{candidates.length ? "Alege evenimentul" : "Niciun eveniment disponibil"}</option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.title} · {candidate.ended ? "încheiat" : "activ"}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="dash-button" disabled={pending || !eventId}>
        {pending ? "Se actualizează..." : replace ? "Înlocuiește" : "Adaugă eveniment"}
      </button>
      <MutationMessage state={state} />
    </form>
  );
}

export function RemoveFeaturedButton({ eventId, slot }: { eventId: string; slot: 1 | 2 | 3 }) {
  const [state, action, pending] = useActionState(removeFeaturedSlot, {} as EventActionState);
  return (
    <form action={action} className="board-featured-remove">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="expected_slot" value={slot} />
      <button type="submit" className="dash-button dash-button--secondary" disabled={pending}>
        {pending ? "Se scoate..." : "Scoate de pe Despre"}
      </button>
      <MutationMessage state={state} />
    </form>
  );
}

export function ArchivePlacementControl({
  eventId,
  currentSlot,
  slots,
}: {
  eventId: string;
  currentSlot: 1 | 2 | 3 | null;
  slots: SlotChoice[];
}) {
  const [state, action, pending] = useActionState(assignFeaturedSlot, {} as EventActionState);
  const [slotValue, setSlotValue] = useState("");
  const selected = slots.find((slot) => String(slot.slot) === slotValue) ?? null;

  if (currentSlot) {
    return <span className="board-event-placement">Slot {currentSlot} pe Despre</span>;
  }

  return (
    <form action={action} className="board-archive-placement">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="target_slot" value={selected?.slot ?? ""} />
      <input type="hidden" name="expected_occupant_id" value={selected?.occupantId ?? ""} />
      <select value={slotValue} onChange={(event) => setSlotValue(event.target.value)} disabled={pending} aria-label="Poziție pe Despre">
        <option value="">Adaugă pe Despre</option>
        {slots.map((slot) => {
          const unavailable = Boolean(slot.occupantId) && !slot.occupantEnded;
          const label = !slot.occupantId
            ? `Slot ${slot.slot} · liber`
            : slot.occupantEnded
              ? `Slot ${slot.slot} · înlocuiește ${slot.occupantTitle}`
              : `Slot ${slot.slot} · ocupat de un eveniment activ`;
          return <option key={slot.slot} value={slot.slot} disabled={unavailable}>{label}</option>;
        })}
      </select>
      <button type="submit" className="dash-button dash-button--secondary" disabled={pending || !selected}>
        {pending ? "Se adaugă..." : "Confirmă"}
      </button>
      <MutationMessage state={state} />
    </form>
  );
}
