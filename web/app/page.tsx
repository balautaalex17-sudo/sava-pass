import type { Metadata } from "next";
import { getActiveEvent } from "@/lib/events";
import { IMMERSIVE_CSS, IMMERSIVE_MARKUP } from "./_immersive/content";
import { ImmersiveEngine } from "./_immersive/ImmersiveEngine";

// Homepage = the v3 immersive port, served responsively at ALL widths. The phone
// breakpoint lives inside IMMERSIVE_CSS (@media <=760/<=520) and the engine runs
// on mobile too (tuned). The former dedicated mobile homepage (app/_mobile/) was
// retired in plan docs/plans/2026-06-24-004 — one layout, no device split.

export const metadata: Metadata = {
  title: { absolute: "SavaPass — bilete pentru serile Interact Sf. Sava" },
  description:
    "Cumperi online, primești QR-ul pe email și intri la ușă cu o singură scanare. Biletele oficiale Interact Sf. Sava.",
};

// ISR — the page has no per-request data, only the cached active-event read.
export const revalidate = 300;

// Never let a slow/paused Supabase block the static shell — fail fast to no slug.
async function activeSlug(): Promise<string | null> {
  try {
    return await Promise.race([
      getActiveEvent().then((e) => e?.slug ?? null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);
  } catch {
    return null;
  }
}

export default async function Home() {
  const slug = await activeSlug();
  const ctaHref = slug ? `/${slug}` : "#evenimente";
  const markup = IMMERSIVE_MARKUP.split("__CTA_HREF__").join(ctaHref);

  return (
    <>
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
