import Image from "next/image";

type ClubHeroVariant = "editorial" | "cinematic" | "index";

export interface ClubHeroProps {
  variant: ClubHeroVariant;
  /** Optional context label, such as a district or beneficiary. */
  kicker?: string;
  /** Headline lines; each rises out of its own mask. A line may include <span className="cl-hero__accent">…</span>. */
  lines: React.ReactNode[];
  lead?: string;
  /** Index variant: inline count of what appears below. */
  count?: string;
  /** cinematic variant: full-bleed background image. */
  media?: { src: string; alt: string; mobilePosition?: string };
  cta?: React.ReactNode;
}

/**
 * Shared hero structure for the club pages. Each route chooses an editorial,
 * image-led, or compact index composition without forcing the same headline trick.
 */
export function ClubHero({ variant, kicker, lines, lead, count, media, cta }: ClubHeroProps) {
  return (
    <header className={`cl-hero cl-hero--${variant}`}>
      {variant === "cinematic" && media && (
        <>
          <div
            className="cl-hero__media"
            style={media.mobilePosition ? { "--cl-mobile-position": media.mobilePosition } as React.CSSProperties : undefined}
          >
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
