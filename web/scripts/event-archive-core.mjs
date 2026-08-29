import { createHash } from "node:crypto";

export const TIMEZONE = "Europe/Bucharest";
export const ACADEMIC_YEARS = ["2026-2027", "2025-2026", "2024-2025"];

export function academicYearForDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

const MONTHS = new Map([
  ["ianuarie", 1], ["ian", 1],
  ["februarie", 2], ["feb", 2],
  ["martie", 3], ["mar", 3],
  ["aprilie", 4], ["apr", 4],
  ["mai", 5],
  ["iunie", 6], ["iun", 6],
  ["iulie", 7], ["iul", 7],
  ["august", 8], ["aug", 8],
  ["septembrie", 9], ["sept", 9], ["sep", 9],
  ["octombrie", 10], ["oct", 10],
  ["noiembrie", 11], ["nov", 11],
  ["decembrie", 12], ["dec", 12],
]);

export function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s:/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value = "") {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "eveniment";
}

export function parseRomanianDate(value, contextYear) {
  if (!value) return undefined;
  const iso = String(value).match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const normalized = normalizeText(String(value)).replace(/\./g, " ");
  const match = normalized.match(/\b([0-3]?\d)\s+(ianuarie|ian|februarie|feb|martie|mar|aprilie|apr|mai|iunie|iun|iulie|iul|august|aug|septembrie|sept|sep|octombrie|oct|noiembrie|nov|decembrie|dec)(?:\s+(20\d{2}))?\b/);
  if (!match) return undefined;
  const day = Number(match[1]);
  const month = MONTHS.get(match[2]);
  const year = Number(match[3] || contextYear);
  if (!month || !year || day < 1 || day > 31) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseTime(value = "") {
  const normalized = String(value).replace(/\./g, ":");
  const match = normalized.match(/(?:ora|de la|începând cu ora|incepand cu ora)?\s*([01]?\d|2[0-3])(?::([0-5]\d))\b/i);
  if (!match) return undefined;
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2] ?? "00"}`;
}

function bucharestParts(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

export function calculateEventStatus(event, now = new Date()) {
  if (!event.startDate) return "date-unknown";
  const current = bucharestParts(now);
  const endDate = event.endDate || event.startDate;
  if (current.date < event.startDate) return "upcoming";
  if (current.date > endDate) return "past";
  if (current.date > event.startDate && current.date < endDate) return "ongoing";
  if (event.startDate === endDate) {
    if (event.startTime && current.time < event.startTime) return "upcoming";
    if (event.endTime && current.time > event.endTime) return "past";
  }
  return "ongoing";
}

const EVENT_SIGNAL = /(te invit[aă]m|te a[sș]tept[aă]m|ne vedem|pe data de|[îi]ncep[aâ]nd cu ora|bilete|dona[tț]ie|[îi]nscrieri|loca[tț]ie|unde\?|c[aâ]nd\?|\b(?:[0-3]?\d)\s+(?:ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)\b|\b(?:[01]?\d|2[0-3]):[0-5]\d\b)/i;
const NON_EVENT = /(board|cunoa[sș]te echipa|member spotlight|membrul s[aă]pt[aă]m[aâ]nii|aniversar|mul[tț]umim sponsor|recrut[aă]ri|aplic[aă] acum)/i;
const PUBLIC_ACTIVITY = /(eveniment|petrecere|concert|atelier|quiz|turneu|t[aâ]rg|proiec[tț]ie|movie night|dezbatere|tur|hunt|workshop)/i;

export function isEventCandidate(post) {
  if (post.event?.title) return true;
  const text = `${post.caption || ""} ${post.ocrText || ""}`;
  if (!EVENT_SIGNAL.test(text)) return false;
  if (NON_EVENT.test(text) && !PUBLIC_ACTIVITY.test(text)) return false;
  return true;
}

export function stableEventId(event) {
  const signature = [normalizeText(event.title), event.startDate || "date-unknown", normalizeText(event.venueName || "")].join("|");
  return `ig-${createHash("sha256").update(signature).digest("hex").slice(0, 16)}`;
}

function words(value = "") {
  return new Set(normalizeText(value).split(" ").filter((word) => word.length > 2));
}

export function textSimilarity(a = "", b = "") {
  const aa = words(a);
  const bb = words(b);
  if (!aa.size || !bb.size) return 0;
  const shared = [...aa].filter((word) => bb.has(word)).length;
  return shared / (aa.size + bb.size - shared);
}

export function shouldMergeEvents(a, b) {
  const sameTitle = normalizeText(a.title) === normalizeText(b.title);
  const sameDate = Boolean(a.startDate && b.startDate && a.startDate === b.startDate);
  const sameLink = Boolean(a.registrationUrl && b.registrationUrl && a.registrationUrl === b.registrationUrl);
  const sameVenue = Boolean(a.venueName && b.venueName && normalizeText(a.venueName) === normalizeText(b.venueName));
  const similarCaption = textSimilarity(a.originalCaption, b.originalCaption) >= 0.72;
  return (sameTitle && (sameDate || sameLink || similarCaption)) || (sameDate && sameVenue && similarCaption) || sameLink;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function mergeEventRecords(a, b) {
  const primary = a.extractionConfidence === "high" ? a : b.extractionConfidence === "high" ? b : a;
  const secondary = primary === a ? b : a;
  const merged = {
    ...secondary,
    ...primary,
    title: primary.title || secondary.title,
    shortDescription: primary.shortDescription || secondary.shortDescription,
    fullDescription: primary.fullDescription || secondary.fullDescription,
    coverImage: primary.coverImage?.src ? primary.coverImage : secondary.coverImage,
    gallery: [...(a.gallery || []), ...(b.gallery || [])].filter((item, index, all) => item.src && all.findIndex((candidate) => candidate.src === item.src) === index),
    collaborators: unique([...(a.collaborators || []), ...(b.collaborators || [])]),
    sponsors: unique([...(a.sponsors || []), ...(b.sponsors || [])]),
    instagramPostUrls: unique([...(a.instagramPostUrls || []), ...(b.instagramPostUrls || [])]),
    instagramPostIds: unique([...(a.instagramPostIds || []), ...(b.instagramPostIds || [])]),
    missingFields: unique([...(a.missingFields || []), ...(b.missingFields || [])]).filter((field) => {
      if (field === "startDate") return !(primary.startDate || secondary.startDate);
      if (field === "coverImage") return !(primary.coverImage?.src || secondary.coverImage?.src);
      return true;
    }),
  };
  merged.id = stableEventId(merged);
  return merged;
}

export function deduplicateEvents(events) {
  const canonical = [];
  for (const event of events) {
    const index = canonical.findIndex((candidate) => shouldMergeEvents(candidate, event));
    if (index === -1) canonical.push(event);
    else canonical[index] = mergeEventRecords(canonical[index], event);
  }
  return canonical;
}

export function sortEvents(events) {
  return [...events].sort((a, b) => {
    const aDate = a.startDate || "0000-00-00";
    const bDate = b.startDate || "0000-00-00";
    return bDate.localeCompare(aDate) || a.title.localeCompare(b.title, "ro");
  });
}

export function sortUpcomingEvents(events) {
  return [...events].filter((event) => event.eventStatus === "upcoming").sort((a, b) => (a.startDate || "9999").localeCompare(b.startDate || "9999"));
}

export function sortPastEvents(events) {
  return sortEvents(events.filter((event) => event.eventStatus === "past"));
}

export function filterEvents(events, filters = {}) {
  const query = normalizeText(filters.query || "");
  return events.filter((event) => {
    if (filters.status && filters.status !== "all" && event.eventStatus !== filters.status) return false;
    if (filters.year && academicYearForDate(event.startDate) !== String(filters.year)) return false;
    if (filters.category && event.category !== filters.category) return false;
    if (!query) return true;
    return normalizeText([event.title, event.shortDescription, event.venueName, event.charitableCause, ...(event.collaborators || [])].filter(Boolean).join(" ")).includes(query);
  });
}

export function hasUsableImage(event) {
  return Boolean(event?.coverImage?.src && event?.coverImage?.alt);
}

function cloneEvent(event) {
  return {
    ...event,
    coverImage: { ...(event.coverImage || {}) },
    gallery: (event.gallery || []).map((image) => ({ ...image })),
    collaborators: [...(event.collaborators || [])],
    sponsors: [...(event.sponsors || [])],
    instagramPostUrls: [...(event.instagramPostUrls || [])],
    instagramPostIds: [...(event.instagramPostIds || [])],
    missingFields: [...(event.missingFields || [])],
  };
}

export function applyStructuralOverrides(events, overrideDocument = {}) {
  const entries = overrideDocument.events || {};
  const structured = events.map(cloneEvent);

  for (const [slug, override] of Object.entries(entries)) {
    if (!Array.isArray(override.splitSourceIds) || override.splitSourceIds.length === 0) continue;
    const sourceIndex = structured.findIndex((event) => event.slug === slug);
    if (sourceIndex === -1) continue;
    const source = structured[sourceIndex];
    const selectedIds = unique(override.splitSourceIds).filter((id) => source.instagramPostIds.includes(id));
    if (selectedIds.length === 0 || selectedIds.length === source.instagramPostIds.length) continue;
    const selectedIdSet = new Set(selectedIds);
    const selectedUrls = source.instagramPostUrls.filter((url, index) => {
      const alignedId = source.instagramPostIds[index];
      return selectedIdSet.has(alignedId) || selectedIds.some((id) => url.includes(`/${id}`));
    });
    const remaining = {
      ...source,
      instagramPostIds: source.instagramPostIds.filter((id) => !selectedIdSet.has(id)),
      instagramPostUrls: source.instagramPostUrls.filter((url) => !selectedUrls.includes(url)),
    };
    const splitHash = createHash("sha256").update(selectedIds.slice().sort().join("|")).digest("hex").slice(0, 10);
    const splitGallery = source.gallery.filter((image) => image.sourcePostUrl && selectedUrls.includes(image.sourcePostUrl));
    const splitCover = splitGallery[0]
      ? { ...splitGallery[0] }
      : { src: "", alt: `Fallback tipografic pentru ${source.title}`, type: source.coverImage?.type || "poster" };
    const split = {
      ...source,
      id: `ig-split-${splitHash}`,
      slug: `${source.slug}-split-${splitHash}`,
      coverImage: splitCover,
      gallery: splitGallery,
      instagramPostIds: selectedIds,
      instagramPostUrls: selectedUrls,
      publishingStatus: "draft",
      extractionConfidence: "low",
      missingFields: unique([...(source.missingFields || []), "editorialReview"]),
    };
    structured.splice(sourceIndex, 1, remaining, split);
  }

  for (const [sourceSlug, override] of Object.entries(entries)) {
    if (!override.mergeInto || override.mergeInto === sourceSlug) continue;
    const sourceIndex = structured.findIndex((event) => event.slug === sourceSlug);
    const targetIndex = structured.findIndex((event) => event.slug === override.mergeInto);
    if (sourceIndex === -1 || targetIndex === -1) continue;
    const source = structured[sourceIndex];
    const target = structured[targetIndex];
    const merged = mergeEventRecords(target, source);
    merged.id = target.id;
    merged.slug = target.slug;
    const firstIndex = Math.min(sourceIndex, targetIndex);
    const secondIndex = Math.max(sourceIndex, targetIndex);
    structured.splice(secondIndex, 1);
    structured.splice(firstIndex, 1, merged);
  }

  return structured;
}

export function applyOverrides(events, overrideDocument = {}) {
  const entries = overrideDocument.events || {};
  return applyStructuralOverrides(events, overrideDocument).map((event) => {
    const override = entries[event.slug] || {};
    const fields = Object.fromEntries(
      Object.entries(override).filter(([key]) => !["hidden", "featured", "publish", "imagePosition", "mergeInto", "splitSourceIds"].includes(key)),
    );
    const next = { ...event, ...fields };
    if (override.imagePosition) next.coverImage = { ...next.coverImage, position: override.imagePosition };
    if (override.publish === true) next.publishingStatus = "published";
    if (override.publish === false || override.hidden) next.publishingStatus = "draft";
    next.eventStatus = calculateEventStatus(next);
    return next;
  });
}
