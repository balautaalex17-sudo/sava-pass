"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import ImgStack, { type StackImage } from "@/components/ui/image-stack";

const subscribeToMount = () => () => undefined;

function ConnectedStack({ host }: { host: HTMLElement }) {
  const board = host.closest<HTMLElement>("#board")!;
  const images = useMemo(() => JSON.parse(host.dataset.portraits!) as StackImage[], [host]);
  const subscribe = useCallback((notify: () => void) => {
    board.addEventListener("board:member-change", notify);
    return () => board.removeEventListener("board:member-change", notify);
  }, [board]);
  const getIndex = useCallback(() => Number(board.dataset.boardSelected ?? 0), [board]);
  const activeIndex = useSyncExternalStore(subscribe, getIndex, () => 0);

  useEffect(() => {
    const stack = host.parentElement!;
    const previousTabIndex = stack.getAttribute("tabindex");
    stack.setAttribute("tabindex", "-1");
    return () => {
      if (previousTabIndex === null) stack.removeAttribute("tabindex");
      else stack.setAttribute("tabindex", previousTabIndex);
    };
  }, [host]);

  return <ImgStack images={images} activeIndex={activeIndex}
    onIndexChange={index => board.dispatchEvent(new CustomEvent("board:select", { detail: index }))} />;
}

export function BoardPortraitStack() {
  const mounted = useSyncExternalStore(subscribeToMount, () => true, () => false);
  if (!mounted) return null;
  const host = document.querySelector<HTMLElement>("[data-board-portrait-mount]");
  return host ? createPortal(<ConnectedStack host={host} />, host) : null;
}
