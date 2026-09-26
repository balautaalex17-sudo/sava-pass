import { initializeBoardGallery } from "./board-gallery-interactions";
import { initializeBoardAmbient } from "./board-ambient";

export function initializeBoard() {
  const board = document.querySelector<HTMLElement>(".board-editorial");
  if (!board) return () => {};
  const cleanupGallery = initializeBoardGallery(board);
  const cleanupAmbient = initializeBoardAmbient(board);
  const cleanupBackgroundAndGallery = () => { cleanupAmbient(); cleanupGallery(); };
  const stack = board.querySelector<HTMLElement>(".bdr-portrait-stack");
  const cards = Array.from(board.querySelectorAll<HTMLElement>("[data-board-card]"));
  const profiles = Array.from(board.querySelectorAll<HTMLElement>("[data-board-profile]"));
  const role = board.querySelector<HTMLElement>("[data-board-role-label]");
  const position = board.querySelector<HTMLElement>("[data-board-position]");
  const announcement = board.querySelector<HTMLElement>("[data-board-announcement]");
  if (!stack || !cards.length || !role || !position || !announcement) return cleanupBackgroundAndGallery;

  const events = new AbortController();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let selected = 0;
  board.dataset.boardSelected = "0";
  let animation: Animation | undefined;
  let pointerStart: { x: number; y: number } | null = null;

  function select(index: number) {
    selected = (index + cards.length) % cards.length;
    board!.dataset.boardSelected = String(selected);
    cards.forEach((card, i) => {
      const slot = (i - selected + cards.length) % cards.length;
      card.dataset.slot = String(Math.min(slot, 4));
      card.setAttribute("aria-hidden", String(slot !== 0));
      const image = card.querySelector("img");
      if (slot < 4 && image) image.loading = "eager";
    });
    profiles.forEach((profile, i) => { profile.hidden = i !== selected; });
    role!.textContent = profiles[selected].dataset.boardRole ?? "";
    position!.textContent = `${selected + 1} din ${cards.length}`;
    const name = profiles[selected].querySelector("h3")?.textContent;
    announcement!.textContent = `${selected + 1} din ${cards.length}: ${name ? `${name}, ` : ""}${role!.textContent}`;
    board!.dispatchEvent(new Event("board:member-change"));
    animation?.cancel();
    if (!reduced.matches) animation = profiles[selected].animate(
      [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 280, easing: "cubic-bezier(.22,.61,.36,1)" },
    );
  }

  board.addEventListener("board:select", event => {
    const index = (event as CustomEvent<unknown>).detail;
    if (typeof index === "number" && Number.isInteger(index)) select(index);
  }, { signal: events.signal });

  board.querySelectorAll<HTMLButtonElement>("[data-board-step]").forEach(button => {
    button.disabled = cards.length < 2;
    button.addEventListener("click", () => select(selected + Number(button.dataset.boardStep)), { signal: events.signal });
  });
  board.querySelector<HTMLElement>(".bdr-showcase")!.addEventListener("keydown", event => {
    const destinations: Record<string, number> = { ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: cards.length - 1 };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    select(destinations[event.key]);
  }, { signal: events.signal });
  stack.addEventListener("pointerdown", event => {
    if (stack.querySelector("[data-image-stack]")) return;
    if (event.isPrimary && event.pointerType === "touch") {
      pointerStart = { x: event.clientX, y: event.clientY };
      stack.setPointerCapture(event.pointerId);
    }
  }, { signal: events.signal });
  stack.addEventListener("pointerup", event => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) select(selected + (dx < 0 ? 1 : -1));
  }, { signal: events.signal });
  stack.addEventListener("pointercancel", () => { pointerStart = null; }, { signal: events.signal });
  reduced.addEventListener("change", () => animation?.cancel(), { signal: events.signal });

  return () => { animation?.cancel(); events.abort(); cleanupBackgroundAndGallery(); };
}
