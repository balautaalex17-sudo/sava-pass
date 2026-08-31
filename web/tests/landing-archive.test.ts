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
  assert.match(html, /Ediție încheiată · 55 RON/);
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

test("board event tabs use the same homepage and public-page limits", () => {
  const boardPage = readFileSync(new URL("../app/(dashboard)/board/evenimente/page.tsx", import.meta.url), "utf8");

  assert.match(boardPage, /const HOMEPAGE_ARCHIVE_LIMIT = 2/);
  assert.match(boardPage, /homepageArchivedEvents = homepagePastEvents\.slice\(0, HOMEPAGE_ARCHIVE_LIMIT\)/);
  assert.match(boardPage, /publicTicketingEvents = events\.filter\(\(event\) => event\.status !== "draft"\)/);
  assert.match(boardPage, /publicEventsPageCount = publicTicketingEvents\.length \+ publicImportedCount/);
  assert.match(boardPage, /view=homepage/);
  assert.match(boardPage, /view=events/);
});
