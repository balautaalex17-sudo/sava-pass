// One-time / re-sync extractor: turns the standalone v3 immersive HTML into the
// app's route-mountable pieces. Run from web/:  node scripts/extract-immersive.mjs
//
// Source of truth: "Sava Pass #2/SavaPass Immersive v3.html" (pass a different path as argv[2]).
// Faithful port — the ONLY edits applied to the source bytes are:
//   1. font tokens (--f-sans/--f-disp/--f-mono) point at the app's next/font CSS vars
//   2. asset paths  assets/...  ->  /imersiv/...
//   3. purchase/event CTAs (<button> "Cumpără bilet" / "Vezi evenimentul")  ->  <a href="__CTA_HREF__">
//
// Outputs:
//   app/_immersive/content.ts        (IMMERSIVE_CSS + IMMERSIVE_MARKUP strings, route-scoped)
//   public/imersiv/engine.js         (the classic inline engine, verbatim)
//   public/imersiv/engine-motion.mjs (the Framer Motion module, verbatim)

import fs from "node:fs";
import path from "node:path";

const SRC =
  process.argv[2] ||
  "C:/Users/cycla/Documents/Bussines/projects/Sava Pass #2/SavaPass Immersive v3.html";

const html = fs.readFileSync(SRC, "utf8");

// ── slice the document ──────────────────────────────────────────────────────
const css = html.slice(
  html.indexOf("<style>") + "<style>".length,
  html.indexOf("</style>")
);

const bodyRegion = html.slice(
  html.indexOf("<body>") + "<body>".length,
  html.indexOf("</body>")
);

const firstScript = bodyRegion.indexOf("<script");
const markup = bodyRegion.slice(0, firstScript);
const scripts = bodyRegion.slice(firstScript);

const engine = (scripts.match(/<script>([\s\S]*?)<\/script>/) || [, ""])[1];
const motion =
  (scripts.match(/<script type="module">([\s\S]*?)<\/script>/) || [, ""])[1];

// ── edits ───────────────────────────────────────────────────────────────────
const repoint = (s) => s.split("assets/").join("/imersiv/");

let cssOut = css
  .replace(
    "--f-sans:'Manrope',ui-sans-serif,system-ui,sans-serif;",
    "--f-sans:var(--font-manrope),'Manrope',ui-sans-serif,system-ui,sans-serif;"
  )
  .replace(
    "--f-disp:'Instrument Serif',Georgia,serif;",
    "--f-disp:var(--font-instrument-serif),'Instrument Serif',Georgia,serif;"
  )
  .replace(
    "--f-mono:'JetBrains Mono',ui-monospace,Menlo,monospace;",
    "--f-mono:var(--font-jetbrains-mono),'JetBrains Mono',ui-monospace,Menlo,monospace;"
  );
cssOut = repoint(cssOut);

// SavaPass force-on: the v3 stylesheet has `@media (prefers-reduced-motion:reduce)`
// blocks that hard-kill motion (and override GSAP's inline transforms with
// !important). Strip the killer rules so the homepage animates regardless of the
// OS setting, matching the rest of the app. The brand-marquee + lightbox rules in
// that block are left alone. (Toggle force-on by removing these replaces.)
cssOut = cssOut
  .replace("@media(prefers-reduced-motion:reduce){.gen-bar i{transform:none!important;}}", "")
  .replace("*{animation:none!important;}", "")
  .replace(".seam i{transform:translateX(-50%) scaleY(1)!important;}.seam b{transform:translate(-50%,50%) scale(1)!important;}", "")
  .replace(".rv{opacity:1!important;transform:none!important;filter:none!important;}", "")
  .replace(".hline>span{transform:none!important;}", "");

// SavaPass smoothness: the `.rv` scroll reveal animated `filter:blur` (+ scale + a
// 48px travel) on ~38 elements — animating blur is GPU-heavy and made the reveals
// feel slow/laggy. Drop the blur + scale, shorten the travel + duration so elements
// glide in (opacity + small translate only, the cheap/compositor-friendly path).
cssOut = cssOut
  .replace(
    ".rv{opacity:0;transform:translateY(34px);filter:blur(8px);transition:opacity .8s var(--e),transform .8s var(--e),filter .8s var(--e);transition-delay:var(--d,0s);}",
    ".rv{opacity:0;transform:translateY(22px);transition:opacity .6s var(--e),transform .6s var(--e);transition-delay:var(--d,0s);will-change:opacity,transform;}"
  )
  .replace(".rv{transform:translateY(48px) scale(.93);filter:blur(10px);}", ".rv{transform:translateY(22px);}");

