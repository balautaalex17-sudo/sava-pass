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

// Self-hosted (perf U3): removes the external unpkg.com DNS/TLS/latency from the
// animation critical path. Version-pinned to match engine.js (lenis 1.3.21,
// gsap 3.12.5). Re-fetch with scripts/ if bumping versions.
const VENDOR = {
  lenis: "/imersiv/vendor/lenis.min.js",
  gsap: "/imersiv/vendor/gsap.min.js",
  scrollTrigger: "/imersiv/vendor/ScrollTrigger.min.js",
};

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

        // Load the libs once; on later mounts the globals already exist. lenis is
        // independent of gsap → fetch both in parallel, then ScrollTrigger (needs
        // the gsap global), then the engine.
        if (!window.Lenis) {
          await Promise.all([loadScript(VENDOR.lenis), loadScript(VENDOR.gsap)]);
          if (cancelled) return;
          await loadScript(VENDOR.scrollTrigger);
          if (cancelled) return;
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
