import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

function argsFrom(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) continue;
    const [key, inline] = argv[index].slice(2).split("=");
    args[key] = inline ?? argv[index + 1];
    if (inline === undefined) index += 1;
  }
  return args;
}

const args = argsFrom(process.argv.slice(2));
const targetUrl = args.url || process.env.TARGET_URL || "http://127.0.0.1:3000/evenimente";
const label = args.label || "verification";
const mode = args.mode || "capture";
const screenshotRoot = path.resolve(args.output || path.resolve("..", "docs", "screenshots", "evenimente"));
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const captureViewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];
const auditViewports = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "landscape-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
];
const viewports = mode === "audit" ? auditViewports : captureViewports;

function isCancelledNextPrefetch(request) {
  return request.failure()?.errorText?.includes("ERR_ABORTED") && request.url().includes("_rsc=");
}

await fs.mkdir(screenshotRoot, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const results = [];

async function waitForPage(page) {
  await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 45_000 });
  await page.locator("h1").first().waitFor({ state: "visible" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const step = Math.max(500, window.innerHeight * .8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    window.scrollTo(0, 0);
  });
}

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, reducedMotion: viewport.name === "mobile-360" ? "reduce" : "no-preference", locale: "ro-RO" });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const brokenImages = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (!isCancelledNextPrefetch(request)) {
      failedRequests.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText || "failed"}`);
    }
  });
  page.on("response", (response) => {
    if (response.request().resourceType() === "image" && response.status() >= 400) brokenImages.push(`${response.status()} ${response.url()}`);
  });
  try {
    await waitForPage(page);
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      heading: document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim(),
      eventCards: document.querySelectorAll("[data-event-card]").length,
      duplicateCovers: (() => {
        const covers = [...document.querySelectorAll("[data-event-card]")]
          .map((card) => card.getAttribute("data-cover-src"))
          .filter((src) => src && src !== "typographic-fallback");
        return [...new Set(covers.filter((src, index) => covers.indexOf(src) !== index))];
      })(),
    }));
    if (layout.scrollWidth > layout.clientWidth + 1) throw new Error(`overflow orizontal: ${layout.scrollWidth}px > ${layout.clientWidth}px`);
    if (layout.duplicateCovers.length) throw new Error(`imagini de copertă reutilizate în arhivă: ${layout.duplicateCovers.join(", ")}`);
    if (brokenImages.length) throw new Error(`imagini cu răspuns invalid: ${brokenImages.join("; ")}`);
    if (consoleErrors.length) throw new Error(`erori în consolă: ${consoleErrors.join("; ")}`);
    if (failedRequests.length) throw new Error(`cereri eșuate: ${failedRequests.join("; ")}`);
    const foldScreenshot = path.join(screenshotRoot, `${label}-${viewport.name}-fold.png`);
    const screenshot = path.join(screenshotRoot, `${label}-${viewport.name}.png`);
    await page.screenshot({ path: foldScreenshot });
    await page.screenshot({ path: screenshot, fullPage: true });
    results.push({ viewport, foldScreenshot, screenshot, layout, consoleErrors, failedRequests, brokenImages });
  } finally {
    await context.close();
  }
}

if (mode === "audit") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ro-RO" });
  const page = await context.newPage();
  const criticalConsole = [];
  const failedRequests = [];
  page.on("console", (message) => { if (message.type() === "error") criticalConsole.push(message.text()); });
  page.on("requestfailed", (request) => {
    if (!isCancelledNextPrefetch(request)) failedRequests.push(request.url());
  });
  try {
    await waitForPage(page);
    await page.getByRole("heading", { level: 1, name: "Evenimente cu scop. Experiențe care rămân.", exact: true }).waitFor({ state: "visible" });
    const eventsSection = page.locator("#toate-evenimentele");
    await eventsSection.getByRole("heading", { level: 2, name: "Toate evenimentele", exact: true }).waitFor({ state: "visible" });

    const eventCards = eventsSection.locator("[data-event-card]");
    const visibleEventCards = await eventCards.count();
    const activeTitles = await eventCards.evaluateAll((cards) => cards
      .filter((card) => [...card.querySelectorAll("span")].some((span) => span.textContent?.trim() === "Activ"))
      .map((card) => card.querySelector("h3")?.textContent?.trim() || "")
      .filter(Boolean));
    const activeCards = activeTitles.length;
    const activeLabels = await eventsSection.getByText("Activ", { exact: true }).count();
    const pastLabels = await eventsSection.getByText("Încheiat", { exact: true }).count();
    if (activeCards !== 3) throw new Error(`Trebuie afișate exact 3 evenimente active, nu ${activeCards}.`);
    if (activeLabels !== activeCards) throw new Error(`Eticheta Activ lipsește: ${activeLabels} etichete pentru ${activeCards} carduri.`);
    if (pastLabels < 1) throw new Error("Evenimentele inactive nu apar în pagina Evenimente.");
    if (visibleEventCards <= activeCards) throw new Error("Pagina afișează doar evenimentele active.");

    const reserveLinks = eventsSection.getByRole("link", { name: /Rezervă bilet pentru/ });
    const reserveLinkCount = await reserveLinks.count();
    const reserveHrefs = await reserveLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href") || ""));
    if (reserveLinkCount !== activeCards) throw new Error(`Lipsesc acțiuni „Rezervă bilet”: ${reserveLinkCount} pentru ${activeCards} evenimente active.`);
    if (reserveHrefs.some((href) => href.startsWith("/evenimente/"))) throw new Error("Un eveniment activ deschide încă fluxul nou în locul celui vechi.");

    const filters = await page.locator("#event-filter-controls select").count();
    const searchboxes = await page.getByRole("searchbox").count();
    if (filters !== 2 || searchboxes !== 1) throw new Error(`Layoutul vechi de filtre lipsește: ${filters} selectoare și ${searchboxes} căutări.`);

    const featuredCard = page.locator('header a[aria-label^="Vezi evenimentul "]');
    if (await featuredCard.count() !== 1) throw new Error("Cardul principal din hero lipsește.");
    const featuredTitle = (await featuredCard.getAttribute("aria-label"))?.replace("Vezi evenimentul ", "") || "";
    if (!activeTitles.includes(featuredTitle)) throw new Error(`Hero-ul afișează un eveniment care nu este activ: ${featuredTitle}.`);

    const eventNavAboutHref = await page.locator("nav a").filter({ hasText: /^Despre$/ }).first().getAttribute("href");
    if (eventNavAboutHref !== "/") throw new Error(`Legătura Despre duce la ${eventNavAboutHref || "nicăieri"}.`);

    let focusVisible = true;
    const firstDetailLink = page.getByRole("link", { name: /Rezervă bilet pentru|Vezi detaliile evenimentului/ }).first();
    if (await firstDetailLink.count()) {
      await firstDetailLink.focus();
      focusVisible = await firstDetailLink.evaluate((element) => element === document.activeElement);
      if (!focusVisible) throw new Error("Legătura de detaliu nu poate primi focus prin tastatură.");
    }

    const homepageUrl = new URL("/", targetUrl).toString();
    await page.goto(homepageUrl, { waitUntil: "networkidle", timeout: 45_000 });
    await page.locator("#event").waitFor({ state: "visible" });
    const homepageFeaturedEvents = await page.locator("#event .ev-feat").count();
    const homepageSecondaryCards = await page.locator("#event .ev-arch .ev-past").count();
    const homepageSecondaryActiveLabels = await page.locator("#event .ev-arch .ev-sold--active").count();
    const homepageSecondaryReserveLabels = await page.locator("#event .ev-arch .ev-sold--active").filter({ hasText: /Rezervă bilet/ }).count();
    const homepageSecondaryTitles = (await page.locator("#event .ev-arch .ev-past-title").allTextContents()).map((title) => title.trim());
    const homepagePastLabels = await page.locator("#event .ev-arch .ev-sold").filter({ hasText: /Ediție încheiată/ }).count();
    const homepageActiveLabels = await page.locator("#event .pbadge").getByText("Activ", { exact: true }).count();
    const homepageEventTitle = (await page.locator("#event .ev-title").innerText()).trim();
    if (homepageFeaturedEvents !== 1) throw new Error(`Homepage trebuie să aibă exact un eveniment principal, nu ${homepageFeaturedEvents}.`);
    if (homepageSecondaryCards !== 2) throw new Error(`Homepage trebuie să aibă celelalte 2 evenimente active, nu ${homepageSecondaryCards}.`);
    if (homepageSecondaryActiveLabels !== 2 || homepagePastLabels !== 0) throw new Error("Evenimentele secundare de pe homepage nu sunt marcate corect ca active.");
    if (homepageSecondaryReserveLabels !== 2) throw new Error("Evenimentele secundare active nu afișează „Rezervă bilet”.");
    if (!homepageSecondaryTitles.every((title) => activeTitles.includes(title))) throw new Error("Homepage afișează un eveniment secundar care nu este activ.");
    if (activeCards > 0 && homepageActiveLabels !== 1) throw new Error("Homepage nu marchează evenimentul principal ca Activ.");
    if (activeCards > 0 && !activeTitles.includes(homepageEventTitle)) throw new Error(`Homepage afișează un eveniment care nu este activ: ${homepageEventTitle}.`);

    const aboutNavHref = await page.locator("nav a").filter({ hasText: /^Despre$/ }).first().getAttribute("href");
    if (aboutNavHref !== "/") throw new Error(`Legătura Despre de pe homepage duce la ${aboutNavHref || "nicăieri"}.`);

    if (criticalConsole.length) throw new Error(`Erori critice în consolă: ${criticalConsole.join("; ")}`);
    if (failedRequests.length) throw new Error(`Cereri eșuate în audit: ${failedRequests.join("; ")}`);
    results.push({ audit: { visibleEventCards, activeCards, activeLabels, pastLabels, reserveLinkCount, reserveHrefs, filters, searchboxes, featuredTitle, eventNavAboutHref, focusVisible, homepageFeaturedEvents, homepageSecondaryCards, homepageSecondaryActiveLabels, homepageSecondaryReserveLabels, homepageSecondaryTitles, homepagePastLabels, homepageActiveLabels, homepageEventTitle, aboutNavHref, criticalConsole, failedRequests } });
  } finally {
    await context.close();
  }
}

await browser.close();
console.log(JSON.stringify({ targetUrl, label, mode, results }, null, 2));