// SavaPass perf (2026-06-23): the stats-section equalizer is 56 bars each running
// an INFINITE animation of `height` (a layout property) — 56 simultaneous reflows
// per frame = the jank felt around the stats section. Switch to transform:scaleY
// (compositor-only): fix each bar's box height (var --h) and animate scaleY.
cssOut = cssOut
  .replace(
    ".eq span{width:5px;height:8px;border-radius:3px 3px 0 0;flex:none;transform-origin:bottom;",
    ".eq span{width:5px;height:var(--h,46px);border-radius:3px 3px 0 0;flex:none;transform-origin:bottom;will-change:transform;",
  )
  .replace(
    "@keyframes eqbar{from{height:7px;opacity:.4;}to{height:var(--h,46px);opacity:1;}}",
    "@keyframes eqbar{from{transform:scaleY(.16);opacity:.4;}to{transform:scaleY(1);opacity:1;}}",
  );

// SavaPass mobile decoratives: hide the viewport-level ambient chrome on phones.
// Re-showing these for "desktop fidelity" backfired on real hardware (plan 004
// follow-up): the .lrail progress rail rendered as a weird cyan stub + glowing node
// hanging off the top-left, and the .dots section-nav (01–05) jammed off-centre
// against the right edge over the buttons. They look great on a 1280px canvas and
// wrong on a 412px phone — which is exactly why the original build hid them. The
// mobile "wow" comes from the engine + content + animations, not this chrome.
//   .lrail — left progress rail (stub + node looked like a glitch)
//   .dots  — right section-nav 01–05 (off-centre, crowded the CTAs/poster)
//   .strip — hero marquee (overlaps the eyebrow)
//   .tele  — intro corner labels (redundant with the engine-ticket chips; clutter)
cssOut = cssOut.replace(
  "@media(max-width:760px){.lrail{display:none;}}",
  "@media(max-width:760px){.lrail{display:none;}.dots{display:none;}.strip{display:none;}.tele{display:none;}}",
);

// SavaPass mobile (plan 004 follow-up): on phones the hero grid stacks to 1 column
// and .tk-wrap was justify-self:start, so the phone mockup left-aligned and clipped
// off the left edge. Centre it (desktop already centres via the base .tk-wrap rule).
cssOut = cssOut.replace(
  ".tk-wrap{margin-top:10px;justify-self:start;}",
  ".tk-wrap{margin-top:10px;justify-self:center;}",
);

// SavaPass mobile (plan 004 follow-up): the "baked tuning" translate shifts pull
// sections up by 18-42px to overlap nicely on the 1280px canvas. On phones the
// event section-head wraps (the "Toate edițiile" button drops below the heading)
// and .ev-feat{translate:-42px} then drags the featured card UP over that button.
// Neutralise these desktop-only micro-shifts on phones so nothing overlaps.
cssOut += "@media(max-width:760px){#event .sec-head>div:first-child{translate:none;}.ev-feat{translate:none;}.ev-detail{translate:none;}#join{translate:none;}}";

// SavaPass mobile (plan 004 follow-up): the intro lockup hugged the LEFT edge on
// phones (#logo-stage is align-items:flex-start ≤920px), leaving the right half a
// dead white void and the whole card unbalanced. Center the lockup + gear block and
// center the text so the title card reads balanced and intentional in portrait, and
// re-centre the cyan underline accordingly. Desktop (>=761px) keeps the original
// horizontal flex-start lockup.
cssOut += "@media(max-width:760px){" +
  "#logo-stage{align-items:center;text-align:center;}" +
  ".ll-text{align-items:center;}" +
  ".ll-sub{padding-left:0;}" +
  ".ll-sub::before{left:50%;margin-left:-54px;transform-origin:center;}" +
  "}";

