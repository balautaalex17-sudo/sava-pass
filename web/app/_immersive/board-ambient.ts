/** Own the background's playback so the landing engine cannot restart a paused clip. */
export function initializeBoardAmbient(board: HTMLElement) {
  const video = board.querySelector<HTMLVideoElement>("[data-board-ambient]");
  if (!video) return () => {};

  const events = new AbortController();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const dialog = board.querySelector<HTMLDialogElement>(".bdr-lightbox");
  let userPaused = connection?.saveData ?? false;
  let visible = false;
  let destroyed = false;

  function shouldPlay() {
    return !destroyed && visible && !document.hidden && !reduced.matches && !userPaused && !dialog?.open;
  }

  function update() {
    if (destroyed) return;
    board.dataset.ambientPlaying = String(shouldPlay());
    if (!shouldPlay()) { video!.pause(); return; }
    if (!video!.getAttribute("src")) {
      video!.src = video!.dataset.ambientSrc!;
      video!.load();
    }
    video!.muted = true;
    if (!video!.paused) return;
    void video!.play().then(() => {
      if (!shouldPlay()) video!.pause();
    }).catch(() => {
      // Pausing during a pending play is expected when a user scrolls away.
      if (!shouldPlay()) return;
      userPaused = true;
      update();
    });
  }

  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    update();
  }, { threshold: 0 });
  observer.observe(board);
  const dialogObserver = new MutationObserver(update);
  if (dialog) dialogObserver.observe(dialog, { attributes: true, attributeFilter: ["open"] });
  video.addEventListener("loadeddata", () => { video.dataset.ready = "true"; }, { signal: events.signal });
  video.addEventListener("error", () => {
    delete video.dataset.ready;
    userPaused = true;
    update();
  }, { signal: events.signal });
  reduced.addEventListener("change", update, { signal: events.signal });
  document.addEventListener("visibilitychange", update, { signal: events.signal });
  update();

  return () => {
    destroyed = true;
    observer.disconnect();
    dialogObserver.disconnect();
    events.abort();
    video.pause();
    board.dataset.ambientPlaying = "false";
  };
}
