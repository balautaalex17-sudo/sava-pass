import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { MembershipForm } from "./MembershipForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Devino membru — Interact Sf. Sava",
  description: "Înscrierile pentru noua generație de membri Interact Sf. Sava. Patru minute de aplicație, un scurt interviu, apoi ești în echipă.",
};

const STEPS = [
  { n: "01", title: "Trimiți aplicația", meta: "4 minute · 2-3 întrebări scurte", when: "Astăzi" },
  { n: "02", title: "Confirmare pe email", meta: "Imediat după trimitere", when: "Instant" },
  { n: "03", title: "Invitație la interviu", meta: "Alegi singur slotul, online sau în liceu", when: "În 5 zile" },
  { n: "04", title: "Bun venit la Interact", meta: "Prima ședință și mentor desemnat", when: "~2 săpt." },
];

export default function MembershipPage() {
  return (
    <div className="apply-page">
      <ApplyStyles />
      <header className="apply-nav">
        <Link href="/" className="pressable apply-nav__back" aria-label="Înapoi la pagina principală">
          <ChevronLeft size={20} strokeWidth={1.75} />
        </Link>
        <Link href="/" className="logo-spin apply-nav__logo">
          <Logo size={18} />
        </Link>
        <div className="apply-nav__spacer" />
      </header>

      <main className="apply-shell">
        <section className="apply-hero anim-rise">
          <span className="apply-eyebrow">Devino membru · Toamna 2025</span>
          <h1>
            De partea cealaltă <span className="apply-accent">a serii.</span>
          </h1>
          <p>
            Înscrierile pentru noua generație de membri sunt deschise până pe 30 noiembrie.
            Patru minute de aplicație, un scurt interviu, apoi ești în echipă.
          </p>
          <a href="#aplica" className="pressable apply-cta">Aplică acum</a>
        </section>

        <section className="apply-steps">
          <h2 className="apply-steps__title">Cum decurge</h2>
          <div className="apply-steps__list anim-stagger">
            {STEPS.map((step, i) => (
              <div key={step.n} className="apply-step anim-rise-fast" style={{ "--i": i } as React.CSSProperties}>
                <span className="apply-step__num">{step.n}</span>
                <div className="apply-step__body">
                  <strong>{step.title}</strong>
                  <small>{step.meta}</small>
                </div>
                <span className="apply-step__when">{step.when}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="apply-formwrap anim-rise">
          <h2 className="apply-formwrap__title">Aplică</h2>
          <p className="apply-formwrap__lead">Nu te alături unei aplicații. Te alături unei echipe.</p>
          <MembershipForm />
        </section>
      </main>
    </div>
  );
}

function ApplyStyles() {
  return (
    <style>{`
      .apply-page { min-height: 100vh; background: var(--im-ink); color: var(--im-fg); }

      .apply-nav {
        position: sticky; top: 0; z-index: var(--z-nav);
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 20px;
        background: rgba(7,10,18,0.92);
        border-bottom: 1px solid var(--im-line);
      }
      .apply-nav__back, .apply-nav__logo { text-decoration: none; }
      .apply-nav__back {
        width: 36px; height: 36px; border-radius: var(--radius-pill);
        background: var(--im-ink-3); border: 1px solid var(--im-line);
        display: grid; place-items: center; color: var(--im-fg);
      }
      .apply-nav__spacer { width: 36px; }

      .apply-shell {
        width: min(560px, calc(100% - 40px));
        margin: 0 auto;
        padding: 40px 0 80px;
      }

      .apply-eyebrow {
        display: inline-block;
        font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
        text-transform: uppercase; color: var(--im-cyan-light);
        margin-bottom: 16px;
      }
      .apply-hero h1 {
        margin: 0;
        font-size: clamp(32px, 7vw, 44px);
        font-weight: 800; line-height: 1.04; letter-spacing: -0.03em;
        color: var(--im-fg);
      }
      .apply-accent {
        font-family: var(--font-display); font-style: italic; font-weight: 400;
        background: var(--im-grad);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
      }
      .apply-hero p {
        margin: 16px 0 0; max-width: 460px;
        color: var(--im-fg-2); font-size: 16px; line-height: 1.6;
      }
      .apply-cta {
        display: inline-flex; align-items: center; justify-content: center;
        margin-top: 24px; padding: 14px 26px; border-radius: var(--radius-md);
        background: var(--im-grad); color: #fff; font-weight: 700; font-size: 15px;
        text-decoration: none; box-shadow: var(--im-glow);
      }

      .apply-steps { margin-top: 56px; }
      .apply-steps__title, .apply-formwrap__title {
        margin: 0 0 16px; font-size: 16px; font-weight: 800; color: var(--im-fg);
      }
      .apply-steps__list {
        border: 1px solid var(--im-line); border-radius: var(--radius-lg);
        overflow: hidden; background: var(--im-ink-2);
      }
      .apply-step {
        display: flex; align-items: center; gap: 16px;
        padding: 16px 18px; border-bottom: 1px solid var(--im-line-soft);
      }
      .apply-step:last-child { border-bottom: none; }
      .apply-step__num {
        font-family: var(--font-mono); font-size: 13px; font-weight: 700;
        color: var(--im-cyan-light); flex-shrink: 0; width: 22px;
      }
      .apply-step__body { flex: 1; min-width: 0; }
      .apply-step__body strong { display: block; font-size: 15px; font-weight: 700; color: var(--im-fg); }
      .apply-step__body small { display: block; margin-top: 2px; font-size: 13px; color: var(--im-fg-2); }
      .apply-step__when {
        flex-shrink: 0; font-size: 12px; font-weight: 600; color: var(--im-fg-3);
        padding: 5px 10px; border-radius: var(--radius-pill);
        border: 1px solid var(--im-line-soft);
      }

      .apply-formwrap { margin-top: 56px; }
      .apply-formwrap__lead {
        margin: -8px 0 20px; font-family: var(--font-display); font-style: italic;
        font-size: 18px; color: var(--im-fg-2);
      }

      .apply-form { display: grid; gap: 16px; }
      .apply-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .apply-field { display: grid; gap: 7px; }
      .apply-field > span { font-size: 13px; font-weight: 800; color: var(--im-fg); }
      .apply-field input, .apply-field textarea {
        width: 100%; box-sizing: border-box;
        padding: 13px 14px; border-radius: var(--radius-md);
        border: 1px solid var(--im-line); background: var(--im-ink-2);
        color: var(--im-fg); font-family: var(--font-sans); font-size: 15px;
        outline: none;
      }
      .apply-field input::placeholder, .apply-field textarea::placeholder { color: var(--im-fg-3); }
      .apply-field input:focus, .apply-field textarea:focus { border-color: var(--im-cyan); }
      .apply-field__error { color: #FCA5A5; font-size: 12px; }

      .apply-consent {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 14px; border: 1px solid var(--im-line);
        border-radius: var(--radius-md); background: var(--im-ink-2); cursor: pointer;
      }
      .apply-consent input { width: 16px; height: 16px; margin-top: 2px; accent-color: var(--im-cyan); flex-shrink: 0; }
      .apply-consent span { color: var(--im-fg-2); font-size: 13px; line-height: 1.5; }

      .apply-error {
        padding: 12px 14px; border-radius: var(--radius-md);
        background: rgba(225,29,72,0.14); border: 1px solid rgba(225,29,72,0.34);
        color: #FCA5A5; font-size: 13px; font-weight: 700;
      }

      .apply-sent {
        text-align: center; padding: 40px 24px;
        border: 1px solid var(--im-line); border-radius: var(--radius-lg);
        background: var(--im-ink-2);
      }
      .apply-sent__icon {
        width: 56px; height: 56px; margin: 0 auto 18px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,167,232,0.16); color: var(--im-cyan-light);
      }
      .apply-sent h2 { margin: 0 0 8px; font-size: 22px; font-weight: 800; color: var(--im-fg); }
      .apply-sent p { margin: 0 auto; max-width: 360px; font-size: 14px; line-height: 1.6; color: var(--im-fg-2); }

      @media (max-width: 480px) {
        .apply-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
