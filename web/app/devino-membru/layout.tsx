import type { ReactNode } from "react";


export default function MembershipLayout({ children }: { children: ReactNode }) {
  return (
    <div className="sp-light apply-page">
      <style>{`
        .apply-page {
          min-height: 100vh;
          background: var(--white);
          color: var(--slate-900);
          color-scheme: light;
        }
      `}</style>
      {children}
    </div>
  );
}
