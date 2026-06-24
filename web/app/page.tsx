import type { Metadata } from "next";
import { getActiveEvent, getEventStats, getPastEvents } from "@/lib/events";
import type { Event, EventStats } from "@/lib/supabase/types";
import { IMMERSIVE_CSS, IMMERSIVE_MARKUP } from "./_immersive/content";
import { ImmersiveEngine } from "./_immersive/ImmersiveEngine";
import { MobileHome } from "./_mobile/MobileHome";

// Homepage = TWO layouts in one ISR document (see
// docs/plans/2026-06-24-003-feat-mobile-native-homepage-plan.md):
//   - desktop (>=901px): the v3 immersive port, unchanged, with its GSAP/Lenis engine.
//   - mobile  (<=900px): a dedicated, mobile-first <MobileHome/> (the immersive port
//     was authored for 1280px and reads as empty 100dvh voids on a phone).
// Visibility is a pure CSS toggle; ImmersiveEngine bails on mobile so the heavy
// engine never runs there. The immersive CSS is GLOBAL/unscoped, so MobileHome is
// namespaced under `.mh` (own `.mh-btn`, never the global `.btn`) and a <=900px body
// reset undoes the immersive `body{display:flex;padding-left}` rule.

export const metadata: Metadata = {
  title: { absolute: "SavaPass — bilete pentru serile Interact Sf. Sava" },
  description:
    "Cumperi online, primești QR-ul pe email și intri la ușă cu o singură scanare. Biletele oficiale Interact Sf. Sava.",
};

// Perf (U5): ISR — the page has no per-request data, only cached event reads.
export const revalidate = 300;

type HomeData = { active: Event | null; stats: EventStats | null; past: Event[] };

// Never let a slow/paused Supabase block the static shell — fail fast to empty.
async function homeData(): Promise<HomeData> {
  try {
    return await Promise.race([
      (async () => {
        const active = await getActiveEvent();
        const [stats, past] = await Promise.all([
          active ? getEventStats(active.id) : Promise.resolve(null),
          getPastEvents(),
        ]);
        return { active, stats, past };
      })(),
      new Promise<HomeData>((resolve) =>
        setTimeout(() => resolve({ active: null, stats: null, past: [] }), 2000),
      ),
    ]);
  } catch {
    return { active: null, stats: null, past: [] };
  }
}

export default async function Home() {
  const { active, stats, past } = await homeData();
  const ctaHref = active ? `/${active.slug}` : "#evenimente";
  const markup = IMMERSIVE_MARKUP.split("__CTA_HREF__").join(ctaHref);

  return (
    <>
      {/* Desktop-only visibility + neutralize the immersive global body rule on phones. */}
      <style>{`
        .home-mobile { display: none; }
        @media (max-width: 900px) {
          .home-desktop { display: none !important; }
          .home-mobile { display: block; }
          body { display: block !important; padding-left: 0 !important; }
        }
      `}</style>

      {/* Desktop: the immersive port (unchanged). Engine bails on mobile. */}
      <div className="home-desktop">
        <link rel="preload" as="script" href="/imersiv/vendor/lenis.min.js" />
        <link rel="preload" as="script" href="/imersiv/vendor/gsap.min.js" />
        <link rel="preload" as="script" href="/imersiv/vendor/ScrollTrigger.min.js" />
        <link rel="preload" as="script" href="/imersiv/engine.js" />
        <style dangerouslySetInnerHTML={{ __html: IMMERSIVE_CSS }} />
        <div className="sp-immersive-root" dangerouslySetInnerHTML={{ __html: markup }} />
        <ImmersiveEngine />
      </div>

      {/* Mobile: dedicated mobile-native homepage. */}
      <div className="home-mobile">
        <MobileHome active={active} stats={stats} past={past} />
      </div>
    </>
  );
}
