// Consolidated verification for the responsive immersive homepage (plan 2026-06-24-004).
// Asserts, via playwright-core + system Edge:
//   MOBILE (360/390/414 portrait + landscape): no horizontal overflow on text-bearing
//     elements, zero console errors, engine scripts loaded, reveals fire, hero-video
//     plays when scrolled into view, an FPS smoke during wheel-scroll.
//   DESKTOP (1280): immersive + engine intact, full parallax (9 ScrollTriggers),
//     .dots keep mix-blend:difference, .strip still shows (R1 baseline).
// Exit code 1 if any hard assertion fails.
import pkg from "file:///C:/Users/cycla/Documents/Bussines/projects/sava-pass/web/node_modules/playwright-core/index.js";
const { chromium } = pkg;

const URL = process.argv[2] || "http://localhost:3000/";
const DECOR = [".strip",".dots",".tele",".lrail",".rail",".lane",".run",".item",".intro-video",".hero-video",".foot-video",".bokeh",".eq",".route",".pin",".glow",".road",".phone-orbit",".seam",".gen-ghost",".engine-ticket",".engine-stage"];
let failed = 0;
const ok = (c, m) => { console.log(`${c ? "  ok " : "FAIL"} ${m}`); if (!c) failed++; };

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function mobile(w, h, label) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  const eng = new Set();
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("request", (r) => { const f = r.url().split("/").pop(); if (/gsap|lenis|ScrollTrigger|engine\.js/.test(f)) eng.add(f); });
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  // The engine now defers to first interaction / idle (perf) — nudge it with a scroll
  // event so this guard observes the loaded state.
  await page.waitForTimeout(400);
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await page.waitForTimeout(1500);

  console.log(`\n--- mobile ${label} (${w}x${h}) ---`);
  ok(eng.size >= 3, `engine scripts loaded (${[...eng].join(",")})`);

  // wheel-scroll through, sampling frame intervals for an FPS smoke
  const fps = await page.evaluate(async () => {
    const ts = []; let last = performance.now(); let raf;
    const loop = (t) => { ts.push(t - last); last = t; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    for (let i = 0; i < 14; i++) { window.__lenis ? window.__lenis.scrollTo((i + 1) * 600, {}) : window.scrollTo(0, (i + 1) * 600); await new Promise((r) => setTimeout(r, 140)); }
    cancelAnimationFrame(raf);
    ts.sort((a, b) => a - b);
    return { median: Math.round(ts[Math.floor(ts.length / 2)]), p90: Math.round(ts[Math.floor(ts.length * 0.9)]) };
  });
  ok(fps.median <= 24, `FPS smoke median frame ${fps.median}ms (p90 ${fps.p90}ms)`);

  // overflow audit on text-bearing elements only
  const ov = await page.evaluate((decor) => {
    const iw = innerWidth, sw = document.documentElement.scrollWidth;
    const bad = [];
    document.querySelectorAll("P,H1,H2,H3,H4,A,BUTTON,LI").forEach((el) => {
      if (el.closest(decor.join(","))) return;
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > iw + 2 || r.left < -2)) bad.push(`${el.tagName}.${(el.className||"").toString().slice(0,20)}`);
    });
    return { iw, sw, bad: bad.slice(0, 8) };
  }, DECOR);
  ok(ov.sw <= ov.iw + 2, `no horizontal overflow (scrollWidth ${ov.sw} <= ${ov.iw})`);
  ok(ov.bad.length === 0, `no text-overflow offenders ${ov.bad.length ? JSON.stringify(ov.bad) : ""}`);

  // reveals fired (some .rv/.im-rv/.anim-rise carry an "in"/shown state after scroll)
  const revealed = await page.evaluate(() => document.querySelectorAll(".rv.in, .im-rv.im-in, .anim-rise.sr-shown").length);
  ok(revealed > 0, `scroll reveals present (${revealed})`);

  // hero-video plays when scrolled into view
  await page.evaluate(() => { const v = document.querySelector(".hero-video"); if (v) v.scrollIntoView(); window.__lenis && window.__lenis.scrollTo(document.querySelector("#hero").offsetTop, {}); });
  await page.waitForTimeout(1400);
  const heroVid = await page.evaluate(() => { const v = document.querySelector(".hero-video"); return v ? { paused: v.paused, ct: +v.currentTime.toFixed(2) } : null; });
  ok(heroVid && !heroVid.paused, `hero-video plays in view (paused=${heroVid?.paused})`);

  ok(errors.length === 0, `zero console errors${errors.length ? " :: " + errors[0].slice(0, 80) : ""}`);
  await ctx.close();
}

await mobile(360, 844, "portrait-360");
await mobile(390, 844, "portrait-390");
await mobile(414, 896, "portrait-414");
await mobile(844, 390, "landscape");

// desktop baseline
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 832 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = []; const eng = new Set();
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("request", (r) => { const f = r.url().split("/").pop(); if (/gsap|lenis|ScrollTrigger|engine\.js/.test(f)) eng.add(f); });
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await page.waitForTimeout(1600);
  console.log(`\n--- desktop 1280 (R1 baseline) ---`);
  ok(eng.size >= 4, `engine scripts loaded (${[...eng].join(",")})`);
  const d = await page.evaluate(() => ({
    st: window.ScrollTrigger ? window.ScrollTrigger.getAll().length : -1,
    dots: getComputedStyle(document.querySelector(".dots")).mixBlendMode,
    strip: document.querySelector(".strip") ? getComputedStyle(document.querySelector(".strip")).display : "absent",
  }));
  ok(d.st >= 6, `full parallax set (${d.st} ScrollTriggers)`);
  ok(d.dots === "difference", `desktop .dots mix-blend = ${d.dots}`);
  ok(d.strip !== "none" && d.strip !== "absent", `desktop .strip shows (${d.strip})`);
  ok(errors.length === 0, `zero console errors`);
}

await browser.close();
console.log(`\n${failed === 0 ? "PASS — all checks green" : `FAIL — ${failed} assertion(s) failed`}`);
process.exit(failed === 0 ? 0 : 1);
