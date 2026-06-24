import type { Metadata } from "next";
import { getActiveEvent, getEventStats, getPastEvents } from "@/lib/events";
import type { Event, EventStats } from "@/lib/supabase/types";
import { MobileHome } from "./_mobile/MobileHome";

// Homepage = ONE responsive component build at every width (see
// docs/plans/2026-06-24-004). The verbatim immersive GSAP/Lenis port that used to
// own desktop is retired (archived under app/_archive/); `MobileHome` (`.mh`) now
// serves mobile AND a refined desktop via min-width breakpoints in mobile-home.css.

export const metadata: Metadata = {
  title: { absolute: "SavaPass — bilete pentru serile Interact Sf. Sava" },
  description:
    "Cumperi online, primești QR-ul pe email și intri la ușă cu o singură scanare. Biletele oficiale Interact Sf. Sava.",
};

// ISR — no per-request data, only cached event reads.
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
  return <MobileHome active={active} stats={stats} past={past} />;
}
