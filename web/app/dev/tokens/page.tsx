export default function TokensPage() {
  const colors = [
    { name: "brand-cyan", val: "#009FE3" },
    { name: "brand-cyan-600", val: "#0089C4" },
    { name: "brand-cyan-100", val: "#E0F4FC" },
    { name: "brand-blue", val: "#2563EB" },
    { name: "brand-navy", val: "#0F172A" },
    { name: "slate-50", val: "#F8FAFC" },
    { name: "slate-200", val: "#E2E8F0" },
    { name: "slate-400", val: "#94A3B8" },
    { name: "slate-500", val: "#64748B" },
    { name: "slate-900", val: "#0F172A" },
    { name: "success", val: "#16A34A" },
    { name: "warning", val: "#F59E0B" },
    { name: "danger", val: "#DC2626" },
  ];

  return (
    <div style={{ padding: 40, background: "var(--bg-app)", minHeight: "100vh" }}>
      <h1 style={{ fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 32, marginBottom: 8 }}>
        SavaPass Design Tokens
      </h1>
      <p style={{ fontFamily: "var(--font-sans)", color: "var(--fg-tertiary)", marginBottom: 40 }}>
        Verify fonts + colors match the prototype before building screens.
      </p>

      {/* Fonts */}
      <section style={{ marginBottom: 48 }}>
        <div className="t-eyebrow" style={{ marginBottom: 16 }}>Fonts</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div className="t-caption" style={{ marginBottom: 4 }}>UI — Manrope (--font-sans)</div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>
              Echoes Unplugged
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 400 }}>
              O seară caldă de muzică acustică, organizată de Interact Sf. Sava.
            </p>
          </div>
          <div>
            <div className="t-caption" style={{ marginBottom: 4 }}>Display — Instrument Serif (--font-display)</div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 44, fontStyle: "italic", lineHeight: 1.05 }}>
              Ne vedem vineri.
            </p>
          </div>
          <div>
            <div className="t-caption" style={{ marginBottom: 4 }}>Mono — JetBrains Mono (--font-mono)</div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, letterSpacing: "0.04em" }}>
              K7F2MQ · SP-2611-AV
            </p>
          </div>
        </div>
      </section>

      {/* Colors */}
      <section style={{ marginBottom: 48 }}>
        <div className="t-eyebrow" style={{ marginBottom: 16 }}>Colors</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {colors.map((c) => (
            <div key={c.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "var(--radius-md)",
                  background: c.val,
                  border: "1px solid var(--border-subtle)",
                }}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-tertiary)" }}>
                {c.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Radii */}
      <section style={{ marginBottom: 48 }}>
        <div className="t-eyebrow" style={{ marginBottom: 16 }}>Radii + Shadows</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { label: "xs (6px)", r: "var(--radius-xs)" },
            { label: "sm (10px)", r: "var(--radius-sm)" },
            { label: "md (14px)", r: "var(--radius-md)" },
            { label: "lg (20px)", r: "var(--radius-lg)" },
            { label: "xl (28px)", r: "var(--radius-xl)" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                width: 80,
                height: 80,
                background: "var(--brand-cyan-100)",
                border: "1px solid var(--brand-cyan)",
                borderRadius: item.r,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--brand-cyan-700)",
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </section>

      {/* Gradients */}
      <section>
        <div className="t-eyebrow" style={{ marginBottom: 16 }}>Gradients</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { label: "grad-brand", g: "var(--grad-brand)" },
            { label: "grad-brand-soft", g: "var(--grad-brand-soft)" },
            { label: "grad-night", g: "var(--grad-night)" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                width: 160,
                height: 80,
                background: item.g,
                borderRadius: "var(--radius-lg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "#fff",
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