// SavaPass mobile (2026-06-24): on phones the hero + join `.cta` buttons (Vezi
// evenimentul / Vezi arhiva / Aplică acum) sat side by side and read cramped.
// Stack them full-width (thumb-native) at <=520px — mirrors the existing
// `.ev-cta .btn{flex:1 1 100%}` rule in the same block. Column flex stretches
// items to full width. Desktop untouched.
cssOut = cssOut.replace(
  ".ev-cta .btn,.ev-ghost{flex:1 1 100%;}",
  ".ev-cta .btn,.ev-ghost{flex:1 1 100%;}.cta{flex-direction:column;}",
);

let markupOut = repoint(markup);
const ctaRe =
  /<button class="(btn btn-p[^"]*)"((?:\s+[\w-]+="[^"]*")*)\s*>\s*((?:Cumpără bilet|Vezi evenimentul)[\s\S]*?)<\/button>/g;
const ctaCount = (markupOut.match(ctaRe) || []).length;
markupOut = markupOut.replace(ctaRe, '<a href="__CTA_HREF__" class="$1"$2>$3</a>');

// Membership CTA: the "Aplică acum" button leads to the application page (static route).
const applyRe =
  /<button class="(btn btn-p[^"]*)"((?:\s+[\w-]+="[^"]*")*)\s*>\s*(Aplică acum[\s\S]*?)<\/button>/g;
const applyCount = (markupOut.match(applyRe) || []).length;
markupOut = markupOut.replace(applyRe, '<a href="/devino-membru" class="$1"$2>$3</a>');

// SavaPass perf (2026-06-23): the homepage PNGs were 2.1-2.7 MB each (~20 MB total).
// They are re-encoded to sized WebP by scripts/encode-media.mjs (~95% smaller);
// rewrite the markup to reference the .webp files. Also lazy-load the two event
// posters that ship EAGER in the source but sit below the fold.
const WEBP_IMAGES = [
  "echoes-unplugged", "event-easter", "event-cupid",
  "year-2024", "year-2025", "year-2026",
  "team-interact", "stat-community", "stat-concert", "stat-scan",
];
for (const n of WEBP_IMAGES) {
  markupOut = markupOut.split(`/imersiv/${n}.png`).join(`/imersiv/${n}.webp`);
}
markupOut = markupOut
  .replace('src="/imersiv/event-easter.webp" alt=', 'src="/imersiv/event-easter.webp" loading="lazy" decoding="async" alt=')
  .replace('src="/imersiv/event-cupid.webp" alt=', 'src="/imersiv/event-cupid.webp" loading="lazy" decoding="async" alt=');

