import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

interface HomeNavProps {
  /** Active-event href (falls back to #event when no live event). */
  eventHref: string;
  /** Key of the current page for active-link highlight (despre/proiecte/echipa/evenimente/membru). */
  active?: string;
}

/** Primary site nav — one clean line (spec §6.2). Secondaries live in the footer. */
const LINKS = [
  { label: "Despre", href: "/despre", key: "despre" },
  { label: "Proiecte", href: "/proiecte", key: "proiecte" },
  { label: "Echipă", href: "/echipa", key: "echipa" },
  { label: "Evenimente", href: "__EVENT__", key: "evenimente" },
  { label: "Devino membru", href: "/devino-membru", key: "membru" },
];

/** Demoted to the mobile sheet (and the footer) so the desktop nav stays one line. */
const SECONDARY = [
  { label: "Sponsori", href: "/sponsori" },
  { label: "District 2241", href: "/district" },
  { label: "Contact", href: "/contact" },
  { label: "Contul meu", href: "/conta" },
  { label: "Check-in", href: "/scanner" },
];

/**
 * Public site nav, rendered on the immersive landing and every club page. Server
 * component with a CSS-only `<details>` mobile disclosure — zero client JS on the
 * LCP path. Dark immersive register; namespaced `.hnav-*`. No backdrop-filter.
 */
export function HomeNav({ eventHref, active }: HomeNavProps) {
  const resolve = (href: string) => (href === "__EVENT__" ? eventHref : href);

  return (
    <nav className="hnav" aria-label="Navigare principală">
      <Link href="/" className="hnav__brand" aria-label="SavaPass — acasă">
        <Logo size={20} />
      </Link>

      {/* Desktop links */}
      <div className="hnav__links">
        {LINKS.map((l) => {
          const isActive = active === l.key;
          return (
            <Link
              key={l.key}
              href={resolve(l.href)}
              className={isActive ? "hnav__link hnav__link--active" : "hnav__link"}
              aria-current={isActive ? "page" : undefined}
            >
              {l.label}
            </Link>
          );
        })}
        <Link href={eventHref} className="hnav__cta">Cumpără bilet</Link>
      </div>

      {/* Mobile disclosure — CSS-only via <details>, no client JS */}
      <details className="hnav__m">
        <summary className="hnav__burger" aria-label="Meniu">
          <Menu className="hnav__i hnav__i--open" size={22} strokeWidth={2} />
          <X className="hnav__i hnav__i--close" size={22} strokeWidth={2} />
        </summary>
        <div className="hnav__sheet">
          {LINKS.map((l) => (
            <Link key={l.key} href={resolve(l.href)} className="hnav__sheet-link">{l.label}</Link>
          ))}
          <Link href={eventHref} className="hnav__sheet-cta">Cumpără bilet</Link>
          <div className="hnav__sheet-sep" />
          {SECONDARY.map((l) => (
            <Link key={l.href} href={l.href} className="hnav__sheet-link hnav__sheet-link--sec">{l.label}</Link>
          ))}
        </div>
      </details>

      <style>{`
        .hnav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 900;
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px clamp(16px, 4vw, 40px);
          background: linear-gradient(180deg, rgba(7,10,18,0.92) 0%, rgba(7,10,18,0) 100%);
        }
        .hnav__brand { text-decoration: none; display: inline-flex; align-items: center; }
        .hnav__links { display: flex; align-items: center; gap: clamp(12px, 1.8vw, 26px); }
        .hnav__link {
          color: rgba(234,244,251,0.78); text-decoration: none;
          font-family: var(--font-sans); font-size: 14px; font-weight: 600; letter-spacing: -0.01em;
          transition: color 160ms ease;
        }
        .hnav__link:hover { color: #fff; }
        .hnav__link--active { color: var(--im-fg); border-bottom: 2px solid var(--im-cyan); padding-bottom: 3px; }
        .hnav__cta {
          display: inline-flex; align-items: center;
          padding: 10px 18px; border-radius: 999px; text-decoration: none;
          background: linear-gradient(135deg, #00B8F0 0%, #2563EB 100%);
          color: #fff; font-family: var(--font-sans); font-size: 14px; font-weight: 700;
          box-shadow: 0 10px 26px rgba(0,167,232,0.28);
        }

        /* Mobile disclosure */
        .hnav__m { display: none; }
        .hnav__m > summary { list-style: none; cursor: pointer; }
        .hnav__m > summary::-webkit-details-marker { display: none; }
        .hnav__burger {
          width: 42px; height: 42px; border-radius: 12px;
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(0,167,232,0.20); color: #EAF4FB;
        }
        .hnav__i--close { display: none; }
        .hnav__m[open] .hnav__i--open { display: none; }
        .hnav__m[open] .hnav__i--close { display: inline-flex; }
        .hnav__sheet {
          position: absolute; top: 100%; left: clamp(12px, 4vw, 40px); right: clamp(12px, 4vw, 40px);
          display: flex; flex-direction: column; gap: 4px;
          padding: 10px; border-radius: 16px;
          background: rgba(11,19,32,0.98);
          border: 1px solid rgba(0,167,232,0.18);
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }
        .hnav__sheet-link {
          padding: 13px 14px; border-radius: 10px; text-decoration: none;
          color: #EAF4FB; font-family: var(--font-sans); font-size: 15px; font-weight: 600;
        }
        .hnav__sheet-link--sec { color: rgba(234,244,251,0.66); font-size: 14px; font-weight: 500; }
        .hnav__sheet-link:active { background: rgba(255,255,255,0.06); }
        .hnav__sheet-sep { height: 1px; margin: 6px 8px; background: rgba(234,244,251,0.10); }
        .hnav__sheet-cta {
          margin-top: 4px; padding: 14px; border-radius: 12px; text-align: center; text-decoration: none;
          background: linear-gradient(135deg, #00B8F0 0%, #2563EB 100%);
          color: #fff; font-family: var(--font-sans); font-size: 15px; font-weight: 700;
        }

        @media (max-width: 860px) {
          .hnav__links { display: none; }
          .hnav__m { display: block; }
        }
      `}</style>
    </nav>
  );
}
