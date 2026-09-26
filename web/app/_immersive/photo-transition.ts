type Box = { left: number; top: number; width: number; height: number };

export type PhotoOrigin = {
  element: HTMLAnchorElement;
  id: string;
  box: Box;
  viewport: { width: number; height: number };
};

export function photoOrigin(element: HTMLAnchorElement): PhotoOrigin {
  return { element, id: element.dataset.galleryPhoto!, box: element.querySelector("img")!.getBoundingClientRect(), viewport: { width: innerWidth, height: innerHeight } };
}

export function canReturnTo(origin: PhotoOrigin | null, id: string) {
  if (!origin || origin.id !== id || !origin.element.isConnected || origin.viewport.width !== innerWidth || origin.viewport.height !== innerHeight) return false;
  const rect = origin.element.querySelector("img")!.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
    && ["left", "top", "width", "height"].every(key => Math.abs(rect[key as keyof Box] - origin.box[key as keyof Box]) < 3);
}

/** Uniform image scaling inside an independently animated crop. Faces never stretch. */
export function createPhotoTransition(dialog: HTMLDialogElement, reduced: MediaQueryList) {
  let cancelCurrent = () => {};

  function cancel() { cancelCurrent(); cancelCurrent = () => {}; }

  function run(origin: PhotoOrigin | null, target: HTMLImageElement, width: number, height: number, closing = false) {
    cancel();
    const source = origin?.element.querySelector("img");
    if (reduced.matches || !origin || !source?.complete || !source.naturalWidth) {
      const fade = target.animate([{ opacity: closing ? 1 : 0 }, { opacity: closing ? 0 : 1 }], { duration: reduced.matches ? 90 : 160, fill: "both" });
      cancelCurrent = () => fade.cancel();
      return fade.finished.catch(() => {}).finally(() => fade.cancel());
    }

    const destination = target.getBoundingClientRect();
    const fit = Math.min(destination.width / width, destination.height / height);
    const full = { left: destination.left + (destination.width - width * fit) / 2, top: destination.top + (destination.height - height * fit) / 2, width: width * fit, height: height * fit };
    const box = origin.box;
    const cover = Math.max(box.width / width, box.height / height);
    const position = getComputedStyle(source).objectPosition.split(" ").map(value => parseFloat(value) / 100);
    const thumb = { left: box.left + (box.width - width * cover) * position[0], top: box.top + (box.height - height * cover) * (position[1] ?? position[0]) };
    const layer = document.createElement("div");
    layer.className = "bdr-photo-flight";
    layer.setAttribute("aria-hidden", "true");
    const clone = new Image();
    clone.src = source.currentSrc || source.src;
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    layer.append(clone);
    dialog.append(layer);
    const visibility = target.style.visibility;
    const sourceVisibility = source.style.visibility;
    target.style.visibility = "hidden";
    source.style.visibility = "hidden";
    const clip = (rect: Box) => `inset(${rect.top}px ${innerWidth - rect.left - rect.width}px ${innerHeight - rect.top - rect.height}px ${rect.left}px)`;
    const transforms = [
      { transform: `translate3d(${thumb.left}px,${thumb.top}px,0) scale(${cover})` },
      { transform: `translate3d(${full.left}px,${full.top}px,0) scale(${fit})` },
    ];
    const clips = [{ clipPath: clip(box) }, { clipPath: clip(full) }];
    if (closing) { transforms.reverse(); clips.reverse(); }
    const options = { duration: 380, easing: "cubic-bezier(.22,.61,.36,1)", fill: "both" as const };
    const animations = [clone.animate(transforms, options), layer.animate(clips, options)];
    const cleanup = () => {
      animations.forEach(animation => animation.cancel());
      layer.remove();
      target.style.visibility = visibility;
      source.style.visibility = sourceVisibility;
    };
    cancelCurrent = cleanup;
    return Promise.all(animations.map(animation => animation.finished)).catch(() => {}).then(() => {
      if (cancelCurrent === cleanup) { cleanup(); cancelCurrent = () => {}; }
    });
  }

  return { run, cancel };
}
