import "server-only";
import { cache } from "react";

import generatedEvents from "@/data/instagram-events.generated.json";
import eventOverrides from "@/data/event-overrides.json";
import { getSiteContent } from "@/lib/club";
import { GOLDEN_HOUR_EVENT } from "@/lib/golden-hour";
import { isEventEnded } from "@/lib/event-lifecycle";
import type { EventOverride, EventRecord } from "@/lib/event-types";
import type { Event } from "@/lib/supabase/types";

export const ARCHIVE_YEARS = ["2026-2027", "2025-2026", "2024-2025"] as const;
export const BOARD_EVENT_OVERRIDE_PREFIX = "event.archive.";

type EventOverrideMap = Record<string, EventOverride>;

function mergedOverrideMap(boardOverrides: EventOverrideMap = {}): EventOverrideMap {
  const importedOverrides = eventOverrides.events as EventOverrideMap;
  const slugs = new Set([...Object.keys(importedOverrides), ...Object.keys(boardOverrides)]);
  return Object.fromEntries(
    [...slugs].map((slug) => [slug, { ...importedOverrides[slug], ...boardOverrides[slug] }]),
  );
}

function isEventOverride(value: unknown): value is EventOverride {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Board edits live in the existing JSON-backed site-content table, one row per
 * imported event. Keeping them separate preserves the original Instagram data. */
export async function getBoardEventOverrides(): Promise<EventOverrideMap> {
  const content = await getSiteContent();
  const overrides: EventOverrideMap = {};
  for (const [key, value] of Object.entries(content)) {
    if (!key.startsWith(BOARD_EVENT_OVERRIDE_PREFIX) || !isEventOverride(value)) continue;
    overrides[key.slice(BOARD_EVENT_OVERRIDE_PREFIX.length)] = value;
  }
  return overrides;
}

function bucharestDateTime(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

export function ticketingEventToArchiveEvent(event: Event, legacy?: EventRecord): EventRecord {
  const starts = bucharestDateTime(event.starts_at);
  const ends = bucharestDateTime(event.ends_at);
  const ended = isEventEnded(event);
  const eventStatus: EventRecord["eventStatus"] = ended
    ? "past"
    : new Date(event.starts_at).getTime() <= Date.now()
      ? "ongoing"
      : "upcoming";
  const record: EventRecord = {
    ...legacy,
    id: `ticketing-${event.id}`,
    slug: event.slug,
    title: event.title,
    subtitle: event.subtitle ?? undefined,
    shortDescription: event.subtitle || event.about || legacy?.shortDescription || `${event.date_label} · ${event.venue}`,
    fullDescription: event.about ?? legacy?.fullDescription,
    startDate: starts.date,
    startTime: starts.time,
    endDate: ends.date,
    endTime: ends.time,
    timezone: "Europe/Bucharest",
    venueName: event.venue,
    address: event.venue_line ?? undefined,
    category: legacy?.category ?? "other",
    ticketPrice: `${Math.round(event.price_bani / 100)} RON`,
    registrationUrl: !ended && event.status === "active" ? `/${event.slug}/checkout` : undefined,
    internalTicketingUrl: legacy ? `/evenimente/${event.slug}` : `/${event.slug}`,
    collaborators: legacy?.collaborators ?? [],
    sponsors: legacy?.sponsors ?? [],
    coverImage: {
      src: event.photo_url ?? legacy?.coverImage.src ?? "",
      alt: `Afișul evenimentului ${event.title}`,
      type: legacy?.coverImage.type ?? "poster",
      position: legacy?.coverImage.position,
    },
    gallery: legacy?.gallery ?? [],
    instagramPostUrls: legacy?.instagramPostUrls ?? [],
    instagramPostIds: legacy?.instagramPostIds ?? [],
    publishedAt: event.created_at,
    eventStatus,
    lifecycleEndedAt: event.manually_ended_at ?? event.ends_at,
    publishingStatus: "published",
    extractionConfidence: "high",
    missingFields: legacy?.missingFields ?? [],
    lastSyncedAt: event.created_at,
  };
  return record;
}

function applyRuntimeOverride(event: EventRecord, overrides: EventOverrideMap) {
  const override = overrides[event.slug] || {};
  const fields = Object.fromEntries(
    Object.entries(override).filter(([key]) => !["hidden", "publish", "mergeInto", "splitSourceIds", "imagePosition"].includes(key)),
  ) as Partial<EventRecord>;
  const next = { ...event, ...fields } as EventRecord;
  if (override.imagePosition) {
    next.coverImage = { ...next.coverImage, position: override.imagePosition };
  }
  if (override.publish === true) next.publishingStatus = "published";
  if (override.publish === false || override.hidden) next.publishingStatus = "draft";
  // Imported Instagram records are presentation/history only. Database events
  // are the sole source for active/ended lifecycle and ticket availability.
  next.eventStatus = "past";
  next.registrationUrl = undefined;
  return next;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function applyRuntimeStructure(events: EventRecord[], overrides: EventOverrideMap) {
  const structured = events.map((event) => ({
    ...event,
    coverImage: { ...event.coverImage },
    gallery: event.gallery.map((image) => ({ ...image })),
    instagramPostIds: [...event.instagramPostIds],
    instagramPostUrls: [...event.instagramPostUrls],
  }));

  for (const [slug, override] of Object.entries(overrides)) {
    if (!override.splitSourceIds?.length) continue;
    const sourceIndex = structured.findIndex((event) => event.slug === slug);
    if (sourceIndex === -1) continue;
    const source = structured[sourceIndex];
    const selectedIds = unique(override.splitSourceIds).filter((id) => source.instagramPostIds.includes(id));
    if (selectedIds.length === 0 || selectedIds.length === source.instagramPostIds.length) continue;
    const selected = new Set(selectedIds);
    const selectedUrls = source.instagramPostUrls.filter((url, index) => selected.has(source.instagramPostIds[index]) || selectedIds.some((id) => url.includes(`/${id}`)));
    const splitKey = selectedIds.slice().sort().join("-").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40) || "review";
    structured.splice(sourceIndex, 1,
      { ...source, instagramPostIds: source.instagramPostIds.filter((id) => !selected.has(id)), instagramPostUrls: source.instagramPostUrls.filter((url) => !selectedUrls.includes(url)) },
      {
        ...source,
        id: `${source.id}-split-${splitKey}`,
        slug: `${source.slug}-split-${splitKey}`,
        coverImage: { src: "", alt: `Fallback tipografic pentru ${source.title}`, type: source.coverImage.type },
        gallery: source.gallery.filter((image) => image.sourcePostUrl && selectedUrls.includes(image.sourcePostUrl)),
        instagramPostIds: selectedIds,
        instagramPostUrls: selectedUrls,
        publishingStatus: "draft",
        extractionConfidence: "low",
        missingFields: unique([...source.missingFields, "editorialReview"]),
      },
    );
  }

  for (const [sourceSlug, override] of Object.entries(overrides)) {
    if (!override.mergeInto || override.mergeInto === sourceSlug) continue;
    const sourceIndex = structured.findIndex((event) => event.slug === sourceSlug);
    const targetIndex = structured.findIndex((event) => event.slug === override.mergeInto);
    if (sourceIndex === -1 || targetIndex === -1) continue;
    const source = structured[sourceIndex];
    const target = structured[targetIndex];
    const merged: EventRecord = {
      ...source,
      ...target,
      id: target.id,
      slug: target.slug,
      collaborators: unique([...target.collaborators, ...source.collaborators]),
      sponsors: unique([...target.sponsors, ...source.sponsors]),
      gallery: [...target.gallery, ...source.gallery].filter((image, index, all) => image.src && all.findIndex((candidate) => candidate.src === image.src) === index),
      instagramPostIds: unique([...target.instagramPostIds, ...source.instagramPostIds]),
      instagramPostUrls: unique([...target.instagramPostUrls, ...source.instagramPostUrls]),
      missingFields: unique([...target.missingFields, ...source.missingFields]),
    };
    const firstIndex = Math.min(sourceIndex, targetIndex);
    const secondIndex = Math.max(sourceIndex, targetIndex);
    structured.splice(secondIndex, 1);
    structured.splice(firstIndex, 1, merged);
  }

  return structured;
}

export function getGeneratedEvents(boardOverrides: EventOverrideMap = {}) {
  const extracted = generatedEvents as EventRecord[];
  const events = extracted.some((event) => event.slug === GOLDEN_HOUR_EVENT.slug)
    ? extracted
    : [GOLDEN_HOUR_EVENT, ...extracted];
  const overrides = mergedOverrideMap(boardOverrides);
  return applyRuntimeStructure(events, overrides).map((event) => applyRuntimeOverride(event, overrides));
}

export function getPublishedEvents() {
  return getGeneratedEvents()
    .filter((event) => event.publishingStatus === "published")
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
}

/** Imported/public events after applying edits saved from Board. */
export const getManagedArchiveEvents = cache(async () => {
  return getGeneratedEvents(await getBoardEventOverrides());
});

export const getManagedPublishedEvents = cache(async () => {
  return (await getManagedArchiveEvents())
    .filter((event) => event.publishingStatus === "published")
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
});

export async function getManagedEventBySlug(slug: string, includeDraft = false) {
  const events = includeDraft ? await getManagedArchiveEvents() : await getManagedPublishedEvents();
  return events.find((event) => event.slug === slug) || null;
}

export async function getManagedRelatedEvents(event: EventRecord, limit = 3) {
  return (await getManagedPublishedEvents())
    .filter((candidate) => candidate.id !== event.id)
    .sort((a, b) => {
      const aScore = Number(a.category === event.category) + Number(Boolean(a.charitableCause && event.charitableCause));
      const bScore = Number(b.category === event.category) + Number(Boolean(b.charitableCause && event.charitableCause));
      return bScore - aScore || (b.startDate || "").localeCompare(a.startDate || "");
    })
    .slice(0, limit);
}

export function getEventBySlug(slug: string) {
  return getPublishedEvents().find((event) => event.slug === slug) || null;
}

export function getRelatedEvents(event: EventRecord, limit = 3) {
  return getPublishedEvents()
    .filter((candidate) => candidate.id !== event.id)
    .sort((a, b) => {
      const aScore = Number(a.category === event.category) + Number(Boolean(a.charitableCause && event.charitableCause));
      const bScore = Number(b.category === event.category) + Number(Boolean(b.charitableCause && event.charitableCause));
      return bScore - aScore || (b.startDate || "").localeCompare(a.startDate || "");
    })
    .slice(0, limit);
}

export function getImagePosition(slug: string) {
  const overrides = eventOverrides.events as Record<string, EventOverride>;
  return overrides[slug]?.imagePosition || "center";
}
