"use client";
import Link from "next/link";

interface BuyCtaProps {
  slug: string;
  priceRon: number;
  isSoldOut: boolean;
  accent: string;
}

export function BuyCta({ slug, priceRon, isSoldOut, accent }: BuyCtaProps) {
  return (
    <div
      className="buy-cta-shell anim-rise"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: "var(--z-cta)" as unknown as number,
        padding: "14px 20px max(28px, env(safe-area-inset-bottom, 16px))",
        background: "rgba(7,10,18,0.96)",
        borderTop: "1px solid var(--im-line)",
        animationDelay: "120ms",
      }}
    >
      <div style={{ maxWidth: 440, margin: "0 auto" }}>
        {isSoldOut ? (
          <div
            style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: 14,
              textAlign: "center",
              background: "var(--im-ink-3)",
              color: "var(--im-fg-3)",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            Sold out
          </div>
        ) : (
          <Link
            href={`/${slug}/checkout`}
            className="pressable hover-dim"
            style={{
              display: "block",
              width: "100%",
              padding: "15px 18px",
              borderRadius: 14,
              background: `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`,
              color: "white",
              fontWeight: 800,
              fontSize: 15,
              textAlign: "center",
              textDecoration: "none",
              boxShadow: "0 12px 30px rgba(0,159,227,0.30)",
            }}
          >
            Cumpără bilet · <span style={{ fontFamily: "var(--font-mono)" }}>{priceRon} RON</span>
          </Link>
        )}
      </div>
      <style>{`
        @media (min-width: 901px) {
          .buy-cta-shell {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
