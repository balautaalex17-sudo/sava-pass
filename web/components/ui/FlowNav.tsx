import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Light sticky top nav for the buy + recruiting flows ("Desktop Flow" design).
 * Must be rendered inside a `.sp-light` subtree so the Logo wordmark + tokens
 * resolve to the light palette instead of the app-wide immersive dark remap.
 */
export function FlowNav({ backHref = "/", right }: { backHref?: string; right?: React.ReactNode }) {
  return (
    <header className="flow-nav">
      <Link href={backHref} className="pressable flow-nav__back" aria-label="Înapoi">
        <ChevronLeft size={20} strokeWidth={1.75} />
      </Link>
      <div className="flow-nav__right">{right}</div>
      <style>{`
        .flow-nav {
          position: sticky;
          top: 0;
          z-index: var(--z-nav);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: rgba(255,255,255,0.97);
          border-bottom: 1px solid var(--slate-200);
        }
        .flow-nav__back { text-decoration: none; }
        .flow-nav__back {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-pill);
          background: var(--white);
          border: 1px solid var(--slate-200);
          display: grid;
          place-items: center;
          color: var(--slate-900);
        }
        .flow-nav__right { min-width: 36px; display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
        @media (max-width: 820px) {
          .flow-nav { padding: max(8px, env(safe-area-inset-top)) 16px 8px; }
          .flow-nav__back { width: 44px; height: 44px; }
          .flow-nav__right { min-width: 44px; }
        }
      `}</style>
    </header>
  );
}
