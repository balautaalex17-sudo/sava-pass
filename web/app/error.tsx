"use client";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { GearWatermark } from "@/components/ui/GearWatermark";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--im-ink)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      textAlign: "center",
      position: "relative",
    }}>
      {/* Watermark behind content */}
      <GearWatermark />

      <div
        className="anim-fade"
        style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <div style={{ marginBottom: 32 }}><Logo size={22} /></div>
        <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--im-fg)", margin: "0 0 8px" }}>
          Ceva a mers greșit
        </h1>
        <p style={{ color: "var(--im-fg-2)", fontSize: 14, margin: "0 0 24px" }}>
          Încearcă din nou sau contactează Interact Sf. Sava.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <Button variant="primary" onClick={reset}>
            Încearcă din nou
          </Button>
          <Link
            href="/"
            className="btn btn--secondary pressable hover-dim"
          >
            Acasă
          </Link>
        </div>
      </div>
    </div>
  );
}
