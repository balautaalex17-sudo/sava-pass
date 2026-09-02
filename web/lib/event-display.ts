import type { EventCategory, EventRecord, EventStatus } from "@/lib/event-types";

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  petrecere: "Petrecere",
  quiz: "Quiz",
  atelier: "Atelier",
  cultural: "Cultural",
  educational: "Educațional",
  sport: "Sport",
  fundraising: "Caritabil",
  recruitment: "Recrutare",
  club: "Club",
  in_school: "În liceu",
  recrut: "Recrut",
  other: "Alt tip",
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: "Urmează",
  ongoing: "În desfășurare",
  past: "Eveniment încheiat",
  "date-unknown": "Dată neconfirmată",
};

export function formatEventDate(event: Pick<EventRecord, "startDate" | "endDate">, long = false) {
  if (!event.startDate) return "Dată neconfirmată";
  const start = new Date(`${event.startDate}T12:00:00Z`);
  const formatter = new Intl.DateTimeFormat("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
  });
  if (!event.endDate || event.endDate === event.startDate) return formatter.format(start);
  const end = new Date(`${event.endDate}T12:00:00Z`);
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function formatEventTime(event: Pick<EventRecord, "startTime" | "endTime">) {
  if (!event.startTime) return undefined;
  return event.endTime ? `${event.startTime}–${event.endTime}` : event.startTime;
}

export function formatCompactEventDate(value: string) {
  const formatted = new Intl.DateTimeFormat("ro-RO", {
    timeZone: "Europe/Bucharest",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
  const clean = formatted.replace(",", " ·").replaceAll(".", "");
  return clean.charAt(0).toLocaleUpperCase("ro-RO") + clean.slice(1);
}

export function normalizeSearch(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .replace(/\s+/g, " ")
    .trim();
}

export type ArchiveFilters = {
  status: "all" | EventStatus;
  year: "all" | string;
  category: "all" | EventCategory;
  query: string;
};

export function academicYearForDate(value?: string) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export function filterArchiveEvents(events: EventRecord[], filters: ArchiveFilters) {
  const query = normalizeSearch(filters.query);
  return events.filter((event) => {
    if (filters.status !== "all" && event.eventStatus !== filters.status) return false;
    if (filters.year !== "all" && academicYearForDate(event.startDate) !== filters.year) return false;
    if (filters.category !== "all" && event.category !== filters.category) return false;
    if (!query) return true;
    return normalizeSearch([
      event.title,
      event.shortDescription,
      event.venueName,
      event.charitableCause,
      ...event.collaborators,
    ].filter(Boolean).join(" ")).includes(query);
  });
}
