import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { IMMERSIVE_MARKUP } from "../app/_immersive/content";
import { renderImmersiveMarkup, type LandingShowcaseEvent } from "../app/_immersive/upgrade";

function showcaseEvent(
  title: string,
  status: LandingShowcaseEvent["status"],
  priceBani: number,
): LandingShowcaseEvent {
  const slug = title.toLowerCase().replaceAll(" ", "-");
  return {
    title,
    subtitle: `${title} subtitle`,
    about: `${title} description`,
    dateLabel: "2 septembrie 2026",
    venue: "Sala Test",
    priceBani,
    photoUrl: `https://example.com/${slug}.webp`,
    detailsHref: `/${slug}`,
    checkoutHref: `/${slug}/checkout`,
    status,
  };
}

function render(showcaseEvents: LandingShowcaseEvent[]) {
  return renderImmersiveMarkup(IMMERSIVE_MARKUP, { showcaseEvents });
}

function cardTitles(html: string) {
  return Array.from(html.matchAll(/<h4 class="ev-past-title">([^<]+)<\/h4>/g), (match) => match[1]);
}

function count(html: string, pattern: RegExp) {
  return html.match(pattern)?.length ?? 0;
}

test("three ended showcase events render without a separate hero or ticket information", () => {
  const html = render([
    showcaseEvent("Golden Hour", "ended", 3500),
    showcaseEvent("Echoes Unplugged", "ended", 0),
    showcaseEvent("HEX Party", "ended", 4200),
  ]);

  assert.equal(count(html, /class="ev-past ev-past--managed/g), 3);
  assert.equal(count(html, /class="ev-past-action">Vezi ediția/g), 3);
  assert.equal(count(html, />Eveniment încheiat<\/span>/g), 3);
  assert.deepEqual(cardTitles(html), ["Golden Hour", "Echoes Unplugged", "HEX Party"]);
  assert.match(html, /Seri care ne aduc împreună/);
  assert.match(html, /O selecție de evenimente SavaPass/);
  assert.match(html, />Toate edițiile </);
  assert.doesNotMatch(html, /class="ev-feat|class="ev-map/);
  assert.doesNotMatch(html, /class="ev-active-location"/);
  assert.doesNotMatch(html, /Evenimentul activ|Revenim curând|Calendar în pregătire|Calendarul se actualizează/);
  assert.doesNotMatch(html, /class="ev-past-price"|35 RON|42 RON|Acces gratuit|Rezervă bilet/);
});

test("one active event moves first and is the only card with reservation and price", () => {
  const html = render([
    showcaseEvent("Golden Hour", "ended", 3500),
    showcaseEvent("Echoes Unplugged", "active", 4500),
    showcaseEvent("HEX Party", "ended", 4200),
  ]);

  assert.deepEqual(cardTitles(html), ["Echoes Unplugged", "Golden Hour", "HEX Party"]);
  assert.equal(count(html, /class="ev-past ev-past--managed/g), 3);
  assert.equal(count(html, /class="ev-past-action">Rezervă bilet/g), 1);
  assert.equal(count(html, /class="ev-past-price"/g), 1);
  assert.match(html, /href="\/echoes-unplugged\/checkout"/);
  assert.match(html, />45 RON<\/span>/);
  assert.match(html, /class="ev-active-location" aria-label="Locație: Sala Test"/);
  assert.equal(count(html, /class="ev-active-location"/g), 1);
  assert.doesNotMatch(html, />35 RON<\/span>|>42 RON<\/span>|Acces gratuit/);
});

test("two active events stay in manual order before the ended event", () => {
  const html = render([
    showcaseEvent("Golden Hour", "active", 3500),
    showcaseEvent("Halloween", "ended", 2500),
    showcaseEvent("Echoes Unplugged", "active", 4500),
  ]);

  assert.deepEqual(cardTitles(html), ["Golden Hour", "Echoes Unplugged", "Halloween"]);
  assert.equal(count(html, /class="ev-past-action">Rezervă bilet/g), 2);
  assert.equal(count(html, /class="ev-past-price"/g), 2);
  assert.equal(count(html, /class="ev-active-location"/g), 2);
  assert.equal(count(html, /class="ev-past-action">Vezi ediția/g), 1);
  assert.doesNotMatch(html, />25 RON<\/span>/);
});

test("all three showcased events can be active without creating a fourth card", () => {
  const html = render([
    showcaseEvent("Event A", "active", 1000),
    showcaseEvent("Event B", "active", 2000),
    showcaseEvent("Event C", "active", 3000),
  ]);

  assert.deepEqual(cardTitles(html), ["Event A", "Event B", "Event C"]);
  assert.equal(count(html, /class="ev-past ev-past--managed/g), 3);
  assert.equal(count(html, /class="ev-past-action">Rezervă bilet/g), 3);
  assert.equal(count(html, /class="ev-past-price"/g), 3);
  assert.equal(count(html, /class="ev-active-location"/g), 3);
  assert.doesNotMatch(html, /Eveniment încheiat|class="ev-feat/);
});

test("the showcase renderer defensively caps invalid input at three cards", () => {
  const html = render([
    showcaseEvent("Event A", "ended", 1000),
    showcaseEvent("Event B", "active", 2000),
    showcaseEvent("Event C", "ended", 3000),
    showcaseEvent("Event D", "active", 4000),
  ]);

  assert.equal(count(html, /class="ev-past ev-past--managed/g), 3);
  assert.deepEqual(cardTitles(html), ["Event B", "Event D", "Event A"]);
  assert.doesNotMatch(html, /Event C/);
});

test("no dashboard selection produces no event section and no active-event placeholder", () => {
  const html = renderImmersiveMarkup(IMMERSIVE_MARKUP);

  assert.doesNotMatch(html, /id="event"|class="ev-feat|class="ev-map/);
  assert.doesNotMatch(html, /Revenim curând|Calendar în pregătire|Următorul eveniment este în pregătire/);
  assert.match(html, /Model SavaPass/);
  assert.match(html, /<h3>Bilet<br\/>digital<\/h3>/);
});

test("board and public surfaces use the intended event sources", () => {
  const boardPage = readFileSync(new URL("../app/(dashboard)/board/evenimente/page.tsx", import.meta.url), "utf8");
  const archiveBoardPage = readFileSync(new URL("../app/(dashboard)/board/evenimente/arhiva/page.tsx", import.meta.url), "utf8");
  const compactEventCard = readFileSync(new URL("../app/(club)/evenimente/CompactEventCard.tsx", import.meta.url), "utf8");
  const publicPage = readFileSync(new URL("../app/(club)/evenimente/page.tsx", import.meta.url), "utf8");
  const homepage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const homepageRenderer = readFileSync(new URL("../app/_immersive/upgrade.ts", import.meta.url), "utf8");
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

  assert.match(homepage, /getFeaturedEvents/);
  assert.match(homepage, /featuredEvents\.map/);
  assert.match(homepage, /isEventEnded\(event, now\) \? "ended" : "active"/);
  assert.doesNotMatch(homepage, /getPublicEvents|getActiveEvent|getActiveEvents|getPastEvents|activeEvents/);

  assert.match(homepageRenderer, /prepareShowcaseEvents/);
  assert.match(homepageRenderer, /firstIsActive !== secondIsActive/);
  assert.match(homepageRenderer, /slice\(0, MAX_SHOWCASE_EVENTS\)/);
  assert.doesNotMatch(homepageRenderer, /renderFeaturedEvent|applyEventContent|ev-feat--empty|Calendar în pregătire/);

  assert.match(eventsSource, /sortPublicEvents/);
  assert.match(eventsSource, /getFeaturedEvents/);
  assert.match(eventsSource, /\.not\("featured_slot", "is", null\)/);
  assert.match(eventsSource, /\.order\("featured_slot", \{ ascending: true \}\)/);
  assert.match(eventsSource, /EVENTS_CACHE_SCOPE = new URL\(serverEnv\.NEXT_PUBLIC_SUPABASE_URL\)\.hostname/);
  assert.match(eventsSource, /\["featured-events-v2", EVENTS_CACHE_SCOPE\]/);
  assert.doesNotMatch(eventsSource, /limit\(3\)|prioritizeActiveEvents/);
  assert.match(archiveAdapter, /isEventEnded\(event\)/);
  assert.doesNotMatch(archiveAdapter, /getFeaturedEvent|getFeaturedSlug|currentStatus/);
});
