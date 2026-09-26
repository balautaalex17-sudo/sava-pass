"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ImageAutoSlider } from "@/components/ui/image-auto-slider";
import { CLUB_SLIDER_PHOTOS } from "./board-gallery-data";

const subscribe = () => () => undefined;

export function BoardGallerySlider() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) return null;
  const host = document.querySelector<HTMLElement>("[data-board-gallery-slider]");
  return host ? createPortal(
    <ImageAutoSlider images={CLUB_SLIDER_PHOTOS} pauseWhenDialogOpen="board-gallery-dialog" />,
    host,
  ) : null;
}
