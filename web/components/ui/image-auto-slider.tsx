"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import styles from "./image-auto-slider.module.css";

export type SliderImage = {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  aspectRatio?: number;
  position?: string;
};

type ImageAutoSliderProps = {
  images: readonly SliderImage[];
  duration?: number;
  speed?: number;
  label?: string;
  pauseWhenDialogOpen?: string;
};

/** The supplied 21st.dev loop, scoped to the gallery and backed by real club photos. */
export function ImageAutoSlider({
  images,
  duration,
  speed = 35,
  label = "Fotografii din viața clubului",
  pauseWhenDialogOpen,
}: ImageAutoSliderProps) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const keyboardBrowsing = useRef(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const dialog = pauseWhenDialogOpen ? document.getElementById(pauseWhenDialogOpen) : null;
    const events = new AbortController();
    let visible = false;
    const update = () => {
      element.dataset.running = String(visible && !document.hidden && !reduced.matches && !dialog?.hasAttribute("open"));
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(element);
    // Derive the loop duration from its width so more photos do not scroll faster.
    const group = track.current?.firstElementChild;
    const measure = () => {
      if (group) element.style.setProperty("--slider-duration", `${Math.max(10, duration ?? group.getBoundingClientRect().width / Math.max(1, speed))}s`);
    };
    const sizeObserver = new ResizeObserver(measure);
    if (group) sizeObserver.observe(group);
    measure();
    const modalObserver = new MutationObserver(update);
    if (dialog) modalObserver.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    const resume = () => {
      if (keyboardBrowsing.current || reduced.matches || element.dataset.mode !== "manual") return;
      const view = viewport.current;
      const groupWidth = group?.getBoundingClientRect().width ?? 0;
      if (!view || !groupWidth) return;
      // Resume at the same photo instead of restarting the loop at its beginning.
      const seconds = parseFloat(element.style.getPropertyValue("--slider-duration"));
      element.style.setProperty("--slider-delay", `${-(view.scrollLeft % groupWidth) / groupWidth * seconds}s`);
      element.dataset.mode = "auto";
      view.scrollLeft = 0;
      setManual(false);
      update();
    };
    dialog?.addEventListener("close", resume, { signal: events.signal });
    document.addEventListener("visibilitychange", update, { signal: events.signal });
    reduced.addEventListener("change", update, { signal: events.signal });
    update();
    return () => { observer.disconnect(); sizeObserver.disconnect(); modalObserver.disconnect(); events.abort(); };
  }, [duration, pauseWhenDialogOpen, speed]);

  function browse(keyboard = false) {
    keyboardBrowsing.current = keyboard;
    if (!root.current || !viewport.current || !track.current || root.current.dataset.mode === "manual") return;
    // Convert the current animation offset into native scrolling without a jump.
    const matrix = new DOMMatrixReadOnly(getComputedStyle(track.current).transform);
    const offset = viewport.current.scrollLeft - matrix.m41;
    root.current.dataset.mode = "manual";
    viewport.current.scrollLeft = offset;
    setManual(true);
  }

  if (!images.length) return null;

  return (
    <div ref={root} className={styles.slider} data-image-auto-slider data-mode={manual ? "manual" : "auto"}
      style={{ "--slider-duration": `${Math.max(10, duration ?? images.length * 7)}s` } as CSSProperties}>
      <div ref={viewport} className={styles.viewport} role="region" aria-label={label} tabIndex={-1} data-slider-viewport
        data-lenis-prevent-horizontal
        onPointerDownCapture={event => { if (event.pointerType === "touch") browse(); }}
        onFocusCapture={event => {
          if (event.target instanceof HTMLAnchorElement && event.target.matches(":focus-visible")) {
            browse(true);
            event.target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
          }
        }}>
        <div ref={track} className={styles.track} data-slider-track>
          {[false, true].map(copy => (
            <div key={String(copy)} className={styles.group} aria-hidden={copy || undefined} data-slider-copy={copy || undefined}>
              {images.map(photo => (
                <a key={photo.src} href={photo.src} data-gallery-photo={photo.src} className={styles.card}
                  tabIndex={copy ? -1 : undefined} aria-haspopup="dialog"
                  aria-label={copy ? undefined : `Deschide fotografia: ${photo.caption}`}
                  style={{ aspectRatio: photo.aspectRatio ?? 1 }}
                  onMouseDown={copy ? event => event.preventDefault() : undefined}>
                  <Image src={photo.src} alt={copy ? "" : photo.alt} width={photo.width} height={photo.height}
                    sizes={`(max-width: 820px) ${Math.ceil(260 * Math.max(photo.aspectRatio ?? 1, photo.width / photo.height))}px, ${Math.ceil(310 * Math.max(photo.aspectRatio ?? 1, photo.width / photo.height))}px`}
                    style={{ objectPosition: photo.position ?? "center" }}
                    loading="lazy" draggable={false} />
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export { ImageAutoSlider as Component };