// SavaPass: drive Lenis smooth-scroll from GSAP's ticker instead of a standalone
// rAF loop, so smooth-scroll and ScrollTrigger update on the same frame (separate
// loops desync scrub animations from the scroll), and refresh trigger positions
// once the layout settles. Keeps the homepage scroll motion locked to the wheel.
const engineOut = engine
  // Snappier smooth-scroll (match v2's feel): lower lerp = less floaty/laggy.
  // Mobile perf (2026-06-23): syncTouch:false → touch uses NATIVE momentum scroll
  // (Lenis only smooths the wheel, on desktop). syncTouch:true was re-driving touch
  // scroll through a JS rAF loop and was the main cause of "very laggy" on phones.
  // Native touch scroll is buttery and every scroll handler still fires via the
  // native listener. (Reverses the earlier "keep Lenis on touch" choice — that was
  // the lag.)
  .replace("new Lenis({lerp:0.1,smoothWheel:true,wheelMultiplier:1.05})", "new Lenis({lerp:0.085,smoothWheel:true,wheelMultiplier:1.08,syncTouch:false})")
  .replace(
    "if(lenis){function raf(t){lenis.raf(t);requestAnimationFrame(raf);}requestAnimationFrame(raf);}",
    "if(lenis){if(window.gsap){gsap.ticker.add(t=>lenis.raf(t*1000));gsap.ticker.lagSmoothing(0);}else{function raf(t){lenis.raf(t);requestAnimationFrame(raf);}requestAnimationFrame(raf);}}"
  )
  // Phone entrance: the source plays it on LOAD (delay .15), but the hero is below
  // the fold then, so by the time you scroll to it the phone is already static. Set
  // it hidden and run the entrance when the hero enters view (alongside the headline
  // reveal) so the phone visibly appears with the rest of the hero.
  .replace(
    "gsap.from(phone,{autoAlpha:0,scale:.9,duration:1,ease:'power3.out',delay:.15});",
    "gsap.set(phone,{autoAlpha:0,scale:.9});(function(){var hh=document.getElementById('hero');var pin=function(){gsap.to(phone,{autoAlpha:1,scale:1,duration:1.1,ease:'power3.out'});};if(hh&&'IntersectionObserver'in window){var pio=new IntersectionObserver(function(es){for(var i=0;i<es.length;i++){if(es[i].isIntersecting){pin();pio.disconnect();return;}}},{threshold:.12});pio.observe(hh);}else{pin();}})();"
  )
  // Less lag: reveal `.rv` ONCE (drop the re-hide-on-exit), so scrolling past an
  // element doesn't constantly re-trigger its transition (churn = jank).
  .replace(
    "    if(e.isIntersecting)fire(e.target);\n    else e.target.classList.remove('in');",
    "    if(e.isIntersecting){fire(e.target);io.unobserve(e.target);}"
  )
  // Less lag: use the videos' native `loop` instead of decrementing currentTime
  // every rAF in reverse (seeking video each frame is expensive/janky). Accepts a
  // tiny loop seam in exchange for smooth scrolling.
  .replace(
    "v.removeAttribute('loop');",
    "return; /* native loop: skip the per-frame reverse-scrub (jank source) */"
  )
  // Hero headline mask reveal: a ScrollTrigger play-on-enter tween does NOT reliably
  // fire its toggle under Lenis, and gsap.to(yPercent:0) left the spans at their
  // masked start. Drive it with pure JS: CSS transition + flip the inline transform
  // to translateY(0)!important when the hero enters view, staggered per line.
  .replace(
    "gsap.to('.hline>span',{yPercent:0,stagger:.1,duration:1.1,ease:'power4.out',scrollTrigger:{trigger:'#hero',start:'top 78%'}});",
    "(function(){var spans=[].slice.call(document.querySelectorAll('.hline>span'));if(!spans.length)return;spans.forEach(function(s){s.style.transition='transform 1.1s cubic-bezier(.16,1,.3,1)';s.style.willChange='transform';});var go=function(){spans.forEach(function(s,i){setTimeout(function(){s.style.setProperty('transform','translateY(0)','important');},i*110);});};var h=document.getElementById('hero');if(h&&'IntersectionObserver'in window){var io=new IntersectionObserver(function(es){for(var i=0;i<es.length;i++){if(es[i].isIntersecting){go();io.disconnect();return;}}},{threshold:.12});io.observe(h);}else{go();}})();\n    /* mobile (plan 004): the parallax/scrub set runs on ALL devices (tuned). The two heaviest — the background-video parallaxes + the ghost-numeral drift — skip low-end phones (deviceMemory<=4) to hold FPS; iOS reports no deviceMemory so it is treated as capable. Touch halves amplitudes via __vamp. */\n    var __touch=matchMedia('(hover:none)').matches; var __lowEnd=!!(navigator.deviceMemory&&navigator.deviceMemory<=4); var __vamp=__touch?0.5:1; {"
  )
  // Mobile perf: close the desktop-only parallax block opened after the hero reveal,
  // then refresh trigger positions (a no-op on touch where no scrubs were created).
  .replace(
    "    /* (stat entrance is now driven by Framer Motion in the module below) */",
    "    }  /* end parallax/scrub block (runs on all devices, tuned) */\n    /* recompute trigger positions once fonts/images/videos settle — otherwise\n       start/end are measured against an unsettled layout and scrub feels off */\n    ScrollTrigger.refresh();\n    addEventListener('load',()=>ScrollTrigger.refresh());\n    setTimeout(()=>ScrollTrigger.refresh(),600);\n    /* (stat entrance is now driven by Framer Motion in the module below) */"
  )
  // Mobile perf: rAF-throttle the chrome() scroll handler — it reads
  // getBoundingClientRect on every section on each raw scroll event (layout thrash
  // on native touch scroll). Coalesce to at most one read per frame.
  .replace(
    "addEventListener('scroll',chrome,{passive:true});",
    "let __chromeQ=false;function __chromeT(){if(__chromeQ)return;__chromeQ=true;requestAnimationFrame(function(){__chromeQ=false;chrome();});}\naddEventListener('scroll',__chromeT,{passive:true});"
  )
  .replace(
    "if(lenis) lenis.on('scroll',chrome);",
    "if(lenis) lenis.on('scroll',__chromeT);"
  )
  // Mobile perf: only decode the on-screen video — pause off-screen ones (helps
  // everywhere, invisible since the visible video keeps playing).
  .replace(
    "document.addEventListener('visibilitychange',()=>{if(!document.hidden)kickVideos();});",
    "document.addEventListener('visibilitychange',()=>{if(!document.hidden)kickVideos();});\nif('IntersectionObserver'in window){var __vio=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target;if(e.isIntersecting){v.muted=true;var p=v.play();if(p&&p.catch)p.catch(function(){});}else{v.pause();}});},{threshold:.05});document.querySelectorAll('video').forEach(function(v){__vio.observe(v);});}"
  )
  // Mobile (plan 004): the QR-scan showpiece now runs on phones too (capable ones).
  // The box-shadow loop is GPU-costly, so it is skipped only on low-end devices
  // (deviceMemory<=4); iOS reports no deviceMemory and gets the full showpiece.
  .replace(
    "if(scan&&ok){",
    "if(scan&&ok&&!(navigator.deviceMemory&&navigator.deviceMemory<=4)){"
  )
  // Mobile (plan 004): tune the hero ticket parallax amplitude down on touch.
  .replace(
    "gsap.to('#tkwrap',{yPercent:-12,",
    "gsap.to('#tkwrap',{yPercent:-12*__vamp,"
  )
  // Mobile (plan 004): the two background-video parallaxes are the heaviest scrub
  // effects (compositing full-bleed video) — skip them on low-end phones, halve the
  // amplitude on touch.
  .replace(
    "gsap.to('.hero-video',{yPercent:16,ease:'none',scrollTrigger:{trigger:'#hero',start:'top bottom',end:'bottom top',scrub:true}});\n    gsap.to('.foot-video',{yPercent:14,ease:'none',scrollTrigger:{trigger:'.foot',start:'top bottom',end:'bottom top',scrub:true}});",
    "if(!__lowEnd){gsap.to('.hero-video',{yPercent:16*__vamp,ease:'none',scrollTrigger:{trigger:'#hero',start:'top bottom',end:'bottom top',scrub:true}});\n    gsap.to('.foot-video',{yPercent:14*__vamp,ease:'none',scrollTrigger:{trigger:'.foot',start:'top bottom',end:'bottom top',scrub:true}});}"
  )
  // Mobile (plan 004): tune the footer headline rise amplitude down on touch.
  .replace(
    "gsap.from('.foot .big',{yPercent:22,",
    "gsap.from('.foot .big',{yPercent:22*__vamp,"
  )
  // Mobile (plan 004): the ghost-numeral drift is a per-row scrub — skip it on
  // low-end phones, halve the amplitude on touch.
  .replace(
    "document.querySelectorAll('.gen-ghost').forEach(g=>{\n      const row=g.closest('.gen-row'); if(!row) return;\n      gsap.fromTo(g,{yPercent:-12},{yPercent:12,ease:'none',scrollTrigger:{trigger:row,start:'top bottom',end:'bottom top',scrub:true}});\n    });",
    "if(!__lowEnd) document.querySelectorAll('.gen-ghost').forEach(g=>{\n      const row=g.closest('.gen-row'); if(!row) return;\n      gsap.fromTo(g,{yPercent:-12*__vamp},{yPercent:12*__vamp,ease:'none',scrollTrigger:{trigger:row,start:'top bottom',end:'bottom top',scrub:true}});\n    });"
  );

