import type { Event, EventStats } from "@/lib/supabase/types";
import { priceRon } from "@/lib/events";
import "./mobile-home.css";
import { MhHero } from "./MhHero";
import { MhEventCard } from "./MhEventCard";
import { MhStats } from "./MhStats";
import { MhThread } from "./MhThread";
import { MhMembership } from "./MhMembership";
import { MhFooter } from "./MhFooter";
import { MhStickyBuy } from "./MhStickyBuy";

// Dedicated mobile homepage (<=900px). Same identity + content as the desktop
// immersive port, rebuilt mobile-first with the app's CSS+IO motion. Data is
// passed in from page.tsx (race-guarded, fail-fast). See plan 2026-06-24-003.
export function MobileHome({
  active,
  stats,
  past,
}: {
  active: Event | null;
  stats: EventStats | null;
  past: Event[];
}) {
  const ctaHref = active ? `/${active.slug}` : "#mh-arhiva";
  const editions = past.length + (active ? 1 : 0) || 3;

  return (
    <div className="mh">
      <MhHero ctaHref={ctaHref} hasEvent={!!active} />
      <MhEventCard event={active} stats={stats} />
      <MhStats editions={editions} />
      <MhThread />
      <MhMembership />
      <MhFooter />
      {active ? <MhStickyBuy href={ctaHref} priceRon={priceRon(active.price_bani)} /> : null}
    </div>
  );
}
