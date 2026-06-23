"use client";

import { useEffect } from "react";

/**
 * App-wide scroll reveal with per-element variants for a layered feel.
 *
 * `.anim-rise` / `.anim-rise-fast` start hidden (via the `html.sr-on` gate) and
 * are eased in as they enter the viewport. The *type* of motion is picked per
 * element so the page reveals in layers instead of one uniform fade:
 *   - scale  → images / posters / QR / media (subtle zoom-settle)
 *   - pop    → chips, badges, pills, perks, stat numbers (scale + tiny overshoot)
 *   - row    → table rows (small quick rise, cascades down the table)
 *   - rise   → everything else: cards, sections, headings (fade-and-rise)
 *
 * Tuned to feel locked to the scroll: triggers a touch before the element is fully
 * in view, short durations, small staggers. `.sr-shown` alone guarantees the final
 * visible state, so an interrupted animation can't strand an element off-screen.
 *
 * Motion is forced on (the matchMedia shim in layout.tsx reports no reduce-motion);
 * the `reduce` branch is only a fallback if that shim is ever removed.
 *
 * The homepage immersive landing (`.sp-immersive-root`) runs its own engine and is
 * skipped here.
 */

const SELECTOR = ".anim-rise, .anim-rise-fast";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const BACK = "cubic-bezier(0.34, 1.56, 0.64, 1)";

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

// from-keyframe + tuning per variant. Layered = different travel + speed so
// elements move at visibly different rates.
function keyframesFor(v: Variant): { from: Keyframe; to: Keyframe; duration: number; easing: string } {
  switch (v) {
    case "scale":
      return {
        from: { opacity: 0, transform: "scale(1.06) translateY(10px)" },
        to: { opacity: 1, transform: "scale(1) translateY(0)" },
        duration: 820,
        easing: EASE,
      };
    case "pop":
      return {
        from: { opacity: 0, transform: "scale(0.9)" },
        to: { opacity: 1, transform: "scale(1)" },
        duration: 460,
        easing: BACK,
      };
    case "row":
      return {
        from: { opacity: 0, transform: "translateY(14px)" },
        to: { opacity: 1, transform: "translateY(0)" },
        duration: 460,
        easing: EASE,
      };
    default:
      return {
        from: { opacity: 0, transform: "translateY(26px)" },
        to: { opacity: 1, transform: "translateY(0)" },
        duration: 620,
        easing: EASE,
      };
  }
}

export function ScrollReveal() {
  useEffect(() => {
    window.__srReady = true;
    if (!document.documentElement.classList.contains("sr-on")) return;

    const inImmersive = (el: Element) => !!el.closest(".sp-immersive-root");
    const eligible = (el: Element): el is HTMLElement =>
      el instanceof HTMLElement && !el.classList.contains("sr-shown") && !inImmersive(el);

    const reduce =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Stagger index = position among reveal-target siblings in the same parent.
    const staggerIndex = (el: HTMLElement): number => {
      const parent = el.parentElement;
      if (!parent) return 0;
      const sibs = Array.from(parent.children).filter((c) => c.matches(SELECTOR));
      const i = sibs.indexOf(el);
      return i < 0 ? 0 : Math.min(i, 6);
    };

    const reveal = (el: HTMLElement) => {
      if (el.classList.contains("sr-shown")) return;
      observer.unobserve(el);
      el.classList.add("sr-shown"); // final visible state, independent of the animation

      if (reduce) return;

      const v = variantFor(el);
      const k = keyframesFor(v);
      const delay = staggerIndex(el) * 55;
      const anim = el.animate([k.from, k.to], {
        duration: k.duration,
        delay,
        easing: k.easing,
        fill: "both",
      });
      // Commit the end state to inline style then release the animation so held
      // WAAPI animations don't accumulate (keeps long pages smooth).
      anim.onfinish = () => {
        try {
          anim.commitStyles();
        } catch {}
        try {
          anim.cancel();
        } catch {}
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

    const observeAll = (scope: ParentNode) =>
      scope.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (eligible(el)) observer.observe(el);
      });

    observeAll(document);

    // Safety net: anything already within the viewport that the observer hasn't
    // fired for yet (edge timing, zero-size-at-mount) gets revealed shortly after.
    const sweep = () => {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (!eligible(el)) return;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.95 && r.bottom > 0) reveal(el);
      });
    };
    const sweepT = window.setTimeout(sweep, 900);
    window.addEventListener("load", sweep);

    // Catch elements added after first paint: client-nav routes, realtime rows,
    // dynamically rendered form rows / verdicts. Skip the immersive subtree.
    const mo = new MutationObserver((muts) => {
      for (const m of muts)
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement) || inImmersive(node)) continue;
          if (node.matches?.(SELECTOR) && eligible(node)) observer.observe(node);
          if (node.querySelector?.(SELECTOR)) observeAll(node);
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
      window.clearTimeout(sweepT);
      window.removeEventListener("load", sweep);
    };
  }, []);

  return null;
}