// No blink: Framer Motion's `inView` re-runs its callback every time an element
// re-enters the viewport (its fire-once/return semantics didn't hold here), so
// scrolling back into the stats/event reveals replayed opacity 0→1 = a visible
// blink. Replace `inView` with a plain IntersectionObserver that UNOBSERVES after
// the first reveal — guaranteed once per element, no ambiguity. Passes the entry
// so the callbacks' `el(info) = info.target` keeps working; `threshold` = `amount`.
// The homepage scroll reveals were ported from the v3 `<script type=module>` which
// used Framer Motion's `animate` + `inView`. That caused a persistent card "blink":
// the cards have no opacity:0 base, so Motion painted them at full opacity then
// snapped to 0 (flash), and pre-hiding made Motion revert them to 0 on finish.
// We REPLACE that module wholesale with a CSS-class reveal (see `.im-rv` in
// globals.css): `opacity:0` lives in CSS so cards are never visible before reveal,
// the transition persists the end state (no revert), and a fire-once
// IntersectionObserver adds `im-in` exactly once. Count-up + GSAP scrubs stay in
// engine.js. (Decoupled from the v3 source motion on purpose.)
const motionOut = [
  "  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;",
  "  if (!prefersReduced) {",
  "    const onceIO = (els, cb, rm) => {",
  "      const seen = new WeakSet();",
  "      const io = new IntersectionObserver((ents) => { ents.forEach((e) => { if (e.isIntersecting && !seen.has(e.target)) { seen.add(e.target); io.unobserve(e.target); cb(e.target); } }); }, { threshold: 0, rootMargin: rm || '0px 0px -8% 0px' });",
  "      els.forEach((x) => io.observe(x));",
  "    };",
  "    const mark = (sel, cls) => { const els = Array.from(document.querySelectorAll(sel)); els.forEach((e) => e.classList.add(cls || 'im-rv')); return els; };",
  "    /* featured card + live map */",
  "    onceIO(mark('.ev-feat, .ev-map'), (el) => el.classList.add('im-in'));",
  "    /* ticket progress bar fills */",
  "    document.querySelectorAll('.ev-prog .ev-prog-bar i').forEach((b) => b.classList.add('im-bar'));",
  "    onceIO(Array.from(document.querySelectorAll('.ev-prog')), (el) => { const b = el.querySelector('.ev-prog-bar i'); if (b) b.classList.add('im-in'); });",
  "    /* archive cards stagger in */",
  "    const past = mark('.ev-past'); past.forEach((e, i) => { e.style.transitionDelay = (i * 0.1) + 's'; });",
  "    onceIO(past, (el) => el.classList.add('im-in'));",
  "    /* STATS · trei generatii: each row rises, its growth bar + time-thread draw in */",
  "    const rows = mark('.gen-row');",
  "    rows.forEach((row) => { const bar = row.querySelector('.gen-bar i'); if (bar) bar.classList.add('im-bar'); const thread = row.querySelector('.gen-thread i'); if (thread) thread.classList.add('im-thread'); });",
  "    onceIO(rows, (row) => { row.classList.add('im-in'); const bar = row.querySelector('.gen-bar i'); if (bar) bar.classList.add('im-in'); const thread = row.querySelector('.gen-thread i'); if (thread) thread.classList.add('im-in'); });",
  "    /* team photo band */",
  "    onceIO(mark('#jointeam'), (el) => el.classList.add('im-in'));",
  "  }",
  "",
].join("\n");

