import pkg from "file:///C:/Users/cycla/Documents/Bussines/projects/sava-pass/web/node_modules/playwright-core/index.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const { chromium } = pkg;
const URL = process.argv[2] || "http://localhost:3000/";
const OUT = process.argv[3] || "active/review";
const VIEWPORTS = [
  [375, 812, "mobile-375"],
  [430, 932, "mobile-430"],
  [768, 1024, "tablet-768"],
  [1366, 768, "laptop-1366"],
  [1440, 900, "desktop-1440"],
  [1920, 1080, "desktop-1920"],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];

for (const [width, height, label] of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: width <= 430 ? 2 : 1,
    isMobile: width <= 430,
    hasTouch: width <= 768,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  await page.addInitScript(() => {
    window.__reviewCls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__reviewCls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
  });
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText ?? "failed"}`));
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await page.waitForTimeout(700);
  if (label === "mobile-375" || label === "desktop-1440") {
    await page.screenshot({ path: join(OUT, `${label}-top.png`) });
    for (const sectionId of ["hero", "event", "community", "stats", "join", "foot"]) {
      const section = page.locator(`#${sectionId}`);
      if (!(await section.count())) continue;
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(650);
      await page.screenshot({ path: join(OUT, `${label}-${sectionId}.png`) });
    }
  }
  await page.screenshot({ path: join(OUT, `${label}-full.png`), fullPage: true });

  const story = page.locator("#community");
  if (await story.count()) {
    await story.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await story.screenshot({ path: join(OUT, `${label}-story.png`) });
  }

  if (width <= 430) {
    const burger = page.locator(".hnav__burger");
    if (await burger.count()) {
      await burger.click();
      await page.screenshot({ path: join(OUT, `${label}-menu.png`) });
      await burger.click();
    }
  }

  const audit = await page.evaluate(() => {
    const root = document.documentElement;
    const overflow = [];
    document.querySelectorAll("main,section,article,nav,h1,h2,h3,p,a,button,input,select,textarea").forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && (rect.right > innerWidth + 2 || rect.left < -2)) {
        overflow.push(`${element.tagName.toLowerCase()}.${String(element.className || "").slice(0, 50)}`);
      }
    });
    const brokenImages = [...document.images].filter((image) => (image.currentSrc || image.getAttribute("src")) && image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src);
    const resources = performance.getEntriesByType("resource");
    const scripts = resources.filter((entry) => entry.initiatorType === "script");
    const images = resources.filter((entry) => entry.initiatorType === "img");
    const nav = document.querySelector(".hnav")?.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: root.scrollWidth,
      scrollHeight: root.scrollHeight,
      overflow: overflow.slice(0, 20),
      brokenImages,
      introPhoto: Boolean(document.querySelector(".intro-photo img")),
      heroPhoto: Boolean(document.querySelector(".hero-photo img")),
      storyCards: document.querySelectorAll(".photo-card").length,
      nav: nav ? { top: nav.top, right: nav.right, bottom: nav.bottom, left: nav.left } : null,
      cls: Number((window.__reviewCls || 0).toFixed(4)),
      scriptRequests: scripts.length,
      scriptTransferKb: Math.round(scripts.reduce((sum, entry) => sum + (entry.transferSize || 0), 0) / 1024),
      imageTransferKb: Math.round(images.reduce((sum, entry) => sum + (entry.transferSize || 0), 0) / 1024),
      syntheticVideos: document.querySelectorAll(".intro-video,.hero-video,.mhi-ambient").length,
      focusables: document.querySelectorAll("a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])").length,
    };
  });
  results.push({ label, ...audit, errors, failedRequests });
  await context.close();
}

const reducedContext = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
await reducedPage.waitForTimeout(400);
const reducedMotion = await reducedPage.evaluate(() => {
  const reveal = document.querySelector(".rv");
  const gear = document.querySelector(".gear");
  return {
    matches: matchMedia("(prefers-reduced-motion: reduce)").matches,
    revealOpacity: reveal ? getComputedStyle(reveal).opacity : null,
    revealTransform: reveal ? getComputedStyle(reveal).transform : null,
    gearAnimation: gear ? getComputedStyle(gear).animationName : null,
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
  };
});
await reducedPage.screenshot({ path: join(OUT, "mobile-375-reduced.png"), fullPage: true });
await reducedContext.close();

await browser.close();
writeFileSync(join(OUT, "responsive-results.json"), JSON.stringify({ url: URL, capturedAt: new Date().toISOString(), results, reducedMotion }, null, 2));
console.log(JSON.stringify({ results, reducedMotion }, null, 2));
