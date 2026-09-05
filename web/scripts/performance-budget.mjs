// Compare matching lab runs; generous tolerances avoid gating ordinary timing noise.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const [beforePath, afterPath] = process.argv.slice(2);
assert(beforePath && afterPath, 'Usage: node scripts/performance-budget.mjs before.json after.json');
const before = JSON.parse(readFileSync(beforePath, 'utf8')).results;
const after = JSON.parse(readFileSync(afterPath, 'utf8')).results;
const failures = [];
for (const old of before) {
 const current = after.find(r => r.mode === old.mode && r.route === old.route);
 if (!current) { failures.push(`Missing route ${old.mode} ${old.route}`); continue; }
 if (current.landed !== old.landed) failures.push(`Unexpected redirect change: ${old.route}`);
 for (const metric of ['lcp', 'fcp', 'ttfb']) {
  if (current[metric] > old[metric] * 1.5 + 400) failures.push(`${old.mode} ${old.route} ${metric} regression: ${old[metric]} -> ${current[metric]}`);
 }
 if (current.js > old.js * 1.2 + 32768) failures.push(`${old.mode} ${old.route} JS increased beyond 20% + 32KiB`);
 if (current.cls > Math.max(0.05, old.cls + 0.02)) failures.push(`${old.mode} ${old.route} CLS ${current.cls}`);
 if (current.errors.length) failures.push(`${old.mode} ${old.route}: browser runtime errors`);
}
console.log(JSON.stringify({compared:before.length, failures, note:'Single-run lab guard only. Verify failures across repeated runs before treating timing as a regression.'}, null, 2));
process.exitCode = failures.length ? 1 : 0;
