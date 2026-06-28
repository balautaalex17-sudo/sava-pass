import { getActiveEvent } from "@/lib/events";
import { HomeNav } from "@/app/HomeNav";
import { SiteFooter } from "./SiteFooter";

/**
 * The one shell every public club page shares (spec §6.3): nav → ONE hero moment
 * → calm content body → optional CTA band → footer, plus a single faint gear
 * watermark ("same building" cue). Dark immersive register (inherits
 * `.theme-immersive` from <body>). Async: resolves the active-event href for the
 * nav + footer.
 */
export async function ClubPage({
  active,
  hero,
  cta,
  children,
}: {
  /** nav key of the current page (despre/proiecte/echipa/…) for active highlight */
  active?: string;
  hero: React.ReactNode;
  cta?: React.ReactNode;
  children: React.ReactNode;
}) {
  let eventHref = "#event";
  try {
    const ev = await getActiveEvent();
    if (ev?.slug) eventHref = `/${ev.slug}`;
  } catch {
    /* keep fallback */
  }

  return (
    <div className="cl-shell">
      <GearWatermark />
      <HomeNav eventHref={eventHref} active={active} />
      {hero}
      <div className="cl-body">{children}</div>
      {cta}
      <SiteFooter eventHref={eventHref} />
    </div>
  );
}

/** One faint, fixed, non-animated gear motif per page (spec §6.3). */
function GearWatermark() {
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return {
      x1: 12 + Math.cos(a) * 6,
      y1: 12 + Math.sin(a) * 6,
      x2: 12 + Math.cos(a) * 9.5,
      y2: 12 + Math.sin(a) * 9.5,
    };
  });
  return (
    <svg className="cl-watermark" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.2" />
      {spokes.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ))}
    </svg>
  );
}
