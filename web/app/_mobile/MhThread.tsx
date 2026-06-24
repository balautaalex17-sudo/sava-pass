import { Ticket, CreditCard, ScanLine } from "lucide-react";
import { MhReveal } from "./MhReveal";

// Signature Moment 4 — the thread. Alegi → Plătești → Scanezi, joined by a cyan
// line that draws on reveal. The one earned use of 01/02/03 (a real sequence).
const STEPS = [
  { n: "01", t: "Alegi biletul", d: "Deschizi evenimentul și alegi biletul. Fără cont.", Icon: Ticket },
  { n: "02", t: "Plătești în 30s", d: "Card, Apple Pay sau Google Pay. Plată securizată.", Icon: CreditCard },
  { n: "03", t: "Scanezi la ușă", d: "Primești QR-ul pe loc și intri cu o singură scanare.", Icon: ScanLine },
];

export function MhThread() {
  return (
    <MhReveal as="section" className="mh-sec mh-thread" amount={0.25}>
      <h2 className="mh-thread__h mh-up">De la telefon, la ușă în trei pași.</h2>
      <div className="mh-thread__list">
        <span className="mh-thread__line" />
        {STEPS.map(({ n, t, d, Icon }, i) => (
          <div
            key={n}
            className="mh-step mh-up"
            style={{ "--d": `${0.12 + i * 0.1}s` } as React.CSSProperties}
          >
            <span className="mh-step__dot"><Icon strokeWidth={1.9} /></span>
            <div className="mh-step__n">{n}</div>
            <div className="mh-step__t">{t}</div>
            <div className="mh-step__d">{d}</div>
          </div>
        ))}
      </div>
    </MhReveal>
  );
}
