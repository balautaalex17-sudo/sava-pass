type ChipTone = "brand" | "success" | "danger" | "warning" | "used" | "dark";
type ChipSize = "md" | "sm";

interface ChipProps {
  children: React.ReactNode;
  tone?: ChipTone;
  dot?: boolean;
  pulse?: boolean;
  size?: ChipSize;
}

const tones: Record<ChipTone, { bg: string; fg: string; dot: string }> = {
  success: { bg: "var(--success-100)", fg: "#0F5132", dot: "var(--success)" },
  danger:  { bg: "var(--danger-100)",  fg: "#7F1D1D", dot: "var(--danger)" },
  warning: { bg: "var(--warning-100)", fg: "#78350F", dot: "var(--warning)" },
  used:    { bg: "var(--slate-100)",   fg: "var(--slate-600)", dot: "var(--slate-500)" },
  brand:   { bg: "var(--brand-cyan-100)", fg: "var(--brand-cyan-700)", dot: "var(--brand-cyan)" },
  dark:    { bg: "rgba(255,255,255,0.18)", fg: "white", dot: "white" },
};

export function Chip({ children, tone = "brand", dot = false, pulse = false, size = "md" }: ChipProps) {
  const t = tones[tone];
  const isSm = size === "sm";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: isSm ? "3px 8px" : "4px 10px",
        borderRadius: "var(--radius-pill)",
        background: t.bg,
        color: t.fg,
        fontFamily: "var(--font-sans)",
        fontSize: isSm ? 11 : 12,
        fontWeight: 600,
        letterSpacing: "0.02em",
        lineHeight: 1,
      }}
    >
      {dot && (
        <span
          className={pulse ? "anim-pulse-dot" : undefined}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: t.dot,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
