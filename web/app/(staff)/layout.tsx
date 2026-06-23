import type { ReactNode } from "react";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--slate-50)" }}>
      {children}
    </div>
  );
}
