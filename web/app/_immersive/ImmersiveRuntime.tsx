"use client";

import { useEffect } from "react";

// Loads the v3 immersive engine in strict order after the SSR'd markup exists.
// Lenis + GSAP + ScrollTrigger must load before engine.js (it reads those
// globals); the secondary motion engine follows. On back-navigation into the
// homepage we tear down the previous Lenis instance + ScrollTriggers so a remount
// re-arms cleanly against the fresh DOM instead of stacking duplicates.

declare global {
  interface Window {
    Lenis?: unknown;
    __lenis?: {
      destroy?: () => void;
      scrollTo?: (
        target: HTMLElement | number,
        options?: { immediate?: boolean; force?: boolean },
      ) => void;
    } | null;
    __immersiveCleanup?: (() => void) | null;
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

const ENGINE_VERSION = "20260905-viewport-video-v15";

const vendorLoads = new Map<string, Promise<void>>();

function loadScript(src: string) {
  const existing = vendorLoads.get(src);
  if (existing) return existing;
  const pending = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => {
      vendorLoads.delete(src);
      s.remove();
      reject(new Error(`failed to load ${src}`));
    };
    document.body.appendChild(s);
  });
  vendorLoads.set(src, pending);
  return pending;
}

// Removing a pending external <script> does not reliably cancel its execution.
// Fetch these two pinned, same-origin engines first, then synchronously execute
// only a still-mounted run. Neither engine has imports/exports; a function scope
// gives engine-motion the isolation its former module tag provided. This uses
// the same inline-script CSP permission as the existing Next/landing scripts.
async function loadEngine(src: string, signal: AbortSignal) {
  const response = await fetch(src, { signal });
  if (!response.ok) throw new Error(`failed to load ${src}`);
  const source = await response.text();
  signal.throwIfAborted();
  const script = document.createElement("script");
  script.textContent = `(function(){\n${source}\n})();`;
  document.body.appendChild(script);
  script.remove();
}

function cleanupImmersive() {
  try {
    window.__immersiveCleanup?.();
  } catch {}
  window.__immersiveCleanup = null;

  // Fallback for an older/cancelled engine run that did not register its own
  // cleanup callback.
  try {
    window.__lenis?.destroy?.();
  } catch {}
  window.__lenis = null;
  try {
    window.ScrollTrigger?.getAll().forEach((trigger) => trigger.kill());
  } catch {}

  document.body.style.overflow = "";
  document.body.classList.remove("scrolled");
  document.documentElement.classList.remove(
    "lenis",
    "lenis-smooth",
    "lenis-scrolling",
    "lenis-stopped",
  );
}

function scrollToLocationHash() {
  const rawHash = window.location.hash.slice(1);
  if (!rawHash) return;

  let id = rawHash;
  try {
    id = decodeURIComponent(rawHash);
  } catch {}

  const target = document.getElementById(id);
  if (!target) return;

  const top = Math.round(target.getBoundingClientRect().top + window.scrollY);
  if (window.__lenis?.scrollTo) {
    window.__lenis.scrollTo(top, { immediate: true, force: true });
  } else {
    window.scrollTo({ top, left: 0, behavior: "auto" });
  }
}

export function ImmersiveRuntime() {
  useEffect(() => {
    let cancelled = false;
    const engineRequest = new AbortController();
    let hashFrame = 0;
    const isMobile = window.matchMedia("(max-width: 820px)").matches;

    // Next's client navigation updates the #fragment before this animated page
    // has settled. Re-align once the DOM exists and once Lenis has initialized.
    const alignToHash = () => {
      cancelAnimationFrame(hashFrame);
      hashFrame = requestAnimationFrame(() => {
        hashFrame = requestAnimationFrame(scrollToLocationHash);
      });
    };

    window.addEventListener("hashchange", alignToHash);
    alignToHash();

    // The immersive is served at all widths. Phones use the browser's native
    // scrolling and the lightweight DOM engine; desktop adds Lenis + GSAP.
    const run = async () => {
      try {
        // Tear down any previous run (client re-navigation into the homepage).
        cleanupImmersive();

        // Lenis and GSAP are desktop-only. Native touch scrolling avoids switching
        // scroll engines during the user's first gesture.
        if (!isMobile) {
          await Promise.all([loadScript(VENDOR.lenis), loadScript(VENDOR.gsap)]);
          if (cancelled) return;
          await loadScript(VENDOR.scrollTrigger);
          if (cancelled) return;
        }

        await loadEngine(`/imersiv/engine.js?v=${ENGINE_VERSION}`, engineRequest.signal);
        if (cancelled) return;
        alignToHash();
        if (!isMobile) {
          await loadEngine(`/imersiv/engine-motion.mjs?v=${ENGINE_VERSION}`, engineRequest.signal);
        }
      } catch {
        // Engine is progressive enhancement: the page still renders without it.
        if (!cancelled) console.error("immersive_engine_load_failed");
      }
    };

    // Start after the first painted frame, before a normal first swipe. This keeps
    // setup work out of the input event itself.
    const startFrame = window.requestAnimationFrame(() => {
      void run();
    });

    return () => {
      cancelled = true;
      engineRequest.abort();
      window.removeEventListener("hashchange", alignToHash);
      window.cancelAnimationFrame(startFrame);
      cancelAnimationFrame(hashFrame);
      cleanupImmersive();
    };
  }, []);

  return null;
}
