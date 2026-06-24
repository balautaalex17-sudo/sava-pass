// The Interact brand gear (circle + 8 spokes), currentColor + freely styleable.
// Same construction as components/ui/Logo so the mark stays consistent.

export function MhGear({
  size = 24,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const dots = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return {
      x1: 12 + Math.cos(a) * 6,
      y1: 12 + Math.sin(a) * 6,
      x2: 12 + Math.cos(a) * 8.5,
      y2: 12 + Math.sin(a) * 8.5,
    };
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      {dots.map((d, i) => (
        <line
          key={i}
          x1={d.x1}
          y1={d.y1}
          x2={d.x2}
          y2={d.y2}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
