import type { ReactNode } from "react";


export default function ContaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="conta-layout">
      <div className="conta-layout__content">{children}</div>

      <style>{`
        .conta-layout {
          --conta-nav-offset: 92px;
          min-height: 100dvh;
          background: var(--im-ink);
        }
        body:has(.conta-layout) .hnav {
          z-index: var(--z-nav);
        }
        .conta-layout__content {
          min-height: 100dvh;
          padding-top: var(--conta-nav-offset);
        }

        @media (max-width: 820px) {
          .conta-layout {
            --conta-nav-offset: 76px;
          }
        }
      `}</style>
    </div>
  );
}
