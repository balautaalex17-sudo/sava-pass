import { escapeHtml } from "@/lib/escape-html";
import { clubImage } from "./board-images";
import { CLUB_PHOTOS, CLUB_SLIDER_PHOTOS } from "./board-gallery-data";

const arrow = '<svg viewBox="0 0 40 24" fill="none" aria-hidden="true"><path d="M2 12h35M27 3l10 9-10 9" stroke="currentColor" stroke-width="1.5"/></svg>';

export function renderBoardGallery() {
  const preview = CLUB_SLIDER_PHOTOS.map(photo => {
    const cropRatio = Math.max(photo.aspectRatio, photo.width / photo.height);
    const sizes = `(max-width: 820px) ${Math.ceil(260 * cropRatio)}px, ${Math.ceil(310 * cropRatio)}px`;
    return `<a class="bdr-preview-photo" style="aspect-ratio:${photo.aspectRatio};flex-basis:auto;height:100%" href="${photo.src}" data-gallery-photo="${photo.src}"
      aria-haspopup="dialog" aria-label="Deschide fotografia: ${escapeHtml(photo.caption)}">
      ${clubImage(photo, sizes, { position: photo.position })}
    </a>`;
  });

  return `<section class="bdr-gallery" aria-labelledby="board-gallery-title">
    <div class="bdr-inset">
      <header class="bdr-gallery-heading">
        <div><h3 id="board-gallery-title">Din viața clubului<span>.</span></h3></div>
      </header>
    </div>
    <div class="bdr-filmstrip">
      <div data-board-gallery-slider></div>
      <div class="bdr-preview bdr-gallery-fallback" id="board-gallery-preview" role="region" aria-label="Fotografii din viața clubului" tabindex="0" data-lenis-prevent-horizontal>${preview.join("")}</div>
    </div>
    <div class="bdr-gallery-ending bdr-inset">
      <a class="bdr-scroll-cue" href="#join" aria-label="Derulează la secțiunea Devino membru">
        <span>Derulează</span>
        <svg viewBox="0 0 24 28" fill="none" aria-hidden="true"><path d="M12 2v22m-6-6 6 6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>
    </div>
    <dialog class="bdr-lightbox" id="board-gallery-dialog" aria-labelledby="board-gallery-dialog-title" data-view="collection" data-lenis-prevent>
      <div class="bdr-lightbox-scrim" aria-hidden="true"></div>
      <header class="bdr-lightbox-bar">
        <h2 id="board-gallery-dialog-title">Din viața clubului.</h2>
        <div class="bdr-lightbox-actions">
          <button type="button" class="bdr-text-action" data-gallery-collection hidden>Toate fotografiile</button>
          <button type="button" class="bdr-close" data-gallery-close aria-label="Închide galeria" autofocus><span>Închide</span><span aria-hidden="true">×</span></button>
        </div>
      </header>
      <div class="bdr-collection" aria-label="Toate fotografiile clubului" data-lenis-prevent>
        ${CLUB_PHOTOS.map(photo => `<a class="bdr-collection-photo" href="${photo.src}" data-gallery-photo="${photo.src}" data-caption="${escapeHtml(photo.caption)}"
          aria-label="Deschide fotografia: ${escapeHtml(photo.caption)}" aria-haspopup="dialog">
          <figure>${clubImage(photo, "(max-width: 600px) calc(50vw - 30px), (max-width: 1024px) 30vw, 300px", { deferred: true })}
          </figure>
        </a>`).join("")}
      </div>
      <div class="bdr-viewer" hidden>
        <div class="bdr-lightbox-stage"><img class="bdr-lightbox-image" alt="" draggable="false"/></div>
        <footer class="bdr-lightbox-footer">
          <button type="button" class="bdr-arrow bdr-arrow-prev" data-lightbox-step="-1" aria-label="Fotografia anterioară">${arrow}</button>
          <div class="bdr-photo-caption">
            <p id="board-photo-caption"></p><span class="bdr-lightbox-count" aria-live="polite" aria-atomic="true"></span>
            <div class="bdr-photo-feedback"><p class="bdr-photo-status" role="status"></p><button type="button" class="bdr-text-action" data-gallery-retry hidden>Reîncearcă</button></div>
          </div>
          <button type="button" class="bdr-arrow" data-lightbox-step="1" aria-label="Fotografia următoare">${arrow}</button>
        </footer>
      </div>
    </dialog>
  </section>`;
}

