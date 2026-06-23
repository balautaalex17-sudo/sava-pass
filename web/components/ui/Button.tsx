"use client";

type ButtonVariant = "primary" | "secondary" | "ghost" | "navy";
type ButtonSize = "md" | "sm";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  full?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  size?: ButtonSize;
}

export function Button({
  children,
  variant = "primary",
  full = false,
  loading = false,
  icon,
  size = "md",
  disabled,
  style,
  className,
  ...props
}: ButtonProps) {
  const variantClass = `btn--${variant}`;
  const sizeClass = size === "sm" ? "btn--sm" : "";
  // hover-dim (filter brightness) only for solid fills; ghost uses CSS color shift
  const usesHoverDim = variant !== "ghost";

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={["btn", variantClass, sizeClass, "pressable", usesHoverDim ? "hover-dim" : "", className].filter(Boolean).join(" ")}
      style={{
        width: full ? "100%" : undefined,
        opacity: disabled || loading ? 0.4 : 1,
        pointerEvents: disabled || loading ? "none" : undefined,
        ...style,
      }}
    >
      {loading && (
        <span
          className="anim-spin-slow"
          style={{
            width: 16,
            height: 16,
            border: "2px solid rgba(255,255,255,0.3)",
            borderTopColor: "white",
            borderRadius: "50%",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      )}
      {icon}
      {children}
    </button>
  );
}
