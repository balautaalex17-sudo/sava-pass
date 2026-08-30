import test from "node:test";
import assert from "node:assert/strict";
import {
  academicYearForDate,
  applyOverrides,
  applyStructuralOverrides,
  calculateEventStatus,
  deduplicateEvents,
  filterEvents,
  hasUsableImage,
  parseRomanianDate,
  parseTime,
  slugify,
  sortPastEvents,
  sortUpcomingEvents,
  stableEventId,
} from "../scripts/event-archive-core.mjs";

function event(overrides = {}) {
  const base = {
    id: "",
    slug: "eveniment-test",
    title: "Eveniment Test",
    shortDescription: "O întâlnire caritabilă pentru elevi.",
    startDate: "2026-05-16",
    startTime: "14:00",
    endTime: "16:00",
    timezone: "Europe/Bucharest",
    venueName: "București",
    category: "educational",
    collaborators: [],
    sponsors: [],
    coverImage: { src: "/events/test.png", alt: "Afiș de test", type: "poster" },
    gallery: [],
    instagramPostUrls: ["https://www.instagram.com/p/test/"],
    instagramPostIds: ["test"],
    originalCaption: "Te așteptăm pe 16 mai, la București.",
    eventStatus: "past",
    publishingStatus: "published",
    extractionConfidence: "high",
    missingFields: [],
    lastSyncedAt: "2026-08-10T12:00:00.000Z",
    ...overrides,
  };
  base.id = stableEventId(base);
  return base;
}

test("interpretează lunile românești și refuză o dată imposibilă", () => {
  assert.equal(parseRomanianDate("12 februarie 2026"), "2026-02-12");
  assert.equal(parseRomanianDate("4 APR. 2026"), "2026-04-04");
  assert.equal(parseRomanianDate("22 iunie", 2026), "2026-06-22");
  assert.equal(parseRomanianDate("31 februarie 2026"), undefined);
  assert.equal(parseTime("începând cu ora 20:00"), "20:00");
});

test("calculează starea în fusul Europe/Bucharest", () => {
  const sample = event({ startDate: "2026-05-16", startTime: "14:00", endTime: "16:00" });
  assert.equal(calculateEventStatus(sample, new Date("2026-05-16T09:00:00Z")), "upcoming");
  assert.equal(calculateEventStatus(sample, new Date("2026-05-16T12:00:00Z")), "ongoing");
  assert.equal(calculateEventStatus(sample, new Date("2026-05-16T14:30:00Z")), "past");
});

test("o dată lipsă rămâne explicit necunoscută", () => {
  assert.equal(calculateEventStatus(event({ startDate: undefined })), "date-unknown");
});

test("generează sluguri stabile cu diacritice", () => {
  assert.equal(slugify("CE SPUN ELEVII"), "ce-spun-elevii");
  assert.equal(slugify("Târg de Paște"), "targ-de-paste");
});

test("comasează anunțul, reminderul și recapitularea aceluiași eveniment", () => {
  const first = event({ instagramPostUrls: ["https://www.instagram.com/p/a/"], instagramPostIds: ["a"] });
  const reminder = event({ instagramPostUrls: ["https://www.instagram.com/p/b/"], instagramPostIds: ["b"], originalCaption: "Ne vedem pe 16 mai la București, la Eveniment Test." });
  const recap = event({ instagramPostUrls: ["https://www.instagram.com/p/c/"], instagramPostIds: ["c"], originalCaption: "Eveniment Test, 16 mai, București. Mulțumim!" });
  const merged = deduplicateEvents([first, reminder, recap]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].instagramPostIds, ["a", "b", "c"]);
});

test("nu comasează două evenimente doar pentru că au aceeași locație", () => {
  const first = event({ title: "Atelier A", slug: "atelier-a" });
  const second = event({ title: "Quiz B", slug: "quiz-b", startDate: "2026-05-17", originalCaption: "Quiz public pe 17 mai." });
  assert.equal(deduplicateEvents([first, second]).length, 2);
});

