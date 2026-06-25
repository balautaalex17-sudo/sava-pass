# Smoothness loop

A token-light loop to keep the immersive homepage (and the shared scroll-reveal) feeling
smooth on mobile and desktop. Each iteration is **one cheap command + one targeted edit**.
The audit script does the locating (it names the single worst offender and points here), so
no per-iteration profiling is needed.

## Run it

From `web/`, with a server up. Use a **production build** for real numbers — dev/Turbopack
is only good enough to smoke that the script runs.

```bash
# production (real numbers)
npm run build && npm run start &      # serves http://localhost:3000
node scripts/smoothness-audit.mjs

# or against the deployed site
node scripts/smoothness-audit.mjs https://sava-pass.vercel.app/
```

It boots the page in a desktop (1280) and mobile (390) context via system Edge
(`playwright-core`, no browser download), drives a Lenis scroll through the whole page,
and prints a scoreboard + a `WORST OFFENDER` line. Every run writes a checkpoint to
`active/smoothness/<timestamp>.json` (gitignored) so runs are diffable.

Exit code is `1` on a gated regression, `0` when smooth — so it doubles as a manual
pre-ship gate.

## What it measures

| Field | Failure mode | Gated? |
| --- | --- | --- |
| `p90`, `longFrames50` | scroll **stutter** | yes |
| `tbtScroll` (long-task blocking during scroll) | scroll **stutter** | yes |
| `cls` | load **stutter** | yes (ceiling 0.1) |
| `scrollDelay` (input → first move) | input **delay** | advisory |
| `lcp` | load delay | advisory (owned by `perf-measure.mjs`) |
| `median`, `max`, `longFrames32` | context | advisory |

`scrollDelay` and `lcp` are advisory because headless event timing is noisier than frame
sampling and `perf-measure.mjs` already gates LCP. Promote `scrollDelay` to a gate only once
its run-to-run variance is shown tight.

## The loop

1. Run the audit. Read the `WORST OFFENDER` line — it names the context, the metric, the
   page region, and the rubric section below.
2. Open that rubric section, apply **exactly one** fix.
3. Re-run. Keep it if the offender improved and nothing else crossed a ceiling; otherwise
   revert. Record the before/after at the bottom of this file.

One fix per turn keeps cause and effect attributable — and cheap.

## Fix rubric

### scroll-stutter

`p90` / `longFrames50` high = a property that forces **layout or paint** is being animated,
usually on many elements or in a loop, in the named region.

- Never animate `height` / `width` / `top` / `left` / `margin` / `filter` / `box-shadow` on many
  or looping elements. Use `transform` (translate/scale) + `opacity` only — they composite,
  no reflow. (The equalizer bars were fixed exactly this way: `height` keyframe → `scaleY`
  with `transform-origin:bottom`.)
- Add `will-change: transform` to the animated element so it gets its own layer.
- For scroll reveals on elements with no hidden base, prefer a CSS `opacity:0` + transition
  class (`.im-rv` / `.anim-rise`) over a JS animation library — no flash, no WAAPI revert,
  can't re-fire.
- Reveal **once**: an IntersectionObserver that re-hides on exit replays every scroll-by and
  churns. `unobserve()` after the first reveal.

### main-thread-blocking

`tbtScroll` high = JavaScript is running long tasks during scroll in the named region.

- Coalesce per-frame scroll handlers through a single `requestAnimationFrame` (the chrome
  update already does this via `__chromeT`); never do layout reads/writes synchronously on
  every `scroll` event.
- Trim or device-tier heavy GSAP scrubs. The engine already tiers the two heaviest
  (bg-video parallax + ghost-numeral drift) off low-end phones via `__lowEnd`, and halves
  amplitudes on touch via `__vamp`. If a new scrub lands here, tier it the same way.
- Use native video `loop` — never a per-frame reverse-scrub of `video.currentTime`.

### load-stutter

`cls` high = content moves during load/scroll in the named region.

- Reserve space for media (width/height or aspect-ratio) so images/posters don't shove
  content when they decode.
- Stabilize injection order — late-mounted layout that pushes content counts as shift.

## Where to apply a fix

The immersive homepage is a verbatim port, so fixes land in a **pair**:

- **Immersive CSS / markup** (the homepage `<style>` and DOM): patch
  `scripts/extract-immersive.mjs` (the source of truth) **and** hand-patch the generated
  `app/_immersive/content.ts`. The extractor cannot be re-run on this machine (the v3 source
  HTML is absent), so the generated file must be edited too. Patch `content.ts` with a
  count-asserted node script, never by loading the whole blob into context.
- **Immersive engine behaviour** (GSAP/Lenis): patch `scripts/extract-immersive.mjs`
  `engineOut` **and** `public/imersiv/engine.js`.
- **App-wide scroll reveal**: `components/ui/ScrollReveal.tsx`.

## Caveats

- This is a **relative** detector + offender locator. Headless Edge can under-report
  real-device jank, and motion is force-on in this app. Before declaring a large visual win
  shipped, confirm it on a real phone.
- Measure against a clean production build. A stale Turbopack `.next` cache has twice served
  old CSS in dev; rebuild after CSS edits rather than trusting hot reload.

## Run log

<!-- newest first: date — offender — fix — before/after -->

- **2026-06-25 — baseline (clean prod build, headless Edge)** — no fix needed, page
  measures SMOOTH on both contexts. Desktop 1280: median 6ms, p90 12ms, max 55ms,
  hitches >32ms 3 / >50ms 1, TBT 0ms, scroll-delay 32ms, CLS 0.0035, LCP 936ms.
  Mobile 390: median 6ms, p90 6ms, 0 hitches, TBT 0ms, scroll-delay 39ms, CLS 0.0052,
  LCP 252ms. All gated metrics sit well under their ceilings, so the ceilings are
  confirmed generous-vs-baseline (fire only on real regression). Note: headless can
  under-report real-device jank — if a real phone feels janky, run the audit against
  that condition (or `sava-pass.vercel.app`) and the region attribution will localize it.
