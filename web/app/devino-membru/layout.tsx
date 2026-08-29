import type { ReactNode } from "react";

import { HomeNav } from "@/app/HomeNav";

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
      <HomeNav active="membru" immersive />
      {children}
    </div>
  );
}
