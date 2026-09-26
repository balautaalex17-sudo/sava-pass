"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import styles from "./image-stack.module.css";

export type StackImage = {
  id: string | number;
  src: string | null;
  alt: string;
  width: number;
  height: number;
  position?: string;
  rotate?: "left";
};

type ImgStackProps = {
  images: readonly (StackImage | string)[];
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
};

/** Adapted from the supplied draggable stack, with controlled member selection. */
export default function ImgStack({ images, activeIndex, onIndexChange }: ImgStackProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [touch, setTouch] = useState(false);
  const reduced = useReducedMotion();
  const lockedUntil = useRef(0);
  const selected = images.length ? (activeIndex ?? internalIndex) % images.length : 0;

  useEffect(() => {
    const query = matchMedia("(pointer: coarse)");
    const update = () => setTouch(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  function select(index: number) {
    if (!images.length) return;
    const next = (index + images.length) % images.length;
    if (activeIndex === undefined) setInternalIndex(next);
    onIndexChange?.(next);
  }

  function release(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const distance = touch ? Math.abs(info.offset.x) : Math.hypot(info.offset.x, info.offset.y);
    const flick = touch && distance >= 16 && Math.abs(info.velocity.x) > 450;
    if ((distance < (touch ? 40 : 50) && !flick) || performance.now() < lockedUntil.current) return;
    if (touch && Math.abs(info.offset.x) <= Math.abs(info.offset.y)) return;
    lockedUntil.current = performance.now() + 450;
    select(selected + (touch && info.offset.x > 0 ? -1 : 1));
  }

  if (!images.length) return null;

  return (
    <div className={styles.stack} data-image-stack data-active-index={selected} role="group" tabIndex={0}
      aria-label="Portretele echipei. Glisează spre stânga pentru următorul membru sau spre dreapta pentru cel anterior. Poți folosi și săgețile."
      onKeyDown={event => {
        const destinations: Record<string, number> = { ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: images.length - 1 };
        if (!(event.key in destinations)) return;
        event.preventDefault();
        event.stopPropagation();
        select(destinations[event.key]);
      }}>
      {images.map((image, index) => {
        const photo: StackImage = typeof image === "string" ? { id: index, src: image, alt: `Portret ${index + 1}`, width: 1200, height: 1600 } : image;
        const slot = (index - selected + images.length) % images.length;
        const depth = Math.min(slot, 3);
        const top = slot === 0;
        return (
          <motion.div key={photo.id} className={styles.card} data-stack-card={index} data-stack-top={top}
            data-portrait-rotate={photo.rotate}
            aria-hidden={!top} initial={false}
            style={{ zIndex: images.length - slot, pointerEvents: top ? "auto" : "none", touchAction: "pan-y pinch-zoom" }}
            animate={{ x: depth * -12, y: depth * -8, rotate: depth ? -(2 + depth * 3) : 0, scale: 1, opacity: slot < 4 ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : .45, ease: [.22, .61, .36, 1] }}
            drag={top && images.length > 1 ? (touch ? "x" : true) : false}
            dragConstraints={touch ? { left: -72, right: 72, top: 0, bottom: 0 } : { left: -110, right: 80, top: -36, bottom: 50 }}
            dragElastic={reduced ? 0 : .16} dragMomentum={false} dragSnapToOrigin
            dragTransition={{ bounceStiffness: 600, bounceDamping: reduced ? 100 : 26 }}
            onDragEnd={release}
            whileDrag={{ scale: reduced ? 1 : touch ? 1.02 : 1.065, rotate: 0, zIndex: images.length + 1, transition: { duration: reduced ? 0 : .12 } }}>
            {photo.src ? <Image src={photo.src} alt={top ? photo.alt : ""} width={photo.width} height={photo.height}
              sizes={photo.rotate ? "(max-width: 820px) 340px, 360px" : "(max-width: 820px) 245px, 290px"} loading={slot < 4 ? "eager" : "lazy"}
              draggable={false} style={{ objectPosition: photo.position ?? "center" }} />
              : <span className={styles.empty} role="img" aria-label={photo.alt} />}
          </motion.div>
        );
      })}
    </div>
  );
}
