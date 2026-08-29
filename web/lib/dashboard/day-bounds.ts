function offsetFor(date: Date, timeZone: string): string {
  const value = new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "longOffset" }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = value.match(/GMT([+-]\d{2}:\d{2})/);
  return match?.[1] ?? "+00:00";
}

export function bucharestDayBounds(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const calendar = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  const nextCalendar = new Date(calendar.getTime() + 24 * 60 * 60 * 1000);
  const ymd = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`;
  return { start: new Date(`${ymd(calendar)}T00:00:00${offsetFor(calendar, "Europe/Bucharest")}`).toISOString(), end: new Date(`${ymd(nextCalendar)}T00:00:00${offsetFor(nextCalendar, "Europe/Bucharest")}`).toISOString() };
}
