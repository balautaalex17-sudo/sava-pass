import Image from "next/image";
import { mediaUrl } from "@/lib/storage";
import type { Sponsor } from "@/lib/supabase/types";

const TIER_LABELS: Record<string, string> = {
  principal: "Parteneri principali",
  sustinator: "Susținători",
  partener: "Parteneri",
};
const TIER_ORDER = ["principal", "sustinator", "partener"];

/** Public sponsor wall grouped by tier (spec §U8). Logos come from Storage
 * (next/image, object-fit contain so mixed aspect ratios stay tidy); a sponsor
 * with no logo falls back to its name set in the same plate. */
export function SponsorWall({ sponsors }: { sponsors: Sponsor[] }) {
  const groups = new Map<string, Sponsor[]>();
  for (const s of sponsors) {
    const t = s.tier || "partener";
    (groups.get(t) ?? groups.set(t, []).get(t)!).push(s);
  }
  const tiers = [...groups.keys()].sort((a, b) => {
    const ia = TIER_ORDER.indexOf(a);
    const ib = TIER_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="cl-spon">
      {tiers.map((t) => (
        <section key={t} className="cl-spon-tier anim-rise">
          <div className="cl-spon-tier__label cl-label">{TIER_LABELS[t] ?? t}</div>
          <div className="cl-spon-grid">
            {groups.get(t)!.map((s) => {
              const logo = mediaUrl(s.logo_path);
              const inner = logo ? (
                <span className="cl-spon__logo">
                  <Image src={logo} alt={s.name} fill sizes="200px" style={{ objectFit: "contain" }} />
                </span>
              ) : (
                <span className="cl-spon__name">{s.name}</span>
              );
              return s.url ? (
                <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="cl-spon__cell" aria-label={s.name}>
                  {inner}
                </a>
              ) : (
                <div key={s.id} className="cl-spon__cell">{inner}</div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
