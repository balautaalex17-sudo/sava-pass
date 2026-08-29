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
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText || "failed"}`));
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
    let filterScreenshot;
    if (mode === "capture" && viewport.name === "mobile" && await page.getByRole("button", { name: /Filtrează evenimentele/ }).count()) {
      const filterToggle = page.getByRole("button", { name: /Filtrează evenimentele/ });
      await filterToggle.scrollIntoViewIfNeeded();
      await filterToggle.click();
      filterScreenshot = path.join(screenshotRoot, `${label}-${viewport.name}-filters.png`);
      await page.screenshot({ path: filterScreenshot });
    }
    results.push({ viewport, foldScreenshot, filterScreenshot, screenshot, layout, consoleErrors, failedRequests, brokenImages });
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
  page.on("requestfailed", (request) => failedRequests.push(request.url()));
  try {
    await waitForPage(page);
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
    let reachedFilterToggle = false;
    for (let step = 0; step < 30; step += 1) {
      await page.keyboard.press("Tab");
      reachedFilterToggle = await page.evaluate(() => document.activeElement?.textContent?.includes("Filtrează evenimentele") || false);
      if (reachedFilterToggle) break;
    }
    if (!reachedFilterToggle) throw new Error("Butonul filtrelor nu poate fi atins prin navigare cu Tab.");
    await page.keyboard.press("Enter");
    await page.getByRole("combobox", { name: "Perioadă", exact: true }).selectOption("year:2025-2026");
    await page.waitForURL(/period=year%3A2025-2026/);
    await page.getByRole("combobox", { name: "Categorie", exact: true }).selectOption("club");
    await page.waitForURL(/category=club/);
    const search = page.getByRole("searchbox", { name: "Caută în evenimente" });
    await search.fill("Cupid");
    await page.waitForURL(/q=Cupid/);
    const countText = await page.locator("[aria-live='polite']").filter({ hasText: "eveniment" }).innerText();
    await page.reload({ waitUntil: "networkidle" });
    if (!page.url().includes("period=year%3A2025-2026") || !page.url().includes("category=club") || !page.url().includes("q=Cupid")) throw new Error("Parametrii filtrelor nu au persistat după reload.");
    const detailLink = page.getByRole("link", { name: "Vezi detaliile evenimentului Cupid's Hex" });
    await detailLink.focus();
    const focusVisible = await detailLink.evaluate((element) => element === document.activeElement);
    if (!focusVisible) throw new Error("Legătura de detaliu nu poate primi focus prin tastatură.");
    await detailLink.click();
    await page.waitForURL(/\/evenimente\/cupids-hex-2026$/);
    await page.getByRole("heading", { level: 1, name: "Cupid's Hex" }).waitFor({ state: "visible" });
    const sourceLinks = await page.getByRole("link", { name: /Postarea/ }).count();
    if (sourceLinks < 1) throw new Error("Pagina de detaliu nu afișează sursele Instagram.");
    const primaryEventImages = await page.locator("main header img").count();
    const relatedCards = await page.locator("main [data-event-card]").count();
    const relatedImages = await page.locator("main [data-event-card] img").count();
    if (primaryEventImages !== 1) throw new Error(`Evenimentul principal trebuie să afișeze exact o imagine, nu ${primaryEventImages}.`);
    if (relatedImages !== relatedCards) throw new Error(`Fiecare eveniment recomandat trebuie să aibă exact o imagine: ${relatedImages} imagini pentru ${relatedCards} carduri.`);
    if (criticalConsole.length) throw new Error(`Erori critice în consolă: ${criticalConsole.join("; ")}`);
    if (failedRequests.length) throw new Error(`Cereri eșuate în audit: ${failedRequests.join("; ")}`);
    results.push({ audit: { countText, keyboardReachedFilters: reachedFilterToggle, focusVisible, detailUrl: page.url(), sourceLinks, primaryEventImages, relatedCards, relatedImages, criticalConsole, failedRequests } });
  } finally {
    await context.close();
  }
}

await browser.close();
console.log(JSON.stringify({ targetUrl, label, mode, results }, null, 2));
