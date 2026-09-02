import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { IMMERSIVE_MARKUP } from "../app/_immersive/content";
import { renderImmersiveMarkup, type LandingArchivedEvent, type LandingEvent } from "../app/_immersive/upgrade";

test("Despre archive cards use admin-managed event values", () => {
  const archivedEvents: LandingArchivedEvent[] = [
    {
      title: "Ediție editabilă",
      subtitle: "Subtitlu din admin",
      about: "Descriere actualizată din admin.",
      dateLabel: "27 august 2026",
      venue: "Sala Test",
      priceBani: 5500,
      photoUrl: "https://example.com/poster.webp",
      href: "/editabil",
    },
  ];

  const html = renderImmersiveMarkup(IMMERSIVE_MARKUP, null, null, archivedEvents);

  assert.match(html, /Ediție editabilă/);
  assert.match(html, /Descriere actualizată din admin\./);
  assert.match(html, /27 august 2026/);
  assert.match(html, /Sala Test/);
  assert.match(html, /Eveniment încheiat/);
  assert.match(html, /55 RON/);
  assert.match(html, /Vezi ediția/);
  assert.match(html, /https:\/\/example\.com\/poster\.webp/);
  assert.doesNotMatch(html, /Easter Egg Hunt/);
  assert.doesNotMatch(html, /Cupid&#39;s Hex|Cupid's Hex/);

  const emptyFeatured = html.match(/<article class="ev-feat ev-feat--empty">[\s\S]*?<\/article>/)?.[0];
  assert.ok(emptyFeatured, "The homepage empty-event card is missing");
  assert.match(emptyFeatured, /src="\/media\/story-event\.webp"/);
  assert.doesNotMatch(emptyFeatured, /echoes-unplugged/);
  assert.match(html, /Model SavaPass/);
  assert.match(html, /<h3>Bilet<br\/>digital<\/h3>/);
  assert.match(html, /Locul<b>De anunțat<\/b>/);
  assert.match(html, /Data<b>În curând<\/b>/);
});

test("homepage uses the saved image for the active event and archived cards", () => {
  const activeEvent: LandingEvent = {
    title: "Eveniment activ",
    subtitle: null,
    about: "Descriere activă.",
    dateLabel: "28 august 2026",
    doors: "19:00",
    venue: "Sala Mare",
    venueLine: null,
    capacity: 100,
    sold: 20,
    priceBani: 4500,
    photoUrl: "https://example.com/active-poster.webp",
    href: "/eveniment-activ",
    checkoutHref: "/eveniment-activ/checkout",
    hasProgram: false,
  };
  const archivedEvents: LandingArchivedEvent[] = [{
    title: "Eveniment arhivat",
    subtitle: null,
    about: "Descriere arhivată.",
    dateLabel: "27 august 2026",
    venue: "Sala Mică",
    priceBani: 3500,
    photoUrl: "https://example.com/archived-poster.webp",
    href: "/eveniment-arhivat",
  }];

  const html = renderImmersiveMarkup(IMMERSIVE_MARKUP, activeEvent, null, archivedEvents);

  assert.match(html, /https:\/\/example\.com\/active-poster\.webp/);
  assert.match(html, /https:\/\/example\.com\/archived-poster\.webp/);
});

test("homepage labels promoted active events as active", () => {
  const secondaryEvents: LandingArchivedEvent[] = [{
    title: "Easter Egg Hunt",
    subtitle: "Vânătoare de ouă",
    about: "Eveniment activ.",
    dateLabel: "19 aprilie 2025",
    venue: "Curtea Veche",
    priceBani: 2500,
    photoUrl: "https://example.com/easter.webp",
    href: "/easter-egg-hunt",
    status: "active",
  }];

  const html = renderImmersiveMarkup(IMMERSIVE_MARKUP, null, null, secondaryEvents);

  assert.match(html, /Ediții în prim-plan/);
  assert.match(html, />Activ</);
  assert.match(html, /25 RON/);
  assert.match(html, /Rezervă bilet/);
  assert.match(html, /href="\/easter-egg-hunt"/);
  assert.match(html, /Toate evenimentele/);
  assert.doesNotMatch(html, /Eveniment încheiat/);
});

test("homepage gives all three promoted slots a deliberate visual hierarchy", () => {
  const promotedEvents: LandingArchivedEvent[] = [1, 2, 3].map((slot) => ({
    title: `Ediția ${slot}`,
    subtitle: null,
    about: `Descrierea ediției ${slot}.`,
    dateLabel: `${slot} septembrie 2026`,
    venue: `Sala ${slot}`,
    priceBani: slot * 1000,
    photoUrl: `https://example.com/slot-${slot}.webp`,
    href: `/editia-${slot}`,
    status: "past",
  }));

  const html = renderImmersiveMarkup(IMMERSIVE_MARKUP, null, null, promotedEvents);

  assert.equal(html.match(/class="ev-past ev-past--managed/g)?.length, 3);
  assert.equal(html.match(/ev-past--lead/g)?.length, 1);
  assert.equal(html.match(/ev-past--support/g)?.length, 2);
  assert.match(html, /Trei ediții în prim-plan/);
  for (const event of promotedEvents) assert.match(html, new RegExp(event.title));
});

test("homepage hides the archive when only one active event should be promoted", () => {
  const html = renderImmersiveMarkup(IMMERSIVE_MARKUP, null, null);

  assert.doesNotMatch(html, /ev-arch-head/);
  assert.doesNotMatch(html, /class="ev-arch"/);
  assert.doesNotMatch(html, /Arhiva va apărea aici/);
});

test("board and public surfaces use the intended event sources", () => {
  const boardPage = readFileSync(new URL("../app/(dashboard)/board/evenimente/page.tsx", import.meta.url), "utf8");
  const archiveBoardPage = readFileSync(new URL("../app/(dashboard)/board/evenimente/arhiva/page.tsx", import.meta.url), "utf8");
  const compactEventCard = readFileSync(new URL("../app/(club)/evenimente/CompactEventCard.tsx", import.meta.url), "utf8");
  const publicPage = readFileSync(new URL("../app/(club)/evenimente/page.tsx", import.meta.url), "utf8");
  const homepage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const eventsSource = readFileSync(new URL("../lib/events.ts", import.meta.url), "utf8");
  const archiveAdapter = readFileSync(new URL("../lib/event-archive.ts", import.meta.url), "utf8");

  assert.match(boardPage, /getAllEventsForAdmin/);
  assert.match(boardPage, /featured_slot/);
  assert.match(boardPage, /isEventEnded/);
  assert.match(boardPage, /SlotAssignmentForm/);
  assert.match(boardPage, /EndEventDialog/);
  assert.doesNotMatch(boardPage, /activeCount >= 3|StatusControl|getActiveEvent/);

  assert.match(archiveBoardPage, /getAllEventsForAdmin/);
  assert.match(archiveBoardPage, /filter\(\(event\) => isEventEnded\(event\)\)/);
  assert.match(archiveBoardPage, /ArchivePlacementControl/);
  assert.doesNotMatch(archiveBoardPage, /getManagedArchiveEvents|ArchiveEventEditor/);

  assert.match(compactEventCard, /event\.internalTicketingUrl \|\| `\/evenimente\/\$\{event\.slug\}`/);
  assert.match(compactEventCard, /Rezervă bilet/);
  assert.match(compactEventCard, /Eveniment încheiat/);

  assert.match(publicPage, /getPublicEvents/);
  assert.match(publicPage, /getManagedPublishedEvents/);
  assert.match(publicPage, /const activeEvents = ticketingEvents/);
  assert.match(publicPage, /const inactiveEvents = \[/);
  assert.match(publicPage, /const events = \[\.\.\.activeEvents, \.\.\.inactiveEvents\]/);
  assert.match(publicPage, /<EventsExplorer events=\{events\}/);
  assert.match(publicPage, /historicalEvents\.filter/);

  assert.match(homepage, /getPublicEvents/);
  assert.match(homepage, /getFeaturedEvents/);
  assert.match(homepage, /const \[events, featuredEvents\] = await Promise\.all/);
  assert.match(homepage, /activeEvents = events\.filter\(\(event\) => !isEventEnded\(event, now\)\)/);
  assert.match(homepage, /featuredEvents\.map/);
  assert.match(homepage, /isEventEnded\(event, now\) \? "past" : "active"/);
  assert.doesNotMatch(homepage, /getActiveEvents|getManagedEventBySlug|GOLDEN_HOUR|getPastEvents/);

  assert.match(eventsSource, /sortPublicEvents/);
  assert.match(eventsSource, /getFeaturedEvents/);
  assert.match(eventsSource, /!isEventEnded\(event/);
  assert.match(eventsSource, /EVENTS_CACHE_SCOPE = new URL\(serverEnv\.NEXT_PUBLIC_SUPABASE_URL\)\.hostname/);
  assert.match(eventsSource, /\["public-events-lifecycle-v2", EVENTS_CACHE_SCOPE\]/);
  assert.match(eventsSource, /\["featured-events-v2", EVENTS_CACHE_SCOPE\]/);
  assert.match(eventsSource, /\["event-by-slug-public-lifecycle-v2", EVENTS_CACHE_SCOPE\]/);
  assert.doesNotMatch(eventsSource, /limit\(3\)|prioritizeActiveEvents/);
  assert.match(archiveAdapter, /isEventEnded\(event\)/);
  assert.doesNotMatch(archiveAdapter, /getFeaturedEvent|getFeaturedSlug|currentStatus/);
});
