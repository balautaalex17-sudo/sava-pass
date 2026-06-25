// PageSpeed Insights goal-gate for the deployed homepage (mobile).
//
// This is the AUTHORITATIVE goal for the all-green loop: it asks the real PageSpeed
// Insights API (the same engine pagespeed.web.dev uses) for the deployed site, mobile
// strategy, and reports whether all five core metrics are green (each metric audit
// scored >= 0.9, which is the green pill on the site).
//
// Run from web/ (no build, no browser — pure HTTP against the deployed URL):
//   node scripts/psi-gate.mjs [url]
//   PSI_API_KEY=... node scripts/psi-gate.mjs   # optional, dodges anon rate limits
//
// Exit 0 = GOAL MET (all five green). Exit 1 = not yet. The loop deploys, then runs
// this; see docs/pagespeed-loop.md. Local iteration uses scripts/lh-mobile.mjs instead.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const URL = process.argv[2] || "https://sava-pass.vercel.app/";
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "active", "psi");

// metric key -> Lighthouse audit id. "green" = audit.score >= 0.9 (the green pill).
const METRICS = {
  FCP: "first-contentful-paint",
  LCP: "largest-contentful-paint",
  SI: "speed-index",
  TBT: "total-blocking-time",
  CLS: "cumulative-layout-shift",
};
const GREEN = 0.9;

const api = new globalThis.URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
api.searchParams.set("url", URL);
api.searchParams.set("strategy", "mobile");
api.searchParams.set("category", "performance");
if (process.env.PSI_API_KEY) api.searchParams.set("key", process.env.PSI_API_KEY);

// Set process.exitCode and let the process drain naturally. Calling process.exit()
// while undici's keep-alive socket is still closing crashes libuv on Windows
// (Assertion failed ... async.c) and returns 127, which would make the loop's
// exit-code gate unreliable.
async function main() {
  console.log("=== PAGESPEED GOAL GATE (mobile) ===");
  console.log("URL :", URL);
  console.log("(querying the live PageSpeed Insights API — this takes ~20-40s)\n");

  let resp;
  try {
    resp = await fetch(api, { headers: { accept: "application/json" } });
  } catch (e) {
    console.error("FAIL  network error reaching PageSpeed API:", String(e));
    return 2;
  }
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    console.error(`FAIL  PageSpeed API returned ${resp.status} ${resp.statusText}`);
    if (resp.status === 429) console.error("      rate-limited — set PSI_API_KEY (free) and retry.");
    if (body) console.error("      " + body.slice(0, 200));
    return 2;
  }
  const json = await resp.json();

  const lh = json.lighthouseResult;
  if (!lh || !lh.audits) {
    console.error("FAIL  unexpected PageSpeed response (no lighthouseResult.audits)");
    return 2;
  }

  const rows = {};
  let allGreen = true;
  for (const [label, auditId] of Object.entries(METRICS)) {
    const a = lh.audits[auditId] || {};
    const score = typeof a.score === "number" ? a.score : null;
    const green = score !== null && score >= GREEN;
    if (!green) allGreen = false;
    rows[label] = { score, green, display: a.displayValue || "?" };
  }
  const perf = lh.categories?.performance?.score ?? null;

  for (const [label, r] of Object.entries(rows)) {
    const mark = r.green ? "green" : "RED ";
    const sc = r.score === null ? "  ?" : Math.round(r.score * 100).toString().padStart(3);
    console.log(`  ${mark}  ${label.padEnd(4)} ${String(r.display).padStart(8)}   score ${sc}/100`);
  }
  console.log(`\n  performance score: ${perf === null ? "?" : Math.round(perf * 100)}/100`);
  console.log(`GOAL: ${allGreen ? "MET — all five metrics green" : "NOT MET — " + Object.entries(rows).filter(([, r]) => !r.green).map(([l]) => l).join(", ") + " still red/orange"}`);

  try {
    mkdirSync(OUT_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(join(OUT_DIR, `${stamp}.json`), JSON.stringify({ ts: stamp, url: URL, allGreen, perf, metrics: rows }, null, 2));
    console.log(`\ncheckpoint: active/psi/${stamp}.json`);
  } catch (e) {
    console.log("\ncheckpoint write failed:", String(e));
  }

  return allGreen ? 0 : 1;
}

process.exitCode = await main();
