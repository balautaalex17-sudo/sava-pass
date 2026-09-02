import assert from "node:assert/strict";
import test from "node:test";
import {
  bucharestDateTimeToIso,
  getEventStatus,
  isEventEnded,
  sortPublicEvents,
  toBucharestDateTimeInput,
  type EventLifecycleFields,
} from "../lib/event-lifecycle";

function event(
  id: string,
  startsAt: string,
  endsAt: string,
  options: Partial<EventLifecycleFields> = {},
) {
  return {
    id,
    status: "active" as const,
    starts_at: startsAt,
    ends_at: endsAt,
    manually_ended_at: null,
    ...options,
  };
}

test("effective status ends exactly at ends_at without a scheduler", () => {
  const row = event("automatic", "2026-09-15T16:00:00Z", "2026-09-15T19:00:00Z");
  assert.equal(getEventStatus(row, new Date("2026-09-15T18:59:59Z")), "active");
  assert.equal(getEventStatus(row, new Date("2026-09-15T19:00:00Z")), "ended");
});

test("manual and stored ended states are permanent lifecycle signals", () => {
  const futureEnd = "2026-12-01T20:00:00Z";
  assert.equal(isEventEnded(event("manual", "2026-11-01T18:00:00Z", futureEnd, {
    manually_ended_at: "2026-09-01T10:00:00Z",
  }), new Date("2026-09-01T10:01:00Z")), true);
  assert.equal(isEventEnded(event("stored", "2026-11-01T18:00:00Z", futureEnd, {
    status: "past",
  }), new Date("2026-09-01T10:01:00Z")), true);
});

test("featured placement does not affect lifecycle", () => {
  const activeFeatured = { ...event("featured", "2026-09-10T17:00:00Z", "2026-09-10T21:00:00Z"), featured_slot: 1 };
  const activeUnfeatured = { ...activeFeatured, featured_slot: null };
  const endedFeatured = { ...event("ended-featured", "2026-08-30T17:00:00Z", "2026-08-30T23:00:00Z"), featured_slot: 1 };
  const now = new Date("2026-09-01T10:00:00Z");
  assert.equal(getEventStatus(activeFeatured, now), "active");
  assert.equal(getEventStatus(activeUnfeatured, now), "active");
  assert.equal(getEventStatus(endedFeatured, now), "ended");
  assert.equal(endedFeatured.featured_slot, 1);
});

test("an event ending at 02:00 Bucharest on August 31 is ended by September 2", () => {
  const row = event("bucharest-overnight", "2026-08-30T17:00:00Z", "2026-08-30T23:00:00Z");
  assert.equal(toBucharestDateTimeInput(row.ends_at), "2026-08-31T02:00");
  assert.equal(getEventStatus(row, new Date("2026-08-30T22:59:59Z")), "active");
  assert.equal(getEventStatus(row, new Date("2026-09-02T00:00:00Z")), "ended");
});

test("public ordering is active by start, then ended by effective end descending", () => {
  const now = new Date("2026-09-01T10:00:00Z");
  const ordered = sortPublicEvents([
    event("ended-old", "2026-08-01T16:00:00Z", "2026-08-01T20:00:00Z"),
    event("active-later", "2026-09-20T16:00:00Z", "2026-09-20T20:00:00Z"),
    event("ended-new", "2026-08-30T16:00:00Z", "2026-08-30T20:00:00Z"),
    event("active-next", "2026-09-10T16:00:00Z", "2026-09-10T20:00:00Z"),
  ], now);
  assert.deepEqual(ordered.map((row) => row.id), [
    "active-next",
    "active-later",
    "ended-new",
    "ended-old",
  ]);
});

test("dashboard datetime values round-trip through Europe/Bucharest", () => {
  assert.equal(bucharestDateTimeToIso("2026-09-15T22:00"), "2026-09-15T19:00:00.000Z");
  assert.equal(bucharestDateTimeToIso("2026-01-15T22:00"), "2026-01-15T20:00:00.000Z");
  assert.equal(toBucharestDateTimeInput("2026-09-15T19:00:00.000Z"), "2026-09-15T22:00");
});
