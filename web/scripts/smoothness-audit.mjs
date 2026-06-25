// Token-light smoothness loop for the immersive homepage. Self-contained: no
// external service, no browser download, one cheap command per iteration.
//
// It boots the homepage in a mobile (390) and desktop (1280) context via system
// Edge, drives a Lenis scroll through the whole page while sampling rAF frame
// deltas, and measures the three things the experience can get wrong:
//   - scroll STUTTER  : long frames + main-thread blocking while scrolling
//   - input DELAY      : how long after a scroll input the page actually moves
//   - load STUTTER     : layout shift (CLS) + LCP
// It then attributes the worst scroll jank to a region of the page, gates on
// regression, prints the single WORST OFFENDER + a rubric anchor, and writes a
// diffable checkpoint to active/smoothness/.
//
// Run from web/ with a server up (a PRODUCTION build for real numbers — dev/Turbopack
// is fine only to smoke that the script runs):
//   node scripts/smoothness-audit.mjs [url]
//
// The printed "WORST OFFENDER" line tells you what to fix next, so no per-iteration
// profiling is needed. See docs/smoothness-loop.md for the metric -> cause -> fix
// rubric and the one-fix-per-turn protocol.

import pkg from "file:///C:/Users/cycla/Documents/Bussines/projects/sava-pass/web/node_modules/playwright-core/index.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const { chromium } = pkg;

const URL = process.argv[2] || "http://localhost:3000/";
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "active", "smoothness");

// Targets (the "smooth" number) and ceilings (the regression gate, generous above a
// captured baseline so this fires only on a real regression — same posture as
// perf-measure.mjs). Re-tune `ceil` after capturing your first baseline; see runbook.
// LCP is advisory here because perf-measure.mjs already owns the LCP regression gate.
const GATE = {
  // frames slower than 50ms (a visible hitch) during the full-page scroll
  longFrames50: { target: 0, ceil: 6, anchor: "scroll-stutter" },
  // 90th-percentile frame delta in ms (16.7ms = 60fps, 33ms = 30fps)
  p90: { target: 22, ceil: 42, anchor: "scroll-stutter" },
  // total blocking time from long tasks during the scroll window, in ms
  tbtScroll: { target: 120, ceil: 500, anchor: "main-thread-blocking" },
  // cumulative layout shift accumulated through load + scroll
  cls: { target: 0, ceil: 0.1, anchor: "load-stutter" },
};
const ADVISORY = ["median", "max", "longFrames32", "lcp", "scrollDelay"];

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function measure(ctxOpts, label) {
  const ctx = await browser.newContext({ ...ctxOpts, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  // observers buffered from load (same performance.now() clock as the scroll loop)
  await page.addInitScript(() => {
    window.__lt = []; window.__cls = 0; window.__lcp = 0;
    const obs = (type, cb) => { try { new PerformanceObserver(cb).observe({ type, buffered: true }); } catch {} };
    obs("longtask", (l) => { for (const e of l.getEntries()) window.__lt.push({ s: e.startTime, d: e.duration }); });
    obs("layout-shift", (l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; });
    obs("largest-contentful-paint", (l) => { for (const e of l.getEntries()) window.__lcp = Math.round(e.startTime); });
  });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // sample rAF frame deltas (absolute t + scroll position per frame) while driving a
  // Lenis scroll through the whole page. Plain window.scrollTo does NOT move Lenis, so
  // we drive __lenis.scrollTo when present (documented lesson).
  const raw = await page.evaluate(async () => {
    const frames = []; // {t, dt, y}
    let last = performance.now();
    let running = true;
    const posY = () => (window.__lenis ? window.__lenis.scroll : window.scrollY);
    const sampler = (t) => { frames.push({ t, dt: t - last, y: posY() }); last = t; if (running) requestAnimationFrame(sampler); };
    requestAnimationFrame(sampler);

    const startY = posY();
    const H = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const firstCmd = performance.now();
    if (window.__lenis) window.__lenis.scrollTo(Math.round(H / 24), {}); else window.scrollTo(0, Math.round(H / 24));

    const STEPS = 24;
    for (let i = 2; i <= STEPS; i++) {
      const y = Math.round((H * i) / STEPS);
      if (window.__lenis) window.__lenis.scrollTo(y, {}); else window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    await new Promise((r) => setTimeout(r, 200));
    running = false;
    return { frames: frames.slice(3), H, startY, firstCmd, scrollStart: firstCmd, scrollEnd: performance.now() };
  });

  const obs = await page.evaluate(() => ({ lt: window.__lt || [], cls: +(window.__cls || 0).toFixed(4), lcp: window.__lcp || 0 }));

  // --- frame metrics ---
  const deltas = raw.frames.map((f) => f.dt).filter((d) => d >= 0).sort((a, b) => a - b);
  const at = (p) => deltas.length ? Math.round(deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * p))]) : 0;
  const median = at(0.5), p90 = at(0.9), max = deltas.length ? Math.round(deltas[deltas.length - 1]) : 0;
  const longFrames32 = deltas.filter((d) => d > 32).length;
  const longFrames50 = deltas.filter((d) => d > 50).length;
  const tbtScroll = Math.round(
    obs.lt.filter((e) => e.s >= raw.scrollStart && e.s <= raw.scrollEnd).reduce((a, e) => a + Math.max(0, e.d - 50), 0)
  );

  // --- input delay: ms from the first scroll command to the first frame that moved ---
  const moved = raw.frames.find((f) => f.t >= raw.firstCmd && f.y > raw.startY + 2);
  const scrollDelay = moved ? Math.round(moved.t - raw.firstCmd) : -1;

  // --- worst region: bucket hitches by scroll position, then name what sits there ---
  const BUCKETS = 10;
  const band = new Array(BUCKETS).fill(0);
  for (const f of raw.frames) {
    if (f.dt <= 32) continue;
    const b = Math.min(BUCKETS - 1, Math.max(0, Math.floor((f.y / raw.H) * BUCKETS)));
    band[b] += f.dt > 50 ? 2 : 1; // weight visible hitches double
  }
  let worstBand = 0;
  for (let i = 1; i < BUCKETS; i++) if (band[i] > band[worstBand]) worstBand = i;
  const yCenter = Math.round(raw.H * ((worstBand + 0.5) / BUCKETS));

  let region = "(none)";
  if (band[worstBand] > 0 && raw.H > 0) {
    await page.evaluate((y) => { if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); }, yCenter);
    await page.waitForTimeout(350);
    region = await page.evaluate(() => {
      const el = document.elementFromPoint(Math.round(innerWidth / 2), Math.round(innerHeight / 2));
      const names = []; let n = el;
      while (n && n !== document.body && names.length < 4) {
        const id = n.id ? "#" + n.id : "";
        const cls = (n.className && n.className.toString) ? n.className.toString().trim().split(/\s+/)[0] : "";
        if (id || cls) names.push(id || "." + cls);
        n = n.parentElement;
      }
      return names.join(" < ") || "(body)";
    });
  }

  await ctx.close();
  return {
    label, median, p90, max, longFrames32, longFrames50, tbtScroll,
    cls: obs.cls, lcp: obs.lcp, scrollDelay,
    region, regionPct: Math.round(((worstBand + 0.5) / BUCKETS) * 100),
    errors: errors.length, errorSample: errors[0]?.slice(0, 80) || "",
  };
}

