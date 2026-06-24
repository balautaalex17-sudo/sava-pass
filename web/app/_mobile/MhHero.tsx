import { ArrowRight } from "lucide-react";
import { MhReveal } from "./MhReveal";
import { MhGear } from "./MhGear";

// Signature Moment 1 — the door. Full-bleed photo + ink scrim, clip/mask
// headline reveal (line-by-line, staggered), slow gear behind, two full-width CTAs.
export function MhHero({ ctaHref, hasEvent }: { ctaHref: string; hasEvent: boolean }) {
  return (
    <MhReveal as="section" className="mh-hero" amount={0.01}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mh-hero__photo" src="/landing/hero.jpg" alt="" fetchPriority="high" />
      <div className="mh-hero__scrim" />
      <MhGear className="mh-gear" size={230} />

      <div className="mh-hero__inner">
        <span className="mh-eyebrow mh-up" style={{ "--d": "0.05s" } as React.CSSProperties}>
          Interact Sf. Sava · Curtea Veche
        </span>

        <h1 className="mh-hero__head">
          <span className="mh-hl"><span style={{ "--d": "0.06s" } as React.CSSProperties}>Biletul tău,</span></span>
          <span className="mh-hl"><span style={{ "--d": "0.14s" } as React.CSSProperties}><span className="c">digital</span>.</span></span>
          <span className="mh-hl"><span style={{ "--d": "0.22s" } as React.CSSProperties}>Scanezi, <span className="mh-serif">intri</span>.</span></span>
        </h1>

        <p className="mh-hero__sub mh-up" style={{ "--d": "0.34s" } as React.CSSProperties}>
          Cumperi în 30 de secunde, primești QR-ul pe loc. Fără cont, fără hârtie.
        </p>

        <div className="mh-hero__cta mh-up" style={{ "--d": "0.42s" } as React.CSSProperties}>
          <a className="mh-btn mh-btn--primary" href={ctaHref}>
            {hasEvent ? "Vezi evenimentul" : "Vezi evenimentele"}
            <span className="mh-ar"><ArrowRight size={18} strokeWidth={2.2} /></span>
          </a>
          <a className="mh-btn mh-btn--ghost" href="#mh-arhiva">Vezi arhiva</a>
        </div>

        <span className="mh-hero__scroll mh-up" style={{ "--d": "0.5s" } as React.CSSProperties}>
          Derulează <i />
        </span>
      </div>
    </MhReveal>
  );
}