// ── SavaPass mobile rich intro (plan 004 follow-up, from the user's Higgsfield
//    mockup): a structured portrait intro — labeled badge pills + 3 feature columns
//    + the Sf. Sava church band, over a Higgsfield ambient orbital-rings video loop.
//    All injected here and gated <=760px so the DESKTOP intro is byte-for-byte
//    unchanged. Icons are inline stroke SVGs. Assets generated via Higgsfield MCP:
//    /imersiv/intro-ambient.mp4 (kling3_0_turbo) + /imersiv/church.webp (nano_banana).
const ICON = {
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3M18 18h3v3h-3"/>',
  user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c1-4 5-5 7-5s6 1 7 5"/>',
  seat: '<path d="M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4"/><path d="M3 11h18v4a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  chart: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10h4a1.5 1.5 0 010 3h-4"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 7-7 9-4-2-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  people: '<circle cx="9" cy="9" r="3"/><path d="M3 19c.5-3 3-4.5 6-4.5s5.5 1.5 6 4.5"/><path d="M16 9a3 3 0 010 5M17 14.5c2 .5 3.4 2 3.9 4.4"/>',
  bolt: '<path d="M13 3L5 13h5l-1 8 8-11h-5z"/>',
};
const mhiBadge = (ic, label, sub) =>
  `<span class="mhi-b"><svg class="mhi-bi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[ic]}</svg><span class="mhi-bt"><b>${label}</b><i>${sub}</i></span></span>`;
