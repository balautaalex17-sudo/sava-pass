import { canReturnTo, createPhotoTransition, photoOrigin, type PhotoOrigin } from "./photo-transition";

/** The homepage preview and collection share one native dialog and one image index. */
export function initializeBoardGallery(board: HTMLElement) {
  const gallery = board.querySelector<HTMLElement>(".bdr-gallery");
  const dialog = gallery?.querySelector<HTMLDialogElement>(".bdr-lightbox");
  if (!gallery || !dialog) return () => {};
  const modal = dialog;
  const collection = modal.querySelector<HTMLElement>(".bdr-collection")!;
  const viewer = modal.querySelector<HTMLElement>(".bdr-viewer")!;
  const image = modal.querySelector<HTMLImageElement>(".bdr-lightbox-image")!;
  const caption = modal.querySelector<HTMLElement>("#board-photo-caption")!;
  const status = modal.querySelector<HTMLElement>(".bdr-photo-status")!;
  const retry = modal.querySelector<HTMLButtonElement>("[data-gallery-retry]")!;
  const count = modal.querySelector<HTMLElement>(".bdr-lightbox-count")!;
  const collectionButton = modal.querySelector<HTMLButtonElement>("[data-gallery-collection]")!;
  const closeButton = modal.querySelector<HTMLButtonElement>("[data-gallery-close]")!;
  const photos = Array.from(collection.querySelectorAll<HTMLAnchorElement>("[data-gallery-photo]"));
  const events = new AbortController();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const transition = createPhotoTransition(modal, reduced);
  let selected = 0;
  let view: "collection" | "photo" = "collection";
  let origin: PhotoOrigin | null = null;
  let pageTrigger: HTMLElement | null = null;
  let collectionScroll = 0;
  let revision = 0;
  let closing = false;
  let destroyed = false;
  let pending: HTMLImageElement | null = null;
  let pointerStart: { x: number; y: number } | null = null;
  let unlock: (() => void) | null = null;

  // Image.width/height report CSS layout pixels, not the authored aspect ratio.
  function photoDimensions(): [number, number] {
    return [Number(image.getAttribute("width")), Number(image.getAttribute("height"))];
  }

  function lockPage() {
    if (unlock) return;
    const x = scrollX, y = scrollY;
    const style = document.body.style;
    const properties = ["position", "top", "left", "width", "overflow"] as const;
    const saved = properties.map(key => [key, style.getPropertyValue(key), style.getPropertyPriority(key)] as const);
    const bodyWidth = document.body.getBoundingClientRect().width;
    const wasStopped = window.__lenis?.isStopped ?? false;
    window.__lenis?.stop?.();
    style.position = "fixed";
    style.top = `-${y}px`;
    style.left = `-${x}px`;
    style.width = `${bodyWidth}px`;
    style.overflow = "hidden";
    unlock = () => {
      saved.forEach(([key, value, priority]) => value ? style.setProperty(key, value, priority) : style.removeProperty(key));
      window.scrollTo({ top: y, left: x, behavior: "instant" });
      window.__lenis?.scrollTo?.(y, { immediate: true, force: true });
      if (!wasStopped) window.__lenis?.start?.();
      unlock = null;
    };
  }

  function abortImage() {
    revision++;
    if (pending) {
      pending.onload = null;
      pending.onerror = null;
      pending.removeAttribute("src");
      pending = null;
    }
  }

  function loadFullImage() {
    abortImage();
    const ticket = revision;
    const photo = photos[selected];
    image.setAttribute("aria-busy", "true");
    status.textContent = "Se încarcă fotografia…";
    retry.hidden = true;
    const full = new Image();
    pending = full;
    full.onload = () => {
      if (ticket !== revision || destroyed || !modal.open) return;
      image.src = full.src;
      image.hidden = false;
      image.setAttribute("aria-busy", "false");
      status.textContent = "";
      pending = null;
    };
    full.onerror = () => {
      if (ticket !== revision || destroyed || !modal.open) return;
      image.setAttribute("aria-busy", "false");
      status.textContent = "Fotografia nu s-a încărcat.";
      retry.hidden = false;
      pending = null;
    };
    full.src = photo.href;
  }

  function setView(next: typeof view) {
    view = next;
    modal.dataset.view = view;
    collection.hidden = view !== "collection";
    viewer.hidden = view !== "photo";
    collectionButton.hidden = view !== "photo";
    if (view === "photo") modal.setAttribute("aria-describedby", "board-photo-caption");
    else modal.removeAttribute("aria-describedby");
  }

  function showPhoto(index: number, from: PhotoOrigin | null = null) {
    if (closing) return;
    transition.cancel();
    selected = (index + photos.length) % photos.length;
    if (from) origin = from;
    const photo = photos[selected];
    const thumbnail = photo.querySelector("img")!;
    const source = from?.element.querySelector("img");
    if (view === "collection") collectionScroll = collection.scrollTop;
    setView("photo");
    image.hidden = false;
    image.alt = thumbnail.alt;
    image.width = Number(thumbnail.getAttribute("width"));
    image.height = Number(thumbnail.getAttribute("height"));
    // A small version stays visible while the requested full image loads.
    const small = (thumbnail.dataset.srcset || thumbnail.srcset).split(",")[0]?.trim().split(" ")[0];
    image.src = source?.currentSrc || thumbnail.currentSrc || small || thumbnail.dataset.src!;
    caption.textContent = photo.dataset.caption!;
    count.textContent = `${selected + 1} / ${photos.length}`;
    loadFullImage();
    void transition.run(from, image, ...photoDimensions());
  }

  function hydrateCollection() {
    collection.querySelectorAll<HTMLImageElement>("img[data-src]").forEach(thumbnail => {
      thumbnail.srcset = thumbnail.dataset.srcset ?? "";
      thumbnail.src = thumbnail.dataset.src!;
      delete thumbnail.dataset.src;
      delete thumbnail.dataset.srcset;
    });
  }

  function open(trigger: HTMLElement, photo?: HTMLAnchorElement) {
    if (modal.open || closing) return;
    pageTrigger = trigger;
    origin = photo ? photoOrigin(photo) : null;
    lockPage();
    modal.classList.remove("is-closing");
    setView(photo ? "photo" : "collection");
    modal.showModal();
    if (photo) showPhoto(photos.findIndex(item => item.dataset.galleryPhoto === photo.dataset.galleryPhoto), origin);
    else {
      hydrateCollection();
      collection.scrollTop = collectionScroll;
    }
    closeButton.focus({ preventScroll: true });
  }

  async function showCollection() {
    if (closing) return;
    transition.cancel();
    abortImage();
    const ticket = revision;
    const from = origin;
    const id = photos[selected].dataset.galleryPhoto!;
    const canUseCollection = from?.element.closest(".bdr-collection");
    // Measure the mounted grid at its saved scroll position before returning.
    setView("collection");
    hydrateCollection();
    collection.scrollTop = collectionScroll;
    if (canUseCollection && canReturnTo(from, id)) {
      // The viewer remains laid out only while its photograph flies back.
      viewer.hidden = false;
      viewer.classList.add("is-returning");
      await transition.run(from, image, ...photoDimensions(), true);
      viewer.classList.remove("is-returning");
      if (ticket === revision) viewer.hidden = true;
    }
    if (destroyed || !modal.open || view !== "collection") return;
    const destination = photos[selected];
    if (canUseCollection) destination.focus({ preventScroll: true });
    else { destination.scrollIntoView({ block: "nearest" }); destination.focus({ preventScroll: true }); }
  }

  function restorePage() {
    transition.cancel();
    abortImage();
    closing = false;
    pointerStart = null;
    modal.classList.remove("is-closing");
    unlock?.();
    if (!destroyed && pageTrigger?.isConnected) pageTrigger.focus({ preventScroll: true });
  }

  async function close() {
    if (!modal.open || closing) return;
    closing = true;
    abortImage();
    modal.classList.add("is-closing");
    if (view === "photo") {
      // A navigated image, hidden thumbnail or changed viewport must fade.
      const destination = origin && !origin.element.closest("dialog") && canReturnTo(origin, photos[selected].dataset.galleryPhoto!) ? origin : null;
      await transition.run(destination, image, ...photoDimensions(), true);
    }
    if (!destroyed && modal.open) modal.close();
  }

  gallery.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const photo = event.target.closest<HTMLAnchorElement>("[data-gallery-photo]");
    if (photo && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      if (modal.contains(photo)) {
        showPhoto(photos.indexOf(photo), photoOrigin(photo));
        closeButton.focus({ preventScroll: true });
      } else {
        // Loop copies are decorative to assistive technology. Return focus to
        // the visible gallery region instead of their aria-hidden duplicate.
        const trigger = photo.closest("[data-slider-copy]")
          ? gallery.querySelector<HTMLElement>("[data-slider-viewport]") ?? photo : photo;
        open(trigger, photo);
      }
    }
    if (event.target.closest("[data-gallery-open]")) open(event.target.closest<HTMLElement>("[data-gallery-open]")!);
    if (event.target.closest("[data-gallery-close]")) void close();
    if (event.target.closest("[data-gallery-collection]")) void showCollection();
    if (event.target.closest("[data-gallery-retry]")) loadFullImage();
    const step = event.target.closest<HTMLElement>("[data-lightbox-step]");
    if (step) showPhoto(selected + Number(step.dataset.lightboxStep));
  }, { signal: events.signal });

  modal.addEventListener("cancel", event => { event.preventDefault(); void close(); }, { signal: events.signal });
  modal.addEventListener("close", restorePage, { signal: events.signal });
  modal.addEventListener("keydown", event => {
    if (closing) { if (event.key !== "Tab") event.preventDefault(); return; }
    if (view === "photo" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      showPhoto(selected + (event.key === "ArrowRight" ? 1 : -1));
    }
    // Native showModal makes the background inert; explicitly wrap Tab at both ends.
    if (event.key === "Tab") {
      const focusable = Array.from(modal.querySelectorAll<HTMLElement>("button, a[href]")).filter(el => el.getClientRects().length && !el.hasAttribute("disabled"));
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }, { signal: events.signal });
  viewer.addEventListener("pointerdown", event => {
    if (event.pointerType === "touch" && event.isPrimary && event.target instanceof Element && !event.target.closest("button")) pointerStart = { x: event.clientX, y: event.clientY };
  }, { signal: events.signal });
  viewer.addEventListener("pointerup", event => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) showPhoto(selected + (dx < 0 ? 1 : -1));
  }, { signal: events.signal });
  viewer.addEventListener("pointercancel", () => { pointerStart = null; }, { signal: events.signal });
  image.addEventListener("error", () => {
    if (!image.naturalWidth) image.hidden = true;
  }, { signal: events.signal });
  window.addEventListener("resize", () => transition.cancel(), { signal: events.signal });
  reduced.addEventListener("change", () => transition.cancel(), { signal: events.signal });

  return () => {
    destroyed = true;
    events.abort();
    transition.cancel();
    abortImage();
    if (modal.open) modal.close();
    unlock?.();
  };
}
