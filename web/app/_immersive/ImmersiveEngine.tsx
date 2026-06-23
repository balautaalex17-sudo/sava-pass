"use client";

import { useEffect } from "react";

// Loads the v3 immersive engine in strict order after the SSR'd markup exists.
// Lenis + GSAP + ScrollTrigger (CDN) must load before engine.js (it reads those
// globals); the Framer Motion module is independent. On back-navigation into the
// homepage we tear down the previous Lenis instance + ScrollTriggers so a remount
// re-arms cleanly against the fresh DOM instead of stacking duplicates.

declare global {
  interface Window {
    Lenis?: unknown;
    __lenis?: { destroy?: () => void } | null;
    ScrollTrigger?: { getAll: () => Array<{ kill: () => void }> };
  }
}

const LIBS = [
  "https://unpkg.com/lenis@1.3.21/dist/lenis.min.js",
  "https://unpkg.com/gsap@3.12.5/dist/gsap.min.js",
  "https://unpkg.com/gsap@3.12.5/dist/ScrollTrigger.min.js",
];

function loadScript(src: string, type?: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    if (type) s.type = type;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.body.appendChild(s);
  });
}

export function ImmersiveEngine() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Tear down any previous run (client re-navigation into the homepage).
        try {
          window.__lenis?.destroy?.();
        } catch {}
        try {
          window.ScrollTrigger?.getAll().forEach((t) => t.kill());
        } catch {}

        // Load the CDN libs once; on later mounts the globals already exist.
        if (!window.Lenis) {
          for (const src of LIBS) {
            await loadScript(src);
            if (cancelled) return;
          }
        }

        await loadScript("/imersiv/engine.js");
        if (cancelled) return;
        await loadScript("/imersiv/engine-motion.mjs", "module");
      } catch (err) {
        // Engine is progressive enhancement: the page still renders without it.
        console.error("[immersive] engine load failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
