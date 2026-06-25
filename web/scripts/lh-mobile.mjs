// Local Lighthouse mobile run for fast iteration in the all-green loop.
//
// PageSpeed (scripts/psi-gate.mjs) is the authoritative goal but only measures the
// DEPLOYED site and is rate-limited. This runs the same Lighthouse engine locally
// against a production build so each candidate fix is picked + verified without a
// deploy. Treat it as directional; the PSI gate is the real verdict.
//
// Prereqs: a production build served locally (npm run build && npm run start) and a
// Chromium browser. Lighthouse auto-downloads via npx on first run; if only Edge is
// installed, point CHROME_PATH at it.
//
// Run from web/:
//   node scripts/lh-mobile.mjs [url]
//   CHROME_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" node scripts/lh-mobile.mjs
//
// Exit 0 = all five metrics green (audit score >= 0.9), else 1. Same metric set and
// thresholds as psi-gate.mjs so local and deployed verdicts line up.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const URL = process.argv[2] || "http://localhost:3000/";
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "active", "lighthouse");

const METRICS = {
  FCP: "first-contentful-paint",
  LCP: "largest-contentful-paint",
  SI: "speed-index",
  TBT: "total-blocking-time",
  CLS: "cumulative-layout-shift",
};
const GREEN = 0.9;
// Scored opportunities worth surfacing so the loop knows what to fix next.
const OPPS = ["render-blocking-resources", "unused-javascript", "uses-rel-preload", "largest-contentful-paint-element"];

function runLighthouse() {
  // Default Lighthouse form-factor is already mobile (emulation + throttling).
  const args = [
    "-y", "lighthouse", URL,
    "--only-categories=performance",
    "--output=json", "--output-path=stdout",
    "--quiet", "--chrome-flags=--headless=new --no-sandbox",
  ];
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    const child = spawn("npx", args, { env, shell: process.platform === "win32" });
    let out = "", err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (!out.trim()) return reject(new Error(`lighthouse produced no JSON (exit ${code}). ${err.slice(0, 300)}`));
      try { resolve(JSON.parse(out)); }
      catch { reject(new Error(`could not parse lighthouse JSON (exit ${code}). ${err.slice(0, 300)}`)); }
    });
  });
}

async function main() {
  console.log("=== LIGHTHOUSE MOBILE (local) ===");
  console.log("URL :", URL, "\n");

  let lh;
  try {
    lh = await runLighthouse();
  } catch (e) {
    console.error("FAIL ", String(e.message || e));
    console.error("      Ensure a prod build is served (npm run build && npm run start) and Chrome/Edge is reachable (CHROME_PATH).");
    return 2;
  }

  const rows = {};
  let allGreen = true;
  for (const [label, auditId] of Object.entries(METRICS)) {
    const a = lh.audits?.[auditId] || {};
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

  // top opportunities → what the loop should fix next
  const opps = OPPS
    .map((id) => ({ id, a: lh.audits?.[id] }))
    .filter((o) => o.a && o.a.score !== null && o.a.score < 1)
    .map((o) => ({ id: o.id, savingsMs: Math.round(o.a.details?.overallSavingsMs || o.a.numericValue || 0) }))
    .sort((a, b) => b.savingsMs - a.savingsMs);
  if (opps.length) {
    console.log("\n  opportunities:");
    for (const o of opps) console.log(`    ${String(o.savingsMs + "ms").padStart(8)}  ${o.id}`);
  }
  console.log(`\nVERDICT: ${allGreen ? "ALL GREEN" : "NOT GREEN — " + Object.entries(rows).filter(([, r]) => !r.green).map(([l]) => l).join(", ")}`);

  try {
    mkdirSync(OUT_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(join(OUT_DIR, `${stamp}.json`), JSON.stringify({ ts: stamp, url: URL, allGreen, perf, metrics: rows, opps }, null, 2));
    console.log(`\ncheckpoint: active/lighthouse/${stamp}.json`);
  } catch (e) {
    console.log("\ncheckpoint write failed:", String(e));
  }

  return allGreen ? 0 : 1;
}

process.exitCode = await main();
