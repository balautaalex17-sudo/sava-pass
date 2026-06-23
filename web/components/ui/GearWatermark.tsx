// Server component — no "use client" needed

export function GearWatermark() {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  const dots = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const innerR = r * 0.47;
    const outerR = r * 0.65;
    const x1 = cx + Math.cos(a) * innerR;
    const y1 = cy + Math.sin(a) * innerR;
    const x2 = cx + Math.cos(a) * outerR;
    const y2 = cy + Math.sin(a) * outerR;
    return { x1, y1, x2, y2 };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        color: "var(--slate-300)",
        opacity: 0.08,
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r * 0.25}
        stroke="currentColor"
        strokeWidth={size * 0.05}
      />
      {dots.map((d, i) => (
        <line
          key={i}
          x1={d.x1}
          y1={d.y1}
          x2={d.x2}
          y2={d.y2}
          stroke="currentColor"
          strokeWidth={size * 0.05}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
