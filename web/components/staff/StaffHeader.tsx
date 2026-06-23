import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

interface StaffHeaderProps {
  left?: ReactNode;
  right?: ReactNode;
  center?: ReactNode;
}

export function StaffHeader({ left, right, center }: StaffHeaderProps) {
  return (
    <div
      style={{
        background: "white",
        borderBottom: "1px solid var(--slate-200)",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: "var(--z-sticky)" as unknown as number,
      }}
    >
      <div style={{ minWidth: 100 }}>{left}</div>
      <div>{center ?? <Logo size={18} />}</div>
      <div style={{ minWidth: 100, display: "flex", justifyContent: "flex-end" }}>{right}</div>
    </div>
  );
}
