// Repeatable homepage performance capture. Run from web/ with the dev or prod
// server up:  node scripts/perf-measure.mjs [url]
// Reports: initial transfer (no scroll), full transfer (after scroll), top assets,
// per-type breakdown, LCP. Used to set the U1 baseline and verify U6.
import pkg from "file:///C:/Users/cycla/.claude/skills/playwright-skill/node_modules/playwright/index.js";
const { chromium, devices } = pkg;

const URL = process.argv[2] || "http://localhost:3000/";
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  userAgent: devices["iPhone 13"].userAgent,
});
const page = await ctx.newPage();

const assets = new Map(); // url -> {bytes, type}
page.on("requestfinished", async (req) => {
  try {
    const sz = await req.sizes();
    const resp = await req.response();
    const type = req.resourceType();
    const bytes = (sz.responseBodySize || 0) + (sz.responseHeadersSize || 0);
    assets.set(req.url(), { bytes, type, status: resp ? resp.status() : 0 });
  } catch {}
});

await page.addInitScript(() => {
  window.__lcp = 0;
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = Math.round(e.startTime); })
      .observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
});

const t0 = Date.now();
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const initialBytes = [...assets.values()].reduce((a, b) => a + b.bytes, 0);
const initialCount = assets.size;

// scroll to bottom to trigger lazy media
await page.evaluate(async () => {
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 250));
  }
});
await page.waitForTimeout(2000);

const all = [...assets.entries()].map(([url, v]) => ({ url, ...v }));
const totalBytes = all.reduce((a, b) => a + b.bytes, 0);
const byType = {};
for (const a of all) byType[a.type] = (byType[a.type] || 0) + a.bytes;
const top = all.sort((a, b) => b.bytes - a.bytes).slice(0, 14);
const lcp = await page.evaluate(() => window.__lcp || 0);
const mb = (n) => (n / 1048576).toFixed(2) + " MB";

console.log("URL                :", URL);
console.log("Load (networkidle) :", ((Date.now() - t0) / 1000).toFixed(1) + "s");
console.log("LCP                :", lcp + "ms");
console.log("Initial transfer   :", mb(initialBytes), `(${initialCount} requests, before scroll)`);
console.log("Full transfer      :", mb(totalBytes), `(${all.length} requests, after full scroll)`);
console.log("By type            :", Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, mb(v)])));
console.log("Top assets:");
for (const a of top) console.log("  " + mb(a.bytes).padStart(9), a.type.padEnd(8), a.url.replace(/^https?:\/\/[^/]+/, ""));

await ctx.close();
await browser.close();