const mhiFeat = (ic, label, sub) =>
  `<div class="mhi-f"><span class="mhi-fi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[ic]}</svg></span><b>${label}</b><i>${sub}</i></div>`;

const MHI_AMBIENT = '<video class="mhi-ambient" autoplay muted loop playsinline preload="metadata" aria-hidden="true" src="/imersiv/intro-ambient.mp4"></video>';
const MHI_TOP = `<div class="mhi-row mhi-top">${mhiBadge('qr', 'QR Valid', 'Acces permis')}${mhiBadge('user', 'Utilizator', 'Identificat')}</div>`;
const MHI_BOTTOM =
  `<div class="mhi-row mhi-stat">${mhiBadge('seat', 'Locuri', 'Disponibile')}${mhiBadge('chart', 'Statistici', 'În timp real')}${mhiBadge('clock', 'Acces', 'Rapid')}</div>` +
  `<div class="mhi-row mhi-mid">${mhiBadge('qr', 'Scan OK', 'Cod recunoscut')}${mhiBadge('coin', 'Încasări', 'În timp real')}</div>` +
  `<div class="mhi-features">${mhiFeat('shield', 'Siguranță', 'Verificări rapide și sigure')}${mhiFeat('people', 'Organizare', 'Totul sub control, fără efort')}${mhiFeat('bolt', 'Eficiență', 'Flux optim, rezultate mai bune')}</div>` +
  '<div class="mhi-church"><img src="/imersiv/church.webp" alt="" loading="lazy" decoding="async"/></div>';

markupOut = markupOut
  .replace('<video class="intro-video"', MHI_AMBIENT + '\n  <video class="intro-video"')
  .replace('<div id="logo-stage">', MHI_TOP + '\n  <div id="logo-stage">')
  .replace('<div class="scrollhint"', MHI_BOTTOM + '\n  <div class="scrollhint"');

