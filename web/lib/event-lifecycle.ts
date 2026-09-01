import type { Event } from "@/lib/supabase/types";

export const EVENT_TIME_ZONE = "Europe/Bucharest";

export type EventLifecycleStatus = "active" | "ended";

export type EventLifecycleFields = Pick<
  Event,
  "status" | "starts_at" | "ends_at" | "manually_ended_at"
>;

/** One source of truth for the public active/ended lifecycle. */
export function isEventEnded(
  event: Pick<EventLifecycleFields, "status" | "ends_at" | "manually_ended_at">,
  now: Date | number = Date.now(),
): boolean {
  const nowMs = typeof now === "number" ? now : now.getTime();
  return event.status === "past"
    || event.manually_ended_at !== null
    || new Date(event.ends_at).getTime() <= nowMs;
}

export function getEventStatus(
  event: Pick<EventLifecycleFields, "status" | "ends_at" | "manually_ended_at">,
  now: Date | number = Date.now(),
): EventLifecycleStatus {
  return isEventEnded(event, now) ? "ended" : "active";
}

/** The timestamp used when sorting ended events from newest to oldest. */
export function effectiveEventEndTime(
  event: Pick<EventLifecycleFields, "ends_at" | "manually_ended_at">,
): number {
  return new Date(event.manually_ended_at ?? event.ends_at).getTime();
}

export function sortPublicEvents<T extends EventLifecycleFields>(
  events: readonly T[],
  now: Date | number = Date.now(),
): T[] {
  return [...events].sort((first, second) => {
    const firstEnded = isEventEnded(first, now);
    const secondEnded = isEventEnded(second, now);
    if (firstEnded !== secondEnded) return firstEnded ? 1 : -1;

    if (!firstEnded) {
      return new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime();
    }
    return effectiveEventEndTime(second) - effectiveEventEndTime(first);
  });
}

function bucharestParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

/** Format an absolute database timestamp for a Bucharest datetime-local input. */
export function toBucharestDateTimeInput(value: string | null | undefined): string {
  if (!value) return "";
  const parts = bucharestParts(new Date(value));
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

/** Convert the wall-clock value entered in Bucharest into a UTC ISO timestamp. */
export function bucharestDateTimeToIso(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) throw new Error("invalid_bucharest_datetime");

  const desired = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const desiredAsUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
  );
  let guess = desiredAsUtc;

  // Two passes resolve the UTC offset on both sides of daylight-saving changes.
  for (let pass = 0; pass < 3; pass += 1) {
    const actual = bucharestParts(new Date(guess));
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );
    const correction = desiredAsUtc - actualAsUtc;
    if (correction === 0) break;
    guess += correction;
  }

  const result = new Date(guess).toISOString();
  if (toBucharestDateTimeInput(result) !== value) {
    throw new Error("invalid_bucharest_datetime");
  }
  return result;
}
