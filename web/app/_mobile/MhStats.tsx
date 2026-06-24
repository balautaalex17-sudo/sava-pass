import { CountUp } from "@/components/landing/CountUp";
import { MhReveal } from "./MhReveal";

// Signature Moment 3 — the ribbon. Count-up figures on a cyan hairline (NOT a
// 3-metric card grid). `editions` is real from past events; bilete/RON are the
// brand's stated cumulative impact (illustrative — TODO live aggregate).
export function MhStats({ editions }: { editions: number }) {
  return (
    <MhReveal as="section" className="mh-sec mh-ribbon" amount={0.4}>
      <div className="mh-ribbon__grid">
        <div className="mh-ribbon__fig mh-up" style={{ "--d": "0s" } as React.CSSProperties}>
          <div className="mh-ribbon__n"><em><CountUp value={editions} /></em></div>
          <div className="mh-ribbon__l">ediții organizate</div>
        </div>
        <div className="mh-ribbon__fig mh-up" style={{ "--d": "0.08s" } as React.CSSProperties}>
          <div className="mh-ribbon__n"><CountUp value={264} /></div>
          <div className="mh-ribbon__l">bilete vândute</div>
        </div>
        <div className="mh-ribbon__fig mh-up" style={{ "--d": "0.16s" } as React.CSSProperties}>
          <div className="mh-ribbon__n"><CountUp value={13.5} decimals={1} suffix="K" /></div>
          <div className="mh-ribbon__l">RON pentru cultură</div>
        </div>
      </div>
    </MhReveal>
  );
}