// Desktop: keep all mobile-intro extras hidden (intro unchanged). Mobile: structured column.
cssOut += '\n.mhi-ambient,.mhi-row,.mhi-features,.mhi-church{display:none;}\n@keyframes mhi-in{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}\n' +
  '@media(max-width:760px){' +
  '.intro{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:12px;padding:68px 15px 0;min-height:100svh;overflow:hidden;}' +
  '.engine-stage{display:none;}.scrollhint{display:none;}' +
  '.mhi-ambient{display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.5;z-index:0;pointer-events:none;mix-blend-mode:multiply;}' +
  '#logo-stage{margin:0;z-index:2;}.ll-wheel{width:clamp(112px,36vw,156px);}' +
  '.mhi-row{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;width:100%;max-width:362px;position:relative;z-index:2;}' +
  '.mhi-b{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.82);border:1px solid rgba(15,23,42,.08);border-radius:12px;padding:7px 11px;box-shadow:0 8px 22px rgba(15,23,42,.06);}' +
  '.mhi-bi{width:17px;height:17px;color:var(--cyan);flex:none;}' +
  '.mhi-bt{display:flex;flex-direction:column;align-items:flex-start;line-height:1.12;}' +
  '.mhi-b b{font-family:var(--f-mono);font-size:9px;letter-spacing:.07em;color:var(--ink);font-weight:700;text-transform:uppercase;}' +
  '.mhi-b i{font-family:var(--f-mono);font-size:7.5px;letter-spacing:.09em;color:var(--cyan);font-style:normal;text-transform:uppercase;}' +
  '.mhi-features{display:flex;justify-content:center;gap:8px;width:100%;max-width:384px;margin-top:4px;position:relative;z-index:2;}' +
  '.mhi-f{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;}' +
  '.mhi-fi{width:33px;height:33px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(0,167,232,.1);color:var(--cyan);}' +
  '.mhi-fi svg{width:17px;height:17px;}' +
  '.mhi-f b{font-family:var(--f-mono);font-size:9.5px;letter-spacing:.05em;color:var(--ink);text-transform:uppercase;}' +
  '.mhi-f i{font-style:normal;font-size:9.5px;line-height:1.25;color:var(--mut-l);}' +
  '.mhi-church{display:block;width:100vw;margin-top:auto;position:relative;z-index:1;}' +
  '.mhi-church img{width:100%;height:auto;-webkit-mask-image:linear-gradient(180deg,transparent,#000 44%);mask-image:linear-gradient(180deg,transparent,#000 44%);opacity:.9;}' +
  '.mhi-b,.mhi-f{animation:mhi-in .7s var(--e) both;}' +
  '.mhi-top .mhi-b:nth-child(2){animation-delay:.08s;}' +
  '.mhi-stat .mhi-b:nth-child(1){animation-delay:.16s;}.mhi-stat .mhi-b:nth-child(2){animation-delay:.22s;}.mhi-stat .mhi-b:nth-child(3){animation-delay:.28s;}' +
  '.mhi-mid .mhi-b:nth-child(1){animation-delay:.34s;}.mhi-mid .mhi-b:nth-child(2){animation-delay:.4s;}' +
  '.mhi-f:nth-child(1){animation-delay:.46s;}.mhi-f:nth-child(2){animation-delay:.52s;}.mhi-f:nth-child(3){animation-delay:.58s;}' +
  '}';

// ── write ───────────────────────────────────────────────────────────────────
fs.mkdirSync("app/_immersive", { recursive: true });
fs.mkdirSync("public/imersiv", { recursive: true });

const content =
  `// AUTO-GENERATED by web/scripts/extract-immersive.mjs from "SavaPass Immersive v3.html".\n` +
  `// Do NOT hand-edit. Re-run the script to regenerate.\n` +
  `// Edits vs source: font tokens -> next/font vars; assets/ -> /imersiv/; purchase CTAs -> <a href="__CTA_HREF__">.\n` +
  `/* eslint-disable */\n` +
  `export const IMMERSIVE_CSS = ${JSON.stringify(cssOut)};\n` +
  `export const IMMERSIVE_MARKUP = ${JSON.stringify(markupOut)};\n`;

// Fail loudly if a string transform silently no-opped (e.g. the v3 source changed and
// an anchor no longer matches) — otherwise we'd ship a half-patched bundle at exit 0.
const assert = (cond, msg) => { if (!cond) { console.error("[extract] ASSERT FAILED:", msg); process.exit(1); } };
assert(ctaCount === 3, `expected 3 CTAs rewired, got ${ctaCount}`);
assert(applyCount === 1, `expected 1 apply CTA rewired, got ${applyCount}`);
assert(engineOut !== engine, "engine transforms did not apply (engineOut === raw engine)");
assert(cssOut.includes(".mhi-b"), "mobile intro CSS (.mhi-b) missing from cssOut");
assert(markupOut.includes("mhi-row"), "mobile intro markup (mhi-row) not injected");
assert(markupOut.includes("__CTA_HREF__"), "CTA placeholder missing from markupOut");

fs.writeFileSync("app/_immersive/content.ts", content, "utf8");
fs.writeFileSync("public/imersiv/engine.js", engineOut, "utf8");
fs.writeFileSync("public/imersiv/engine-motion.mjs", motionOut, "utf8");

console.log("[extract] css chars      :", cssOut.length);
console.log("[extract] markup chars   :", markupOut.length);
console.log("[extract] engine chars   :", engineOut.length, "(was", engine.length + ")");
console.log("[extract] motion chars   :", motionOut.length, "(was", motion.length + ")");
console.log("[extract] CTAs rewired   :", ctaCount, "(expect 3)");
console.log("[extract] apply rewired   :", applyCount, "(expect 1)");
