export const BOARD_SHOWCASE_CSS = `
/* Shared club typography, compact proportions, and the original inset page grid. */
.sp-immersive-root .board-editorial {
  --bdr-backdrop: #020e1b;
  --bdr-paper: #f5f5f3;
  --bdr-muted: #b9cce6;
  --bdr-cyan: #00c4e8;
  --bdr-line: #365976;
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  padding: 0;
  border-block: 1px solid var(--bdr-line);
  background: var(--bdr-backdrop);
  color: var(--bdr-paper);
  font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
  scroll-margin-top: 72px;
  overflow-anchor: none;
}
.board-editorial *, .board-editorial *::before, .board-editorial *::after { box-sizing: border-box; }
.board-editorial .bdr-inset { width: calc(100% - 120px); max-width: 1080px; margin-inline: auto; }
.board-editorial h2, .board-editorial h3 { margin: 0; font-family: var(--font-brand), var(--font-sans); font-variation-settings: "FLAR" 34, "VOLM" 12; font-weight: 720; letter-spacing: -.03em; line-height: 1.08; text-wrap: balance; }
.board-editorial p, .board-editorial figure { margin: 0; }
.board-editorial a { color: inherit; text-decoration: none; touch-action: manipulation; }
.board-editorial button { font: inherit; color: inherit; cursor: pointer; touch-action: manipulation; }
.board-editorial :is(button, a, [tabindex]):focus-visible { outline: 2px solid var(--bdr-cyan); outline-offset: 5px; }
.board-editorial [hidden] { display: none !important; }
/* The original landing scene moved Join up by 31px, covering gallery captions. */
.sp-immersive-root #board + #join { translate: none; }
/* A continuous blue canvas, with the existing subtle ticket-hero footage. */
.board-editorial .bdr-ambient { position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none;
  background: radial-gradient(ellipse at 15% -8%,#072644 0,transparent 39%),
              radial-gradient(ellipse at 86% 34%,rgba(0,70,115,.14),transparent 44%),
              radial-gradient(ellipse at 46% 115%,#041e36 0,transparent 56%),
              linear-gradient(135deg,#020e1b,#00101d 65%,#021322); }
.board-editorial .bdr-ambient::after { content: ""; position: absolute; top: 0; right: 0; width: 340px; height: 390px;
  background-image: linear-gradient(rgba(0,165,227,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,165,227,.1) 1px,transparent 1px);
  background-size: 56px 56px; mask-image: radial-gradient(ellipse at top right,#000,transparent 74%); }
.board-editorial .bdr-orbits { position: absolute; inset: 0; width: 100%; height: 100%; stroke: rgba(0,156,226,.1); stroke-width: 1; }
.board-editorial .bdr-orbits circle { fill: #00bcec; stroke: none; }
.board-editorial .bdr-ambient video { position: absolute; inset: -6%; width: 112%; max-width: none; height: 112%; object-fit: cover;
  opacity: .16; filter: saturate(.9) contrast(1.02); mix-blend-mode: screen; pointer-events: none;
  -webkit-mask-image: radial-gradient(130% 100% at 50% 38%,#000 0,#000 42%,transparent 80%);
  mask-image: radial-gradient(130% 100% at 50% 38%,#000 0,#000 42%,transparent 80%); }
.board-editorial .bdr-ambient-toggle { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 8px 0 8px 12px; border: 0; background: none; color: var(--bdr-muted); font-size: 11px; font-weight: 500; letter-spacing: 0; text-transform: none; white-space: nowrap; }
.board-editorial .bdr-ambient-toggle:hover { color: var(--bdr-cyan); }
.board-editorial .bdr-ambient-toggle svg { width: 14px; height: 14px; }
.board-editorial .bdr-ambient-toggle[aria-pressed="true"] .bdr-play-icon, .board-editorial .bdr-ambient-toggle[aria-pressed="false"] .bdr-pause-icon { display: none; }
.board-editorial .bdr-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.board-editorial .bdr-team {
  padding-block: clamp(36px, 4vw, 56px) 16px;
  overflow: clip;
  background: transparent;
}
.board-editorial .bdr-layout { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: auto 1fr; column-gap: clamp(32px, 4vw, 48px); align-items: start; }
.board-editorial .bdr-heading { grid-column: 1; grid-row: 1; container-type: inline-size; }
.board-editorial .bdr-eyebrow { display: flex; align-items: center; gap: 24px; font-size: 10px; line-height: 1.5; font-weight: 550; letter-spacing: .28em; text-transform: uppercase; color: var(--bdr-muted); }
.board-editorial .bdr-eyebrow::after { content: ""; width: 52px; height: 1px; background: var(--bdr-cyan); }
.board-editorial .bdr-brand-eyebrow { margin-bottom: 16px; }
.board-editorial .bdr-brand-eyebrow::after { width: 70px; }
.board-editorial #board-title { font-size: clamp(2rem, 12cqi, 4rem); color: var(--bdr-paper); white-space: nowrap; }
.board-editorial #board-title > span { color: var(--cyan, var(--bdr-cyan)); }
.board-editorial .bdr-team-intro { max-width: 52ch; margin-top: 16px; font-size: clamp(16px, 1.4vw, 18px); line-height: 1.5; color: var(--bdr-muted); }
.board-editorial .bdr-member-copy { grid-column: 1; grid-row: 2; min-width: 0; width: 100%; max-width: 480px; padding: 48px 0 0; }
.board-editorial .bdr-profiles { position: relative; container-type: inline-size; }
.board-editorial .bdr-profile { min-height: 0; }
.board-editorial .bdr-member-name { font-size: clamp(2rem, 11cqi, 3.375rem); font-weight: 650; line-height: 1.08; white-space: nowrap; }
.board-editorial .bdr-member-name span { display: inline; }
.board-editorial .bdr-member-name.bdr-long-name { font-size: clamp(1.25rem, 5.7cqi, 1.85rem); line-height: 1.25; padding-block: 7px; }
.board-editorial .bdr-member-summary { max-width: 38ch; margin-top: 12px; font-family: var(--font-board-handwriting), cursive; font-size: 24px; font-weight: 700; font-style: italic; line-height: 1.3; color: var(--bdr-muted); text-wrap: pretty; }
.board-editorial .bdr-showcase { position: relative; grid-column: 2; grid-row: 1 / 3; min-width: 0; width: 100%; max-width: 456px; justify-self: start; translate: 24px 0; }
.board-editorial .bdr-showcase-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; min-height: 20px; margin-bottom: 16px; }
.board-editorial .bdr-team-label { font-size: 11px; line-height: 1.5; font-weight: 600; color: var(--bdr-muted); }
.board-editorial .bdr-team-label span { font-weight: 400; }
.board-editorial .bdr-year { font-size: 11px; line-height: 1.5; letter-spacing: .08em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.board-editorial .bdr-portrait-stack { position: relative; height: clamp(300px, 27vw, 360px); perspective: 1600px; touch-action: pan-y pinch-zoom; }
.board-editorial [data-board-portrait-mount] { position: absolute; inset: 0; }
.board-editorial .bdr-portrait-stack:has([data-image-stack]) > .bdr-portrait-card { display: none; }
/* Match the enhanced stack before React mounts, including its rightward inset. */
.board-editorial .bdr-portrait-card { position: absolute; top: 24px; left: 0; right: 0; width: auto; height: calc(100% - 24px); aspect-ratio: 5 / 7; margin-inline: auto; translate: var(--bdr-portrait-offset, 24px) 0; overflow: hidden; border: 1px solid var(--bdr-line); border-radius: 14px; background: #14212a; transform-origin: 50% 100%; transition: transform .45s cubic-bezier(.22,.61,.36,1), opacity .45s ease; }
.board-editorial .bdr-portrait-card img { display: block; width: 100%; height: 100%; object-fit: cover; }
.board-editorial .bdr-portrait-card[data-portrait-rotate="left"] img { position: absolute; top: 50%; left: 50%; width: 140%; height: calc(100% / 1.4); max-width: none; transform: translate(-50%, -50%) rotate(-90deg); }
.board-editorial .bdr-empty-portrait { display: block; width: 100%; height: 100%; }
.board-editorial .bdr-portrait-card[data-slot="0"] { z-index: 4; }
.board-editorial .bdr-portrait-card[data-slot="1"] { z-index: 3; transform: translate(-12px,-8px) rotate(-5deg); }
.board-editorial .bdr-portrait-card[data-slot="2"] { z-index: 2; transform: translate(-24px,-16px) rotate(-8deg); }
.board-editorial .bdr-portrait-card[data-slot="3"] { z-index: 1; transform: translate(-36px,-24px) rotate(-11deg); }
.board-editorial .bdr-portrait-card[data-slot="4"] { z-index: 0; transform: translate(-36px,-24px) rotate(-11deg); opacity: 0; visibility: hidden; }
.board-editorial .bdr-carousel-controls { display: grid; grid-template-columns: 48px minmax(0, 1fr) 48px; align-items: center; gap: 12px; width: 100%; max-width: 360px; margin: 32px auto 0; }
.board-editorial .bdr-carousel-details { display: grid; align-content: center; gap: 4px; min-width: 0; min-height: 4.5rem; text-align: center; }
.board-editorial .bdr-current-role { min-width: 0; color: var(--bdr-paper); font-family: var(--font-brand), var(--font-sans); font-variation-settings: "FLAR" 34, "VOLM" 12; text-align: center; font-size: clamp(1.125rem, 1.4vw, 1.25rem); font-weight: 650; line-height: 1.2; letter-spacing: -.015em; text-wrap: balance; }
.board-editorial .bdr-member-position { color: var(--bdr-muted); font-size: .8125rem; font-weight: 500; line-height: 1.4; letter-spacing: .04em; font-variant-numeric: tabular-nums; }
.board-editorial .bdr-carousel-controls .bdr-arrow { flex: none; width: 48px; height: 48px; border-radius: 50%; }
.board-editorial .bdr-carousel-controls .bdr-arrow svg { width: 22px; height: 22px; }
.board-editorial .bdr-gallery { display: flex; flex: 1; flex-direction: column; padding-top: 8px; background: transparent; }
.board-editorial .bdr-gallery-ending { display: flex; flex: 1; align-items: flex-start; justify-content: center; min-height: clamp(112px, 16svh, 176px); padding: 20px 0 24px; }
.board-editorial .bdr-scroll-cue { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-width: 44px; min-height: 44px; color: var(--bdr-muted); font-family: var(--f-mono), ui-monospace, monospace; font-size: 10px; font-weight: 500; line-height: 1.2; letter-spacing: .24em; text-transform: uppercase; }
.board-editorial .bdr-scroll-cue svg { flex: none; width: 20px; height: 24px; color: var(--bdr-cyan); transition: transform .2s ease; }
.board-editorial .bdr-scroll-cue:hover, .board-editorial .bdr-scroll-cue:focus-visible { color: var(--bdr-paper); }
.board-editorial .bdr-scroll-cue:hover svg { transform: translateY(3px); }
.board-editorial .bdr-gallery-heading { margin-bottom: 20px; }
.board-editorial #board-gallery-title { font-size: clamp(1.875rem, 3.2vw, 2.625rem); }
.board-editorial #board-gallery-title > span { color: var(--bdr-cyan); }
.board-editorial .bdr-intro { max-width: 440px; margin: 0; color: var(--bdr-muted); font-size: 15px; line-height: 1.5; text-wrap: pretty; }
.board-editorial .bdr-text-action { display: inline-flex; justify-content: center; align-items: center; flex: none; gap: 16px; width: fit-content; min-height: 44px; padding: 7px 0; border: 0; border-bottom: 1px solid var(--bdr-line); border-radius: 0; background: none; font-size: 14px; font-weight: 600; line-height: 1.5; }
.board-editorial .bdr-text-action:hover { color: var(--bdr-cyan); }
.board-editorial .bdr-text-action svg { width: 28px; height: 22px; color: var(--bdr-cyan); transition: transform .2s ease; }
.board-editorial .bdr-text-action:hover svg { transform: translateX(4px); }
.board-editorial .bdr-gallery-heading > .bdr-text-action { position: relative; margin-bottom: 6px; }
.board-editorial .bdr-gallery-heading > .bdr-text-action::after { content: ""; position: absolute; bottom: -1px; left: 0; width: 44px; height: 2px; background: var(--bdr-cyan); }
.board-editorial .bdr-filmstrip { position: relative; width: calc(100% - 120px); max-width: 1080px; margin-inline: auto; container-type: inline-size; }
.board-editorial .bdr-filmstrip:has([data-image-auto-slider]) .bdr-gallery-fallback { display: none; }
.board-editorial .bdr-preview { display: flex; gap: 12px; height: calc((100cqi - 48px) / 4); overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory; scrollbar-width: none; }
.board-editorial .bdr-preview::-webkit-scrollbar { display: none; }
.board-editorial .bdr-preview-photo { display: block; position: relative; flex: 0 0 18%; min-width: 0; overflow: hidden; border: 1px solid var(--bdr-line); border-radius: 10px; background: #0e1b27; cursor: zoom-in; scroll-snap-align: start; }
.board-editorial .bdr-preview-lead { flex-basis: 39%; }
.board-editorial .bdr-preview-photo:nth-child(3) { flex-basis: 14%; }
.board-editorial .bdr-preview-photo img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .45s cubic-bezier(.22,.61,.36,1); }
.board-editorial .bdr-preview-caption { position: absolute; inset: auto 0 0; padding: 32px 12px 12px; background: linear-gradient(transparent, rgba(2,15,25,.88)); color: #fff; font-size: 11px; font-weight: 600; line-height: 1.4; pointer-events: none; }
.board-editorial .bdr-preview-photo:hover img { transform: scale(1.035); }
.board-editorial .bdr-preview-photo:focus-visible { outline-offset: -4px; }
.board-editorial .bdr-strip-next.bdr-arrow { position: absolute; right: 25px; top: calc(50% - 22px); width: 44px; height: 44px; border: 1px solid #c4cfd6; border-radius: 50%; background: rgba(2,15,25,.65); }
.board-editorial .bdr-strip-next.bdr-arrow svg { width: 24px; }
.board-editorial .bdr-signoff { display: flex; align-items: center; gap: 24px; padding-block: 8px 16px; color: #9aaebc; font-size: 9px; letter-spacing: .16em; text-transform: uppercase; }
.board-editorial .bdr-signoff i { flex: 1; height: 1px; background: var(--bdr-line); }
.board-editorial .bdr-lightbox { position: fixed; inset: 0; width: 100%; max-width: none; height: 100dvh; max-height: none; margin: 0; padding: max(16px,env(safe-area-inset-top)) max(32px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(32px,env(safe-area-inset-left)); border: 0; background: transparent; color: var(--bdr-paper); overflow: hidden; }
.board-editorial .bdr-lightbox[open] { display: grid; grid-template-rows: auto minmax(0,1fr); gap: 20px; }
.board-editorial .bdr-lightbox::backdrop { background: transparent; }
.board-editorial .bdr-lightbox-scrim { position: fixed; inset: 0; z-index: -1; background: var(--bdr-backdrop); transition: opacity .38s ease; }
.board-editorial .bdr-lightbox.is-closing .bdr-lightbox-scrim { opacity: 0; }
.board-editorial .bdr-lightbox-bar { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 48px; }
.board-editorial .bdr-lightbox-bar h2 { font-size: 24px; }
.board-editorial .bdr-lightbox-actions { display: flex; align-items: center; gap: 32px; }
.board-editorial .bdr-close { display: inline-flex; gap: 16px; align-items: center; justify-content: center; min-width: 44px; min-height: 48px; padding: 0; border: 0; background: none; font-size: 15px; }
.board-editorial .bdr-close > :last-child { font-size: 32px; font-weight: 300; line-height: 1; }
.board-editorial .bdr-close:hover, .board-editorial .bdr-arrow:hover { color: var(--bdr-cyan); }
.board-editorial .bdr-collection { grid-area: 2 / 1; display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); align-content: start; align-items: start; gap: 28px 20px; overflow-y: auto; overscroll-behavior: contain; padding: 8px 6px 32px; scrollbar-width: thin; scrollbar-color: var(--bdr-muted) transparent; }
.board-editorial .bdr-collection-photo { min-width: 0; cursor: zoom-in; }
.board-editorial .bdr-collection-photo img { display: block; width: 100%; height: auto; background: #0e1b27; }
.board-editorial .bdr-collection-photo figcaption { margin-top: 10px; color: var(--bdr-muted); font-size: 14px; line-height: 1.4; }
.board-editorial .bdr-viewer { grid-area: 2 / 1; display: grid; grid-template-rows: minmax(0,1fr) auto; gap: 12px; min-height: 0; }
.board-editorial .bdr-viewer.is-returning { visibility: hidden; pointer-events: none; }
.board-editorial .bdr-lightbox-stage { min-height: 0; min-width: 0; position: relative; touch-action: pan-y pinch-zoom; }
.board-editorial .bdr-lightbox-image { display: block; width: 100%; height: 100%; object-fit: contain; }
.board-editorial .bdr-lightbox-footer { display: grid; grid-template-columns: 48px minmax(0,1fr) 48px; align-items: start; gap: 20px; }
.board-editorial .bdr-photo-caption { min-width: 0; text-align: center; font-size: 16px; line-height: 1.4; }
.board-editorial .bdr-lightbox-count { display: block; color: var(--bdr-muted); font-size: 13px; font-variant-numeric: tabular-nums; padding-top: 3px; }
.board-editorial .bdr-photo-feedback { min-height: 38px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 16px; }
.board-editorial .bdr-photo-status { color: var(--bdr-muted); font-size: 13px; }
.board-editorial .bdr-photo-feedback button { min-height: 38px; font-size: 13px; }
.board-editorial .bdr-arrow { display: grid; place-items: center; width: 48px; height: 48px; padding: 0; border: 1px solid var(--bdr-line); border-radius: 0; background: none; }
.board-editorial .bdr-arrow svg { width: 28px; height: 22px; }
.board-editorial .bdr-arrow-prev svg { transform: rotate(180deg); }
.board-editorial .bdr-photo-flight { position: fixed; inset: 0; z-index: 3; pointer-events: none; }
.board-editorial .bdr-photo-flight img { position: absolute; top: 0; left: 0; max-width: none; object-fit: fill; transform-origin: 0 0; }
@media (max-width: 1100px) {
  .board-editorial .bdr-inset, .board-editorial .bdr-filmstrip { width: calc(100% - 64px); }
  .board-editorial .bdr-collection { grid-template-columns: repeat(3,minmax(0,1fr)); }
}
@media (max-width: 820px) {
  .board-editorial .bdr-inset, .board-editorial .bdr-filmstrip { width: calc(100% - 40px); max-width: 520px; }
  .sp-immersive-root .board-editorial { scroll-margin-top: 88px; }
  .board-editorial .bdr-team { padding-top: 28px; padding-bottom: 24px; }
  .board-editorial .bdr-layout { grid-template-columns: minmax(0,1fr); gap: 0; }
  .board-editorial .bdr-heading { grid-column: 1; grid-row: 1; }
  .board-editorial .bdr-eyebrow { font-size: 10px; }
  .board-editorial .bdr-brand-eyebrow { margin-bottom: 16px; }
  .board-editorial #board-title { font-size: clamp(1.875rem, 11cqi, 3.25rem); }
  .board-editorial .bdr-team-intro { margin-top: 12px; font-size: 16px; }
  /* Keep portrait, member details, and thumb controls in one visual sequence. */
  .board-editorial .bdr-showcase { display: contents; }
  .board-editorial .bdr-showcase-meta { gap: 12px; margin-bottom: 12px; }
  .board-editorial .bdr-year { font-size: 10px; }
  .board-editorial .bdr-portrait-stack { --bdr-portrait-offset: 16px; grid-column: 1; grid-row: 2; width: 100%; max-width: 360px; justify-self: center; margin-top: 20px; height: clamp(292px, 86vw, 344px); }
  .board-editorial .bdr-portrait-card { border-radius: 12px; }
  .board-editorial .bdr-carousel-controls { grid-column: 1; grid-row: 4; grid-template-columns: 48px minmax(0, 1fr) 48px; max-width: 340px; margin-top: 12px; gap: 12px; }
  .board-editorial .bdr-carousel-details { min-height: 4rem; }
  .board-editorial .bdr-current-role { font-size: 1rem; }
  .board-editorial .bdr-carousel-controls .bdr-arrow { width: 48px; height: 48px; -webkit-tap-highlight-color: transparent; }
  .board-editorial .bdr-carousel-controls .bdr-arrow:active { background: rgba(0,196,232,.14); border-color: var(--bdr-cyan); }
  .board-editorial .bdr-member-copy { grid-column: 1; grid-row: 3; padding: 20px 0 0; max-width: none; text-align: center; }
  .board-editorial .bdr-profiles { min-height: 112px; padding-top: 0; border-top: 0; }
  .board-editorial .bdr-member-name { font-size: clamp(1.625rem, 8.5cqi, 2rem); line-height: 1.15; white-space: normal; }
  .board-editorial .bdr-member-name span { display: inline; }
  .board-editorial .bdr-member-name.bdr-long-name { font-size: clamp(1.25rem, 6cqi, 1.5rem); padding-block: 0; }
  .board-editorial .bdr-member-summary { max-width: 32ch; margin: 10px auto 0; font-size: 22px; line-height: 1.35; }
  .board-editorial .bdr-gallery { padding-top: 8px; }
  .board-editorial .bdr-gallery-ending { min-height: 88px; padding-block: 20px max(20px, env(safe-area-inset-bottom)); }
  .board-editorial .bdr-scroll-cue { font-size: 11px; letter-spacing: .18em; }
  .board-editorial #board-gallery-title { font-size: 28px; }
  .board-editorial .bdr-gallery-heading { margin-bottom: 16px; }
  .board-editorial .bdr-gallery-heading > .bdr-text-action { margin-top: 14px; }
  .board-editorial .bdr-intro { margin-top: 12px; font-size: 14px; }
  .board-editorial .bdr-preview { gap: 12px; height: 220px; }
  .board-editorial .bdr-preview-photo { flex-basis: 42%; }
  .board-editorial .bdr-preview-lead { flex-basis: 78%; }
  .board-editorial .bdr-preview-photo:nth-child(3) { flex-basis: 38%; }
  .board-editorial .bdr-signoff { padding-block: 24px; gap: 16px; font-size: 8px; letter-spacing: .12em; }
  .board-editorial .bdr-lightbox { padding: max(10px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left)); }
  .board-editorial .bdr-lightbox[open] { gap: 12px; }
  .board-editorial .bdr-lightbox-bar { flex-wrap: wrap; gap: 8px; }
  .board-editorial .bdr-lightbox-bar h2 { font-size: 25px; }
  .board-editorial .bdr-lightbox-actions { gap: 20px; }
  .board-editorial .bdr-lightbox[data-view="photo"] .bdr-lightbox-bar h2 { display: none; }
  .board-editorial .bdr-lightbox[data-view="photo"] .bdr-lightbox-actions { width: 100%; justify-content: space-between; }
  .board-editorial .bdr-close { gap: 8px; }
  .board-editorial .bdr-collection { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 24px 16px; padding: 5px 4px 24px; }
  .board-editorial .bdr-collection-photo figcaption { font-size: 13px; }
  .board-editorial .bdr-lightbox-footer { gap: 8px; }
  .board-editorial .bdr-photo-feedback { min-height: 44px; }
}
@media (max-width: 820px) and (max-height: 500px) and (orientation: landscape) {
  .board-editorial .bdr-portrait-stack { height: 260px; }
}
@media (max-width: 380px) {
  .board-editorial .bdr-profiles { min-height: 132px; }
}
@media (max-width: 480px) {
  .board-editorial .bdr-preview-photo { flex-basis: 60%; }
  .board-editorial .bdr-preview-lead { flex-basis: 88%; }
  .board-editorial .bdr-preview-photo:nth-child(3) { flex-basis: 52%; }
  .board-editorial .bdr-signoff { flex-wrap: wrap; justify-content: space-between; }
  .board-editorial .bdr-signoff i { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .board-editorial .bdr-ambient-toggle { display: none; }
  .board-editorial *, .board-editorial *::before, .board-editorial *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
`;
