import { ArrowRight } from "lucide-react";
import { MhReveal } from "./MhReveal";

// Signature Moment 5 — the invitation. Full-bleed students photo, one line,
// one CTA. A deliberately different layout family from everything above.
export function MhMembership() {
  return (
    <MhReveal as="section" className="mh-join" amount={0.2}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mh-join__photo" src="/landing/about.jpg" alt="" loading="lazy" />
      <div className="mh-join__scrim" />
      <h2 className="mh-join__h mh-up">
        Nu doar bilete.<br />O <span style={{ color: "var(--mh-cyan)" }}>comunitate</span>.
      </h2>
      <p className="mh-join__p mh-up" style={{ "--d": "0.08s" } as React.CSSProperties}>
        Interact Sf. Sava e clubul care organizează serile. Vino să le construiești.
      </p>
      <div className="mh-up" style={{ "--d": "0.16s" } as React.CSSProperties}>
        <a className="mh-btn mh-btn--primary" href="/devino-membru">
          Devino membru
          <span className="mh-ar"><ArrowRight size={18} strokeWidth={2.2} /></span>
        </a>
      </div>
    </MhReveal>
  );
}