const contexts = [
  await measure({ viewport: { width: 1280, height: 832 }, deviceScaleFactor: 1 }, "desktop 1280"),
  await measure({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, "mobile 390"),
];

await browser.close();

// --- report ---
console.log("=== SMOOTHNESS AUDIT ===");
console.log("URL :", URL, "\n");

let failed = false;
let worst = null; // {ctx, metric, over, anchor}
for (const c of contexts) {
  console.log(`--- ${c.label} ---`);
  console.log(`  scroll   median ${c.median}ms   p90 ${c.p90}ms   max ${c.max}ms   hitches >32ms ${c.longFrames32}  >50ms ${c.longFrames50}`);
  console.log(`  blocking longtask TBT (scroll) ${c.tbtScroll}ms`);
  console.log(`  delay    scroll-response ${c.scrollDelay}ms`);
  console.log(`  load     CLS ${c.cls}   LCP ${c.lcp}ms`);
  console.log(`  region   worst jank ~${c.regionPct}% down  ${c.region}`);
  if (c.errors) console.log(`  console errors: ${c.errors}  (${c.errorSample})`);

  for (const [metric, g] of Object.entries(GATE)) {
    const v = c[metric];
    const over = v / (g.target || g.ceil || 1);
    if (!worst || over > worst.over) worst = { ctx: c.label, metric, value: v, over, anchor: g.anchor, region: c.region };
    if (v > g.ceil) { console.log(`  FAIL  ${metric} ${v} exceeds ceiling ${g.ceil}`); failed = true; }
  }
  console.log("");
}

if (worst) {
  console.log(`WORST OFFENDER: ${worst.ctx} — ${worst.metric}=${worst.value} (${worst.over.toFixed(1)}x target) at ${worst.region}`);
  console.log(`                -> see docs/smoothness-loop.md#${worst.anchor}`);
}
console.log(`VERDICT: ${failed ? "JANK (regression)" : "SMOOTH"}`);

// --- checkpoint (gitignored active/, diffable across runs) ---
try {
  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(join(OUT_DIR, `${stamp}.json`), JSON.stringify({ ts: stamp, url: URL, verdict: failed ? "jank" : "smooth", worst, contexts }, null, 2));
  console.log(`\ncheckpoint: active/smoothness/${stamp}.json`);
} catch (e) {
  console.log("\ncheckpoint write failed:", String(e));
}

process.exit(failed ? 1 : 0);
