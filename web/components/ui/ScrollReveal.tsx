"use client";

import { useEffect } from "react";

/**
 * Progressive scroll reveal for non-immersive pages. Server-rendered content is
 * visible by default; after hydration, only elements below the fold are prepared
 * for a short entrance. Reduced-motion visitors see everything immediately.
 */

const SELECTOR = ".anim-rise, .anim-rise-fast";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

type Variant = "rise" | "pop" | "scale" | "row";

declare global {
  interface Window {
    __srReady?: boolean;
  }
}

function variantFor(el: HTMLElement): Variant {
  const explicit = el.dataset.reveal as Variant | undefined;
  if (explicit) return explicit;

  const cls = el.className || "";
  if (
    el.matches("img, picture, video") ||
    el.querySelector(":scope > img, :scope > picture, :scope > video") !== null ||
    /poster|photo|media|thumb|\bqr\b/i.test(cls)
  ) {
    return "scale";
  }
  if (el.tagName === "TR" || /\brow-hover\b/.test(cls)) return "row";
  if (
    el.tagName === "SPAN" ||
    /\b(chip|badge|pill|tag|perk|stat|num|mono|seats?)\b/i.test(cls)
  ) {
    return "pop";
  }
  return "rise";
}

function keyframesFor(v: Variant): { from: Keyframe; to: Keyframe; duration: number; easing: string } {
  switch (v) {
    case "scale":
      return {
        from: { opacity: 0, transform: "scale(0.985) translateY(8px)" },
        to: { opacity: 1, transform: "scale(1) translateY(0)" },
        duration: 520,
        easing: EASE,
      };
    case "pop":
      return {
        from: { opacity: 0, transform: "scale(0.97)" },
        to: { opacity: 1, transform: "scale(1)" },
        duration: 360,
        easing: EASE,
      };
    case "row":
      return {
        from: { opacity: 0, transform: "translateY(8px)" },
        to: { opacity: 1, transform: "translateY(0)" },
        duration: 380,
        easing: EASE,
      };
    default:
      return {
        from: { opacity: 0, transform: "translateY(12px)" },
        to: { opacity: 1, transform: "translateY(0)" },
        duration: 460,
        easing: EASE,
      };
  }
}

export function ScrollReveal() {
  useEffect(() => {
    const inImmersive = (el: Element) => !!el.closest(".sp-immersive-root");
    const reduce =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealed = new WeakSet<HTMLElement>();

    const eligible = (el: Element): el is HTMLElement =>
      el instanceof HTMLElement &&
      !revealed.has(el) &&
      !inImmersive(el);

    // Stagger index = position among reveal-target siblings in the same parent.
    const staggerIndex = (el: HTMLElement): number => {
      const parent = el.parentElement;
      if (!parent) return 0;
      const sibs = Array.from(parent.children).filter((c) => c.matches(SELECTOR));
      const i = sibs.indexOf(el);
      return i < 0 ? 0 : Math.min(i, 6);
    };

    const reveal = (el: HTMLElement) => {
      if (revealed.has(el)) return;
      observer.unobserve(el);
      revealed.add(el);
      if (el.hasAttribute("data-reveal-sequence")) el.dataset.srRevealed = "true";

      const v = variantFor(el);
      const k = keyframesFor(v);
      const delay = staggerIndex(el) * 38;

      if (typeof el.animate !== "function") return;

      const anim = el.animate([k.from, k.to], {
        duration: k.duration,
        delay,
        easing: k.easing,
        fill: "both",
      });
      anim.onfinish = () => {
        anim.cancel();
      };
    };

    // Trigger a touch before the element is fully in view so it reads as locked to
    // the scroll rather than catching up after.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) reveal(e.target as HTMLElement);
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );

    const prepare = (el: HTMLElement) => {
      if (!eligible(el)) return;
      const rect = el.getBoundingClientRect();
      // Already-visible content must keep its server-rendered first paint,
      // including destination content inserted during a route transition.
      if (reduce || rect.top < window.innerHeight) {
        revealed.add(el);
        if (el.hasAttribute("data-reveal-sequence")) el.dataset.srRevealed = "true";
        return;
      }
      observer.observe(el);
    };

    const observeAll = (scope: ParentNode) =>
      scope.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        prepare(el);
      });

    observeAll(document);

    window.__srReady = true;

    // Catch elements added after first paint: client-nav routes, realtime rows,
    // dynamically rendered form rows / verdicts. Skip the immersive subtree.
    const mo = new MutationObserver((muts) => {
      for (const m of muts)
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement) || inImmersive(node)) continue;
          if (node.matches?.(SELECTOR)) prepare(node);
          if (node.querySelector?.(SELECTOR)) observeAll(node);
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
