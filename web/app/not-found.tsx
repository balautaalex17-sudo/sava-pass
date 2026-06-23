import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { GearWatermark } from "@/components/ui/GearWatermark";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--slate-50)",
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
        className="anim-rise"
        style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <div style={{ marginBottom: 32 }}><Logo size={22} /></div>
        <div style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 72,
          color: "var(--brand-navy)",
          lineHeight: 1,
        }}>
          404
        </div>
        <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--brand-navy)", margin: "12px 0 8px" }}>
          Pagina nu există
        </h1>
        <p style={{ color: "var(--slate-500)", fontSize: 14, margin: "0 0 28px" }}>
          Link-ul e greșit sau a expirat.
        </p>
        <Link
          href="/"
          className="btn btn--primary pressable hover-dim"
        >
          Înapoi acasă
        </Link>
      </div>
    </div>
  );
}
