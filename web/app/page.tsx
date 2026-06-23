import type { Metadata } from "next";
import { getActiveEvent } from "@/lib/events";
import { IMMERSIVE_CSS, IMMERSIVE_MARKUP } from "./_immersive/content";
import { ImmersiveEngine } from "./_immersive/ImmersiveEngine";

// Homepage = the v3 immersive landing, ported verbatim from
// "SavaPass Immersive v3.html" (see web/scripts/extract-immersive.mjs).
// The previous Landing v2 is archived at app/_archive/landing-v2.tsx.
//
// Design fidelity is intentional: the CSS is rendered in an in-page <style> so it
// mounts/unmounts with this route and v3's global `body`/`:root`/`.btn` rules do
// not leak onto the functional pages. The only dynamic wiring is the purchase /
// event CTAs, which point at the live active event's page.

export const metadata: Metadata = {
  title: { absolute: "SavaPass — bilete pentru serile Interact Sf. Sava" },
  description:
    "Cumperi online, primești QR-ul pe email și intri la ușă cu o singură scanare. Biletele oficiale Interact Sf. Sava.",
};

// Perf (U5): the landing has no per-request data — only the CTA slug, which is
// cached (getActiveEvent) and revalidated on event change. ISR serves it as a
// static page, so visitors never wait on the DB.
export const revalidate = 300;

// The landing is almost entirely static; only the CTA slug needs the DB. Never let
// a slow/paused Supabase block the page — fail fast to the in-page anchor fallback.
async function activeSlug(): Promise<string | null> {
  try {
    const active = await Promise.race([
      getActiveEvent(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);
    return active?.slug ?? null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const slug = await activeSlug();
  const ctaHref = slug ? `/${slug}` : "#event";
  const markup = IMMERSIVE_MARKUP.split("__CTA_HREF__").join(ctaHref);

  return (
    <>
      {/* Perf (U3): warm the engine libs during HTML parse so they're cached by the
          time ImmersiveEngine loads them post-hydration. */}
      <link rel="preload" as="script" href="/imersiv/vendor/lenis.min.js" />
      <link rel="preload" as="script" href="/imersiv/vendor/gsap.min.js" />
      <link rel="preload" as="script" href="/imersiv/vendor/ScrollTrigger.min.js" />
      <link rel="preload" as="script" href="/imersiv/engine.js" />
      <style dangerouslySetInnerHTML={{ __html: IMMERSIVE_CSS }} />
      <div className="sp-immersive-root" dangerouslySetInnerHTML={{ __html: markup }} />
      <ImmersiveEngine />
    </>
  );
}
