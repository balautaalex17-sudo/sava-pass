import { ArrowRight } from "lucide-react";
import { MhGear } from "./MhGear";

// Desktop-only sticky header (CSS hides it <=900px). Logo left, primary CTA right.
export function MhHeader({ ctaHref, priceRon, hasEvent }: { ctaHref: string; priceRon: number | null; hasEvent: boolean }) {
  return (
    <header className="mh-head">
      <a className="mh-head__brand" href="#" aria-label="SavaPass">
        <MhGear size={24} style={{ color: "var(--mh-cyan)" }} />
        SavaPass
      </a>
      <nav className="mh-head__nav">
        <a href="#mh-eveniment">Eveniment</a>
        <a href="#mh-cum">Cum funcționează</a>
        <a href="/devino-membru">Devino membru</a>
      </nav>
      <a className="mh-head__cta" href={ctaHref}>
        {hasEvent && priceRon != null ? (
          <>Cumpără bilet · <span className="mh-num">{priceRon} RON</span></>
        ) : (
          "Vezi evenimentele"
        )}
        <ArrowRight size={17} strokeWidth={2.2} />
      </a>
    </header>
  );
}
