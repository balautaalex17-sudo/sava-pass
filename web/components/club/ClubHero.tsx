import Image from "next/image";

type ClubHeroVariant = "editorial" | "cinematic" | "index";

export interface ClubHeroProps {
  variant: ClubHeroVariant;
  /** Optional mono metadata word (a year, a count) — never an eyebrow taxonomy. */
  kicker?: string;
  /** Headline lines; each rises out of its own mask. A line may include <span className="cl-hero__accent">…</span>. */
  lines: React.ReactNode[];
  lead?: string;
  /** index variant: inline mono count of what's below, e.g. "12 proiecte · 4 ani". */
  count?: string;
  /** cinematic variant: full-bleed background image. */
  media?: { src: string; alt: string };
  cta?: React.ReactNode;
}

/**
 * The one hero component for the club register. Variant controls layout so heroes
 * vary within a shared grammar (spec §6.3). One mount entrance: masked headline
 * rise (`.line-mask`) + a Ken-Burns settle on the cinematic image; kicker/lead/cta
 * fade in after. No scroll-jacking, no parallax (that's the landing's job).
 */
export function ClubHero({ variant, kicker, lines, lead, count, media, cta }: ClubHeroProps) {
  return (
    <header className={`cl-hero cl-hero--${variant}`}>
      {variant === "cinematic" && media && (
        <>
          <div className="cl-hero__media">
            <Image src={media.src} alt={media.alt} fill priority sizes="100vw" className="anim-zoom-settle" style={{ objectFit: "cover" }} />
          </div>
          <div className="cl-hero__scrim" />
        </>
      )}
      <div className="cl-hero__inner">
        {kicker && <span className="cl-hero__kicker cl-label">{kicker}</span>}
        <h1 className="cl-hero__title">
          {lines.map((line, i) => (
            <span key={i} className="line-mask">
              <span style={{ animationDelay: `${i * 90}ms` }}>{line}</span>
            </span>
          ))}
        </h1>
        {lead && <p className="cl-hero__lead anim-fade" style={{ animationDelay: "200ms" }}>{lead}</p>}
        {count && <div className="cl-hero__count anim-fade" style={{ animationDelay: "260ms" }}>{count}</div>}
        {cta && <div className="cl-hero__cta anim-fade" style={{ animationDelay: "320ms" }}>{cta}</div>}
      </div>
    </header>
  );
}