test("filtrele și căutarea ignoră diacriticele", () => {
  const events = [
    event({ title: "CE SPUN ELEVII", venueName: "Piața Romană", eventStatus: "past", category: "educational" }),
    event({ title: "Cupid's Hex", slug: "cupids-hex", startDate: "2026-02-12", eventStatus: "past", category: "petrecere" }),
  ];
  assert.deepEqual(filterEvents(events, { status: "past", year: "2025-2026", category: "educational", query: "piata romana" }).map((item) => item.title), ["CE SPUN ELEVII"]);
  assert.equal(filterEvents(events, { query: "cupid" }).length, 1);
});

test("anul școlar începe la 1 septembrie și se termină la 31 august", () => {
  assert.equal(academicYearForDate("2026-08-31"), "2025-2026");
  assert.equal(academicYearForDate("2026-09-01"), "2026-2027");
  assert.equal(academicYearForDate(undefined), undefined);
});

test("detectează când trebuie afișat fallback-ul tipografic", () => {
  assert.equal(hasUsableImage(event()), true);
  assert.equal(hasUsableImage(event({ coverImage: { src: "", alt: "Fallback pentru eveniment", type: "poster" } })), false);
});

test("ordonează viitoarele crescător și arhiva descrescător", () => {
  const events = [
    event({ title: "Mai târziu", startDate: "2026-10-10", eventStatus: "upcoming" }),
    event({ title: "Mai curând", startDate: "2026-09-01", eventStatus: "upcoming" }),
    event({ title: "Trecut vechi", startDate: "2024-01-01", eventStatus: "past" }),
    event({ title: "Trecut nou", startDate: "2025-01-01", eventStatus: "past" }),
  ];
  assert.deepEqual(sortUpcomingEvents(events).map((item) => item.title), ["Mai curând", "Mai târziu"]);
  assert.deepEqual(sortPastEvents(events).map((item) => item.title), ["Trecut nou", "Trecut vechi"]);
});

test("aplică override-uri fără să schimbe datele-sursă", () => {
  const original = event({ publishingStatus: "draft" });
  const [overridden] = applyOverrides([original], { events: { "eveniment-test": { publish: true, title: "Titlu corectat", venueName: "Loc verificat" } } });
  assert.equal(overridden.publishingStatus, "published");
  assert.equal(overridden.title, "Titlu corectat");
  assert.equal(overridden.venueName, "Loc verificat");
  assert.equal(original.title, "Eveniment Test");
});

test("arhivarea ascunde evenimentul fără să piardă modificările sau sursa", () => {
  const original = event({ publishingStatus: "published" });
  const [archived] = applyOverrides([original], { events: { "eveniment-test": { publish: false, title: "Titlu păstrat" } } });
  assert.equal(archived.publishingStatus, "draft");
  assert.equal(archived.title, "Titlu păstrat");
  assert.equal(original.publishingStatus, "published");
  assert.equal(original.title, "Eveniment Test");
});

test("override-urile structurale pot uni și separa surse fără a publica automat draftul separat", () => {
  const target = event({ slug: "eveniment-tinta", title: "Eveniment Țintă", instagramPostIds: ["a"], instagramPostUrls: ["https://www.instagram.com/p/a/"] });
  const source = event({ slug: "anunt-separat", title: "Anunț separat", instagramPostIds: ["b"], instagramPostUrls: ["https://www.instagram.com/p/b/"] });
  const [merged] = applyStructuralOverrides([target, source], { events: { "anunt-separat": { mergeInto: "eveniment-tinta" } } });
  assert.equal(merged.slug, "eveniment-tinta");
  assert.deepEqual(merged.instagramPostIds, ["a", "b"]);

  const combined = event({ instagramPostIds: ["a", "b", "c"], instagramPostUrls: ["https://www.instagram.com/p/a/", "https://www.instagram.com/p/b/", "https://www.instagram.com/p/c/"] });
  const split = applyStructuralOverrides([combined], { events: { "eveniment-test": { splitSourceIds: ["c"] } } });
  assert.equal(split.length, 2);
  assert.deepEqual(split[0].instagramPostIds, ["a", "b"]);
  assert.equal(split[1].publishingStatus, "draft");
  assert.deepEqual(split[1].instagramPostIds, ["c"]);
});
