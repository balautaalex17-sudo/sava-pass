interface EyebrowProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function Eyebrow({ children, color, className }: EyebrowProps) {
  return (
    <div
      className={className}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: color ?? "var(--fg-link)",
      }}
    >
      {children}
    </div>
  );
}
