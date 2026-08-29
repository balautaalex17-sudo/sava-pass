import type { ReactNode } from "react";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="staff-shell" style={{ minHeight: "100vh", background: "var(--im-ink)" }}>
      {children}
      <style>{`
        @media (max-width: 860px) {
          .staff-shell input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
          .staff-shell select,
          .staff-shell textarea {
            min-height: 44px !important;
            font-size: 16px !important;
          }
          .staff-shell button,
          .staff-shell a.pressable,
          .staff-shell a[class*="-back"],
          .staff-shell details > summary {
            min-height: 44px;
          }
          .staff-shell a.pressable,
          .staff-shell a[class*="-back"],
          .staff-shell details > summary {
            display: flex;
            align-items: center;
          }
          .staff-shell label:has(input[type="checkbox"]),
          .staff-shell label:has(input[type="radio"]) {
            min-height: 44px;
          }
          .staff-shell dialog,
          .staff-shell [role="dialog"] {
            max-height: calc(100dvh - 28px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
            overflow-y: auto;
            overscroll-behavior: contain;
          }
        }
      `}</style>
    </div>
  );
}
