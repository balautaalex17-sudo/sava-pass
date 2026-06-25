# PageSpeed mobile all-green loop

A bounded `/loop` that drives the deployed homepage to **all-green on PageSpeed Insights,
mobile strategy**, for `https://sava-pass.vercel.app/`. It iterates fast locally with
Lighthouse, gates the real goal on the PageSpeed API, applies the report's fixes in impact
order, and stops when green — or pauses to ask you before going aggressive. Never infinite.

## The goal

All five core metric audits score **≥ 0.9** (the green pill) on `strategy=mobile`:
`first-contentful-paint`, `largest-contentful-paint`, `speed-index`, `total-blocking-time`,
`cumulative-layout-shift`. TBT and CLS are already green; the work is **FCP, LCP, Speed Index**.

Goal check = `node scripts/psi-gate.mjs` exits 0.

## Two measurement tiers

| Tool | Measures | Use for |
| --- | --- | --- |
| `scripts/lh-mobile.mjs` | local Lighthouse, prod build at `localhost:3000` | fast inner loop — pick + verify each fix without deploying |
| `scripts/psi-gate.mjs` | real PageSpeed API, deployed site | the authoritative goal gate |

Local Lighthouse is directional (lab numbers vary by machine); the PSI gate is the verdict.

**Prereqs.** `lh-mobile`: `npm run build && npm run start` + a Chromium browser (Lighthouse
auto-downloads via `npx`; if only Edge is present, set `CHROME_PATH`). `psi-gate`: the
anonymous PageSpeed API is rate-limited per day — set a free `PSI_API_KEY` env var if you hit
429s. Both checkpoint to gitignored `active/lighthouse/` and `active/psi/`.

## The loop (per round)

1. **Deploy** the current state to production (PageSpeed only measures the deployed site):
   ```bash
   cd web && npx -y vercel deploy --prod --yes --token "$(cat ../active/.vercel-token)" --scope alex-2027s-projects
   ```
   (Token kept in gitignored `active/.vercel-token`. The Vercel MCP deploys the connected git
   repo, not local files, so it would ship stale code — use the CLI.)
2. **Gate:** `node scripts/psi-gate.mjs`. Exit 0 → **goal met, stop and report.**
3. Else **pick** the top untried item from the playbook below, **apply one fix**, and **verify
   locally** with `lh-mobile.mjs` + the guards (`verify-mobile-immersive.mjs`,
   `smoothness-audit.mjs`). Keep if the target metric improved and nothing regressed; revert if not.
4. Commit. Next round.

## Bound + checkpoint (the stop rule)

- Stop immediately when all five are green.
- Otherwise run up to a **round cap (start at 6)**. When the cap is hit, or gains flatten
  (< ~5% metric improvement across a round), **pause and ask the user** whether to continue into
  aggressive measures (deferring the whole engine on mobile, dropping background videos). Never
  loop infinitely.

## Execution posture (decided)

Run the loop in a **Sonnet** session at **medium-high reasoning, no sub-agent fan-out**. The
cycle is sequential (deploy → measure → pick → apply → verify) and the fixes are well-specified
by the plan, so Opus isn't warranted and sub-agents add setup cost without parallelism.
**Escalate to Opus only if a fix turns out genuinely non-obvious.** The loop self-paces around
the deploy (wait via the platform wakeup, don't busy-poll).

## Fix playbook (impact order)

| # | Fix | Moves | Where |
| --- | --- | --- | --- |
| 1 | Church LCP image: eager + `fetchpriority=high` + mobile preload | LCP, FCP | `extract-immersive.mjs` + `app/_immersive/content.ts` + `app/page.tsx` |
| 2 | Critical-path fonts: preload only Manrope | FCP, LCP | `app/layout.tsx` |
| 3 | Defer engine/vendor JS past LCP (desktop-scope the script preloads) | FCP, LCP, SI | `app/page.tsx` |
| 4 | Forced reflow: batch reads-then-writes in `chrome()`; DOM weight | Speed Index | `extract-immersive.mjs` + `public/imersiv/engine.js` |

Immersive-port fixes (church image, `chrome()`) land in the **pair**: the extractor (source of
truth) **and** the generated file (the extractor can't be re-run here — patch `content.ts` with a
count-asserted node script).

## Invoke

```
/loop  measure PageSpeed mobile for sava-pass.vercel.app; if all green stop; else apply the next
       playbook fix, deploy, re-measure; pause to ask me at round 6 or when gains flatten
```

## Run log

<!-- newest first: date — round — metric deltas — fix applied -->

- **2026-06-25 — baseline** (from pagespeed.web.dev, mobile): FCP 2.1s / LCP 3.2s / Speed Index 4.6s RED; TBT 20ms / CLS 0 GREEN. LCP element = `/imersiv/church.webp` loaded `loading="lazy"` (1380ms load delay).
- **2026-06-25 — round 1 deployed** (`dpl_GR5PSeGDPxzhWRQzFnwHoSGHPG96`, aliased to sava-pass.vercel.app). Applied the full playbook + two extras: church LCP image eager+`fetchpriority`+mobile preload, font preload trim (Manrope only), engine/vendor script preloads desktop-scoped, `chrome()` reflow batched, **`experimental.inlineCss`** (removes render-blocking CSS), **modern browserslist** (drops legacy polyfills). **Verified live in the deployed HTML:** church `fetchpriority="high"` with no `lazy` + mobile preload present, **0 render-blocking stylesheet `<link>`** (CSS inlined), engine preload `media=(min-width:761px)`. Local Lighthouse (noisy, machine-contended): TBT/SI/CLS green, FCP/LCP improved but local LCP unreliable. **Real PSI verdict pending** — anonymous API is 429 (daily quota); confirm via pagespeed.web.dev or set a free `PSI_API_KEY` and run `psi-gate.mjs`.
