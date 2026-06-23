interface LogoProps {
  size?: number;
  dark?: boolean;
  showWordmark?: boolean;
}

export function Logo({ size = 22, dark = false, showWordmark = true }: LogoProps) {
  const cyan = dark ? "#ffffff" : "#009FE3";
  // Non-dark wordmark follows the theme foreground so it flips automatically
  // to light on immersive (dark) surfaces; dark={true} still forces white.
  const text = dark ? "#ffffff" : "var(--fg-primary)";

  const dots = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const x1 = 12 + Math.cos(a) * 6;
    const y1 = 12 + Math.sin(a) * 6;
    const x2 = 12 + Math.cos(a) * 8.5;
    const y2 = 12 + Math.sin(a) * 8.5;
    return { x1, y1, x2, y2 };
  });

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <svg
        className="logo-gear"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="12" cy="12" r="3.2" stroke={cyan} strokeWidth="1.6" />
        {dots.map((d, i) => (
          <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={cyan} strokeWidth="1.6" strokeLinecap="round" />
        ))}
      </svg>
      {showWordmark && (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: size * 0.72,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: text,
            lineHeight: 1,
          }}
        >
          SavaPass
        </span>
      )}
    </div>
  );
}
