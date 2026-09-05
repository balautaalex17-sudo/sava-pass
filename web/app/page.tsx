import type { Metadata } from "next";
import { isEventEnded } from "@/lib/event-lifecycle";
import { getFeaturedEvents } from "@/lib/events";
import { getPublicRecruitmentState } from "@/lib/recruitment-public";
import { IMMERSIVE_CSS, IMMERSIVE_MARKUP } from "./_immersive/content";
import { ImmersiveRuntime } from "./_immersive/ImmersiveRuntime";
import { renderImmersiveMarkup, type LandingShowcaseEvent } from "./_immersive/upgrade";

// Homepage = the v3 immersive port, served responsively at ALL widths. The phone
// breakpoint lives inside IMMERSIVE_CSS (@media <=760/<=520) and the engine runs
// on mobile too (tuned). The former dedicated mobile homepage (app/_mobile/) was
// retired in plan docs/plans/2026-06-24-004 — one layout, no device split.

export const metadata: Metadata = {
  title: { absolute: "SavaPass — bilete pentru serile Interact Sf. Sava" },
  description:
    "Cumperi online, primești QR-ul pe email și intri la ușă cu o singură scanare. Biletele oficiale Interact Sf. Sava.",
};

// ISR — the page has no per-request data, only cached public event/content reads.
export const revalidate = 300;

const LANDING_STYLESHEET = "/landing.css?v=20260902-unified-showcase-15";
const introCssEnd = IMMERSIVE_CSS.indexOf("/* scrolling brand marquee");

if (introCssEnd < 0) {
  throw new Error("Immersive intro CSS marker is missing");
}

// Both layouts need the intro rules before the external stylesheet arrives so
// the first paint cannot shift. The complete stylesheet is ready before scroll.
const LANDING_CRITICAL_CSS = `${IMMERSIVE_CSS.slice(0, introCssEnd)}
.sp-immersive-root .mhi-ambient,
.sp-immersive-root .mhi-row,
.sp-immersive-root .mhi-features,
.sp-immersive-root .mhi-church { display: none; }
@media (max-width: 820px) {
  :root {
    --font-manrope: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --font-commissioner: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --font-jetbrains-mono: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
    --font-instrument-serif: Georgia, "Times New Roman", serif;
  }
  .sp-immersive-root { --im-gutter: clamp(16px, 5vw, 32px); }
  .sp-immersive-root .intro {
    position: relative;
    top: auto;
    min-height: 100svh;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    place-items: center;
    padding: max(96px, calc(72px + env(safe-area-inset-top))) var(--im-gutter) max(40px, env(safe-area-inset-bottom));
  }
  .sp-immersive-root .intro .glow { opacity: .28; filter: blur(72px); }
  .sp-immersive-root .engine-stage { display: block !important; }
  .sp-immersive-root .mhi-ambient,
  .sp-immersive-root .mhi-row,
  .sp-immersive-root .mhi-features,
  .sp-immersive-root .mhi-church,
  .sp-immersive-root .intro-video,
  .sp-immersive-root .intro .tele,
  .sp-immersive-root .intro .scrollhint,
  .sp-immersive-root .dots,
  .sp-immersive-root .lrail { display: none !important; }
  .sp-immersive-root #logo-stage {
    width: 100%;
    height: auto;
    min-height: 150px;
    margin: 0;
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: center;
    justify-self: stretch;
    gap: clamp(14px, 5vw, 28px);
  }
  .sp-immersive-root #logo-stage .ll-text {
    width: auto;
    min-width: 0;
    flex: 0 1 180px;
    align-items: center;
  }
  .sp-immersive-root #logo-stage .ll-interact { font-size: clamp(38px, 12vw, 58px); }
  .sp-immersive-root #logo-stage .ll-sub { margin-top: 16px; padding-left: 0; }
  .sp-immersive-root #logo-stage .ll-sub::before {
    left: 50%;
    margin-left: -54px;
    transform-origin: center;
  }
  .sp-immersive-root #logo-stage .ll-wheel {
    width: clamp(88px, 26vw, 132px);
    height: auto;
    flex: none;
    aspect-ratio: 1;
  }
  .sp-immersive-root #logo-stage,
  .sp-immersive-root #logo-stage * {
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .sp-immersive-root #logo-stage .ch,
  .sp-immersive-root #logo-stage .sl,
  .sp-immersive-root #logo-stage .ll-wheel {
    opacity: 1;
    transform: none;
    filter: none;
    animation: none;
  }
  .sp-immersive-root .rv,
  .sp-immersive-root .im-rv {
    opacity: 1;
    transform: none;
    transition: none;
    will-change: auto;
  }
}`;

type FeaturedEvent = Awaited<ReturnType<typeof getFeaturedEvents>>[number];

function toLandingShowcaseEvent(event: FeaturedEvent, now: number): LandingShowcaseEvent {
  const status = isEventEnded(event, now) ? "ended" : "active";
  return {
    title: event.title,
    subtitle: event.subtitle,
    about: event.about,
    dateLabel: event.date_label,
    venue: event.venue,
    priceBani: event.price_bani,
    photoUrl: event.photo_url,
    detailsHref: `/${event.slug}`,
    checkoutHref: `/${event.slug}/checkout`,
    status,
  };
}

async function getHomepageEvents(): Promise<LandingShowcaseEvent[]> {
  const featuredEvents = await getFeaturedEvents();
  const now = Date.now();
  return featuredEvents.map((event) => toLandingShowcaseEvent(event, now));
}

export default async function Home() {
  const [showcaseEvents, recruitment] = await Promise.all([
    getHomepageEvents(),
    getPublicRecruitmentState(),
  ]);
  return <LandingBody showcaseEvents={showcaseEvents} recruitment={recruitment} />;
}

function LandingBody({ showcaseEvents, recruitment }: { showcaseEvents: LandingShowcaseEvent[]; recruitment: Awaited<ReturnType<typeof getPublicRecruitmentState>> }) {
  const ctaHref = showcaseEvents.some((event) => event.status === "active") ? "/rezerva" : "/evenimente";
  const markup = renderImmersiveMarkup(IMMERSIVE_MARKUP, { recruitment, showcaseEvents }).split("__CTA_HREF__").join(ctaHref);

  return (
    <>
      {/* The first mobile viewport uses the same non-photographic ticket-engine stage as desktop. */}
      {/* The route stylesheet is discovered during HTML parsing instead of on the
          first swipe. Desktop also warms its richer animation libraries. */}
      <link rel="stylesheet" href={LANDING_STYLESHEET} precedence="high" data-immersive-css="" />
      <link rel="preload" as="script" href="/imersiv/vendor/lenis.min.js" media="(min-width: 821px)" />
      <link rel="preload" as="script" href="/imersiv/vendor/gsap.min.js" media="(min-width: 821px)" />
      <link rel="preload" as="script" href="/imersiv/vendor/ScrollTrigger.min.js" media="(min-width: 821px)" />
      <style dangerouslySetInnerHTML={{ __html: LANDING_CRITICAL_CSS }} />
      <div className="sp-immersive-root" dangerouslySetInnerHTML={{ __html: markup }} />
      <ImmersiveRuntime />
    </>
  );
}
