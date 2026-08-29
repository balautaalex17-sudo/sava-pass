import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { LockKeyhole } from "lucide-react";

import { getPublicRecruitmentState } from "@/lib/recruitment-public";
import { MembershipForm } from "./MembershipForm";
import { StaffTestEntry } from "./StaffTestEntry";

export const metadata: Metadata = {
  title: "Devino membru — Interact Sf. Sava",
  description:
    "Formularul de recrutare pentru noua generație de membri Interact Sf. Sava.",
};

export const revalidate = 60;

const STEPS = [
  {
    number: "01",
    title: "Completează formularul",
    copy: "Ai nevoie de doar câteva minute pentru a răspunde la toate întrebările.",
  },
  {
    number: "02",
    title: "Confirmare pe email",
    copy: "În funcție de răspunsurile tale, vei afla prin email dacă ai trecut la etapa interviurilor.",
  },
  {
    number: "03",
    title: "Interviul",
    copy: "Vom stabili împreună data interviului, care va avea loc în liceu, după terminarea programului.",
  },
  {
    number: "04",
    title: "Bun venit în Interact",
    copy: "Te așteptăm la prima ședință alături de ceilalți recruți.",
  },
];

export default async function MembershipPage() {
  const recruitment = await getPublicRecruitmentState();

  return (
    <>
      <ApplyStyles />

      <main>
        <div className="apply-shell">
          <Suspense fallback={null}>
            <StaffTestEntry enabled={process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview"} />
          </Suspense>

          <section className="apply-hero">
            <div className="apply-hero__copy">
              <span className="apply-eyebrow">{recruitment.eyebrow}</span>
              <h1>Intră în echipa din spatele proiectelor.</h1>
              <p>{recruitment.intro}</p>
              <div className="apply-actions">
                {recruitment.isOpen ? (
                  <a href="#aplica" className="pressable hover-lift apply-cta">
                    Completează formularul
                  </a>
                ) : (
                  <span className="apply-cta apply-cta--locked" aria-disabled="true">
                    <LockKeyhole size={18} aria-hidden="true" /> Înscrieri închise
                  </span>
                )}
                {/* `/membru` is protected. Avoid caching a guest redirect
                    before the click, which can make the first portal visit
                    stale when the session has just changed. */}
                <Link
                  href="/membru"
                  prefetch={false}
                  className="pressable apply-member-login"
                  aria-label="Intră în portalul membrilor"
                >
                  Intră în portal
                </Link>
              </div>
              <span className="apply-deadline">
                {recruitment.isOpen
                  ? recruitment.deadlineLabel ?? "Înscrierile sunt deschise"
                  : recruitment.status === "scheduled"
                    ? "Formularul se va deschide la data programată"
                    : "Formularul nu acceptă răspunsuri"}
              </span>
            </div>

            <figure className="apply-hero__media">
              <Image
                src="/media/recruitment-candidate.webp"
                alt="Membri Interact Sf. Sava lucrând împreună"
                fill
                priority
                sizes="(max-width: 760px) 100vw, 48vw"
              />
              <figcaption>Interact Sf. Sava · proiecte făcute împreună</figcaption>
            </figure>
          </section>

          <section className="apply-process" aria-labelledby="process-title">
            <div className="apply-process__intro anim-rise">
              <span className="apply-eyebrow">Cum decurge</span>
              <h2 id="process-title">Simplu, de la formular la prima ședință.</h2>
            </div>
            <ol className="apply-process__list">
              {STEPS.map((step) => (
                <li key={step.number} className="anim-rise-fast">
                  <span className="apply-process__number">{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

        </div>

        <section className="apply-form-section">
          <div className="apply-shell apply-form-layout">
            <div className="apply-form-intro anim-rise">
              <span className="apply-eyebrow">{recruitment.isOpen ? "Aplicația ta" : "Stare recrutare"}</span>
              <h2>{recruitment.isOpen ? "Spune-ne cum gândești." : "Înscrierile sunt închise."}</h2>
              <p>{recruitment.isOpen
                ? "Formularul are patru pași și se salvează automat pe dispozitivul tău. Răspunde sincer și folosește exemple concrete acolo unde poți."
                : recruitment.closedMessage}</p>
              <div className="apply-private-note">
                <strong>Răspunsurile rămân private.</strong>
                <span>Doar echipa de recrutare Interact Sf. Sava le poate vedea.</span>
              </div>
            </div>
            {recruitment.isOpen ? (
              <MembershipForm questions={recruitment.questions} />
            ) : (
              <div className="apply-closed anim-rise" id="aplica" role="status" aria-label="Formular blocat" data-reveal-sequence="closed">
                <div className="apply-closed__scene" aria-hidden="true">
                  <span className="apply-closed__ring apply-closed__ring--one" />
                  <span className="apply-closed__ring apply-closed__ring--two" />
                  <span className="apply-closed__paper">
                    <span className="apply-closed__paper-mark" />
                    <span className="apply-closed__paper-line apply-closed__paper-line--long" />
                    <span className="apply-closed__paper-line" />
                    <span className="apply-closed__paper-line apply-closed__paper-line--short" />
                  </span>
                  <span className="apply-closed__lock">
                    <span className="apply-closed__shackle" />
                    <span className="apply-closed__lock-body"><span className="apply-closed__keyhole" /></span>
                  </span>
                </div>
                <div className="apply-closed__copy">
                  <span className="apply-eyebrow">{recruitment.title}</span>
                  <h2>Formularul s-a închis.</h2>
                  <p>{recruitment.closedMessage}</p>
                  <span className="apply-closed__status">
                    <span aria-hidden="true" /> Nu se mai pot trimite răspunsuri
                  </span>
                  <small>Board-ul îl va redeschide aici la următoarea perioadă de recrutare.</small>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function ApplyStyles() {
  return (
    <style>{`
      .apply-shell {
        width: min(1120px, calc(100% - 40px));
        margin: 0 auto;
      }

      .staff-test-login {
        display: grid;
        grid-template-columns: minmax(0, .72fr) minmax(440px, 1.28fr);
        gap: clamp(32px, 5vw, 64px);
        margin-top: 116px;
        padding: clamp(26px, 4vw, 42px);
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-lg);
        background: var(--slate-50);
        box-shadow: 0 14px 38px rgba(15, 23, 42, .08);
      }

      .staff-test-login + .apply-hero { padding-top: 64px; }

      .staff-test-login__intro {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }

      .staff-test-login__icon {
        display: grid;
        flex: 0 0 auto;
        width: 44px;
        height: 44px;
        place-items: center;
        border-radius: 12px;
        background: var(--brand-cyan-100);
        color: var(--brand-cyan-700);
      }

      .staff-test-login h2 {
        margin: 0 0 10px;
        color: var(--slate-900);
        font-size: clamp(25px, 3vw, 34px);
        line-height: 1.08;
      }

      .staff-test-login__intro p {
        margin: 0;
        color: var(--slate-600);
        font-size: 14px;
        line-height: 1.6;
      }

      .staff-test-login__form { min-width: 0; }

      .staff-test-login__roles {
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
      }

      .staff-test-login__roles legend,
      .staff-test-login__controls label > span:first-child {
        display: block;
        margin-bottom: 8px;
        color: var(--slate-700);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      .staff-test-login__role-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .staff-test-role { position: relative; cursor: pointer; }

      .staff-test-role input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
      }

      .staff-test-role__surface {
        display: flex;
        min-height: 67px;
        padding: 12px 14px;
        flex-direction: column;
        justify-content: center;
        border: 1px solid var(--slate-200);
        border-radius: 11px;
        background: var(--white);
        transition: border-color var(--dur-fast) ease, background var(--dur-fast) ease;
      }

      .staff-test-role__surface strong {
        color: var(--slate-900);
        font-size: 14px;
      }

      .staff-test-role__surface small {
        margin-top: 3px;
        color: var(--slate-500);
        font-size: 12px;
        line-height: 1.35;
      }

      .staff-test-role input:checked + .staff-test-role__surface {
        border-color: var(--brand-cyan-600);
        background: var(--brand-cyan-50);
        box-shadow: 0 0 0 1px var(--brand-cyan-600);
      }

      .staff-test-role input:focus-visible + .staff-test-role__surface {
        outline: 3px solid color-mix(in srgb, var(--brand-cyan-600) 30%, transparent);
        outline-offset: 2px;
      }

      .staff-test-login__controls {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: end;
        margin-top: 16px;
      }

      .staff-test-login__input-wrap {
        display: flex;
        height: 46px;
        align-items: center;
        gap: 9px;
        padding: 0 13px;
        border: 1px solid var(--slate-300);
        border-radius: 11px;
        background: var(--white);
        color: var(--slate-500);
      }

      .staff-test-login__input-wrap:focus-within {
        border-color: var(--brand-cyan-600);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-cyan-600) 18%, transparent);
      }

      .staff-test-login__input-wrap input {
        width: 100%;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--slate-900);
        font: inherit;
        font-size: 14px;
      }

      .staff-test-login__controls button {
        min-height: 46px;
        padding: 0 18px;
        border: 0;
        border-radius: 11px;
        background: var(--brand-cyan-700);
        color: var(--white);
        font: inherit;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
      }

      .staff-test-login__controls button:disabled { opacity: .62; cursor: wait; }
      .staff-test-login__controls button:focus-visible { outline: 3px solid var(--brand-cyan-200); outline-offset: 2px; }

      .staff-test-login__note,
      .staff-test-login__error {
        margin: 10px 0 0;
        color: var(--slate-500);
        font-size: 12px;
        line-height: 1.45;
      }

      .staff-test-login__error { min-height: 18px; color: var(--danger); font-weight: 700; }

      .apply-hero {
        display: grid;
        grid-template-columns: minmax(0, .95fr) minmax(360px, 1.05fr);
        gap: clamp(44px, 7vw, 88px);
        align-items: center;
        padding: clamp(132px, 12vw, 160px) 0 80px;
      }

      .apply-eyebrow {
        display: block;
        margin-bottom: 14px;
        color: var(--brand-cyan-700);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .13em;
        text-transform: uppercase;
      }

      .apply-hero h1 {
        max-width: 650px;
        margin: 0;
        color: var(--slate-900);
        font-size: clamp(43px, 6vw, 68px);
        font-weight: 800;
        line-height: .98;
        letter-spacing: -.04em;
        text-wrap: balance;
      }

      .apply-hero__copy > p {
        max-width: 570px;
        margin: 24px 0 0;
        color: var(--slate-600);
        font-size: 17px;
        line-height: 1.65;
      }

      .apply-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        margin-top: 30px;
      }

      .apply-cta {
        display: inline-flex;
        min-height: 48px;
        align-items: center;
        justify-content: center;
        padding: 0 22px;
        border-radius: 10px;
        background: var(--brand-navy);
        color: var(--white);
        font-size: 14px;
        font-weight: 800;
        text-decoration: none;
      }

      .apply-member-login {
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        justify-content: center;
        padding: 0 15px;
        border: 1px solid var(--slate-300);
        border-radius: 9px;
        color: var(--slate-700);
        font-size: 12px;
        font-weight: 800;
        text-decoration: none;
        transition: border-color var(--dur-fast) ease, color var(--dur-fast) ease, transform var(--dur-fast) var(--ease-out);
      }

      .apply-member-login:hover {
        border-color: var(--brand-cyan);
        color: var(--brand-cyan-700);
      }

      .apply-cta--locked {
        gap: 9px;
        background: var(--slate-200);
        color: var(--slate-600);
        cursor: not-allowed;
      }

      .apply-deadline {
        display: block;
        margin-top: 13px;
        color: var(--slate-500);
        font-size: 12px;
      }

      .apply-hero__media {
        position: relative;
        min-height: 500px;
        margin: 0;
        overflow: hidden;
        border: 1px solid var(--slate-200);
        border-radius: 16px;
        background: var(--slate-100);
      }

      .apply-hero__media img { object-fit: cover; }

      .apply-hero__media::after {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 58%, rgba(15, 23, 42, .72));
        content: "";
        pointer-events: none;
      }

      .apply-hero__media figcaption {
        position: absolute;
        z-index: 1;
        right: 22px;
        bottom: 18px;
        left: 22px;
        color: rgba(255, 255, 255, .9);
        font-size: 12px;
        font-weight: 700;
      }

      .apply-process {
        display: grid;
        grid-template-columns: .78fr 1.22fr;
        gap: clamp(44px, 8vw, 100px);
        padding: 72px 0 96px;
        border-top: 1px solid var(--slate-200);
      }

      .apply-process__intro h2,
      .apply-form-intro h2 {
        max-width: 440px;
        margin: 0;
        color: var(--slate-900);
        font-size: clamp(30px, 4vw, 43px);
        font-weight: 800;
        line-height: 1.08;
        letter-spacing: -.04em;
        text-wrap: balance;
      }

      .apply-process__list {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .apply-process__list li {
        display: grid;
        grid-template-columns: 42px 1fr;
        gap: 18px;
        padding: 0 0 24px;
      }

      .apply-process__list li:not(:last-child) {
        margin-bottom: 24px;
        border-bottom: 1px solid var(--slate-200);
      }

      .apply-process__number {
        padding-top: 2px;
        color: var(--brand-cyan-700);
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 800;
      }

      .apply-process h3 {
        margin: 0;
        color: var(--slate-900);
        font-size: 16px;
        font-weight: 800;
      }

      .apply-process__list p {
        margin: 6px 0 0;
        color: var(--slate-600);
        font-size: 14px;
        line-height: 1.55;
      }

      .apply-form-section {
        padding: 88px 0 104px;
        background: var(--slate-50);
        border-top: 1px solid var(--slate-200);
      }

      .apply-closed {
        position: relative;
        display: grid;
        min-height: 460px;
        place-items: center;
        padding: clamp(28px, 5vw, 48px);
        overflow: hidden;
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-md);
        background: var(--white);
        text-align: center;
      }

      .apply-closed__scene {
        position: relative;
        width: 176px;
        height: 142px;
        margin: 0 auto 26px;
      }

      .apply-closed__ring {
        position: absolute;
        inset: 4px 21px 4px 21px;
        border: 1px solid var(--brand-cyan-200);
        border-radius: 50%;
        opacity: 0;
      }

      .apply-closed__paper {
        position: absolute;
        top: 10px;
        left: 25px;
        display: grid;
        width: 112px;
        height: 98px;
        box-sizing: border-box;
        align-content: start;
        gap: 10px;
        padding: 20px 18px;
        border: 1px solid var(--slate-200);
        border-radius: 10px;
        background: var(--white);
        box-shadow: 0 12px 30px rgba(15, 23, 42, .09);
        transform-origin: center bottom;
      }

      .apply-closed__paper-mark {
        width: 22px;
        height: 6px;
        border-radius: var(--radius-pill);
        background: var(--brand-cyan);
      }

      .apply-closed__paper-line {
        width: 52px;
        height: 4px;
        border-radius: var(--radius-pill);
        background: var(--slate-200);
        transform-origin: left center;
      }

      .apply-closed__paper-line--long { width: 72px; }
      .apply-closed__paper-line--short { width: 38px; }

      .apply-closed__lock {
        position: absolute;
        right: 22px;
        bottom: 7px;
        width: 62px;
        height: 77px;
      }

      .apply-closed__shackle {
        position: absolute;
        top: 0;
        left: 14px;
        width: 34px;
        height: 38px;
        box-sizing: border-box;
        border: 7px solid var(--brand-navy);
        border-bottom: 0;
        border-radius: 19px 19px 0 0;
        transform-origin: 7px 31px;
      }

      .apply-closed__lock-body {
        position: absolute;
        right: 0;
        bottom: 0;
        display: grid;
        width: 62px;
        height: 52px;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, .18);
        border-radius: 13px;
        background: var(--brand-navy);
        box-shadow: 0 10px 22px rgba(15, 23, 42, .2);
      }

      .apply-closed__keyhole {
        position: relative;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--brand-cyan);
      }

      .apply-closed__keyhole::after {
        position: absolute;
        top: 6px;
        left: 3px;
        width: 3px;
        height: 10px;
        border-radius: var(--radius-pill);
        background: var(--brand-cyan);
        content: "";
      }

      .apply-closed__copy {
        position: relative;
        z-index: 1;
        max-width: 560px;
      }

      .apply-closed__copy > * {
        opacity: 1;
      }

      .apply-closed[data-sr-revealed="true"] .apply-closed__ring {
        animation: apply-closed-ring 620ms var(--ease-out) 660ms both;
      }

      .apply-closed[data-sr-revealed="true"] .apply-closed__ring--two { animation-delay: 780ms; }
      .apply-closed[data-sr-revealed="true"] .apply-closed__paper { animation: apply-closed-paper 520ms var(--ease-out) both; }
      .apply-closed[data-sr-revealed="true"] .apply-closed__paper-line { animation: apply-closed-line 280ms var(--ease-out) 340ms both; }
      .apply-closed[data-sr-revealed="true"] .apply-closed__paper-line--long { animation-delay: 290ms; }
      .apply-closed[data-sr-revealed="true"] .apply-closed__paper-line--short { animation-delay: 390ms; }
      .apply-closed[data-sr-revealed="true"] .apply-closed__shackle { animation: apply-closed-shackle 460ms var(--ease-out) 430ms both; }
      .apply-closed[data-sr-revealed="true"] .apply-closed__lock-body { animation: apply-closed-lock 360ms var(--ease-out) 500ms both; }
      .apply-closed[data-sr-revealed="true"] .apply-closed__copy > * { animation: apply-closed-copy 420ms var(--ease-out) both; }
      .apply-closed[data-sr-revealed="true"] .apply-closed__copy > :nth-child(1) { animation-delay: 620ms; }
      .apply-closed[data-sr-revealed="true"] .apply-closed__copy > :nth-child(2) { animation-delay: 670ms; }
      .apply-closed[data-sr-revealed="true"] .apply-closed__copy > :nth-child(3) { animation-delay: 720ms; }
      .apply-closed[data-sr-revealed="true"] .apply-closed__copy > :nth-child(4) { animation-delay: 770ms; }
      .apply-closed[data-sr-revealed="true"] .apply-closed__copy > :nth-child(5) { animation-delay: 820ms; }

      .apply-closed__copy .apply-eyebrow {
        margin-bottom: 12px;
      }

      .apply-closed h2 {
        margin: 0;
        color: var(--slate-900);
        font-size: clamp(28px, 4vw, 40px);
        line-height: 1.08;
      }

      .apply-closed p {
        max-width: 560px;
        margin: 16px auto 0;
        color: var(--slate-600);
        font-size: 15px;
        line-height: 1.65;
        white-space: pre-wrap;
      }

      .apply-closed__status {
        display: inline-flex;
        min-height: 30px;
        align-items: center;
        gap: 8px;
        margin-top: 20px;
        padding: 0 12px;
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-pill);
        background: var(--slate-50);
        color: var(--slate-700);
        font-size: 11px;
        font-weight: 750;
      }

      .apply-closed__status > span {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--slate-400);
      }

      .apply-closed small {
        display: block;
        margin-top: 22px;
        padding-top: 16px;
        border-top: 1px solid var(--slate-200);
        color: var(--slate-500);
        font-size: 12px;
        line-height: 1.5;
      }

      @keyframes apply-closed-paper {
        from { opacity: 0; transform: translateY(14px) scale(.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @keyframes apply-closed-line {
        from { opacity: 0; transform: scaleX(.35); }
        to { opacity: 1; transform: scaleX(1); }
      }

      @keyframes apply-closed-shackle {
        from { opacity: 0; transform: translate(-5px, 7px) rotate(-22deg); }
        55% { opacity: 1; transform: translate(-2px, 2px) rotate(-8deg); }
        to { opacity: 1; transform: translate(0, 0) rotate(0); }
      }

      @keyframes apply-closed-lock {
        from { opacity: 0; transform: translateY(8px) scale(.94); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @keyframes apply-closed-ring {
        from { opacity: .35; transform: scale(.82); }
        to { opacity: 0; transform: scale(1.16); }
      }

      @keyframes apply-closed-copy {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .apply-form-layout {
        display: grid;
        grid-template-columns: minmax(250px, .62fr) minmax(0, 1.38fr);
        gap: clamp(48px, 8vw, 104px);
        align-items: start;
      }

      .apply-form-intro {
        position: sticky;
        top: 92px;
      }

      .apply-form-intro > p {
        margin: 20px 0 0;
        color: var(--slate-600);
        font-size: 15px;
        line-height: 1.65;
      }

      .apply-private-note {
        display: grid;
        gap: 3px;
        margin-top: 28px;
        padding-top: 20px;
        border-top: 1px solid var(--slate-200);
      }

      .apply-private-note strong { color: var(--slate-900); font-size: 13px; }
      .apply-private-note span { color: var(--slate-600); font-size: 12px; line-height: 1.5; }

      .wz {
        overflow: hidden;
        scroll-margin-top: 88px;
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-md);
        background: var(--white);
      }

      .wz-progress {
        padding: 22px 26px 20px;
        border-bottom: 1px solid var(--slate-200);
      }

      .wz-progress__copy {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 16px;
      }

      .wz-progress__copy span { color: var(--slate-500); font-size: 11px; }
      .wz-progress__copy strong { color: var(--slate-900); font-size: 14px; font-weight: 800; }

      .wz-progress progress {
        display: block;
        width: 100%;
        height: 4px;
        margin-top: 14px;
        overflow: hidden;
        border: 0;
        border-radius: var(--radius-pill);
        appearance: none;
      }

      .wz-progress progress::-webkit-progress-bar { background: var(--slate-200); }
      .wz-progress progress::-webkit-progress-value { background: var(--brand-cyan); }
      .wz-progress progress::-moz-progress-bar { background: var(--brand-cyan); }

      .wz-body { padding: 28px 26px 8px; }
      .wz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .wz-grid > .wz-note { grid-column: 1 / -1; }
      .wz-stack, .wz-long-list { display: grid; gap: 24px; }

      .wz-field,
      .wz-question-field { display: grid; gap: 8px; }

      .wz-field > span,
      .wz-question-field > label {
        color: var(--slate-800);
        font-size: 13px;
        font-weight: 800;
        line-height: 1.45;
      }

      .wz-required { margin-left: 3px; color: var(--danger); }
      .wz-optional { color: var(--slate-500); font-size: 11px; font-weight: 600; }

      .wz-field input,
      .wz-question-field textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--slate-300);
        border-radius: 10px;
        outline: none;
        background: var(--white);
        color: var(--slate-900);
        font-family: var(--font-sans);
        font-size: 16px;
        transition: border-color 150ms ease, box-shadow 150ms ease;
      }

      .wz-field input { min-height: 46px; padding: 11px 13px; }
      .wz-question-field textarea { min-height: 132px; padding: 13px 14px; line-height: 1.55; resize: vertical; }

      .wz-field input::placeholder,
      .wz-question-field textarea::placeholder { color: var(--slate-500); opacity: 1; }

      .wz-field input:focus,
      .wz-question-field textarea:focus {
        border-color: var(--brand-cyan);
        box-shadow: 0 0 0 3px rgba(0, 167, 232, .12);
      }

      .wz-question-help {
        margin: -2px 0 0;
        color: var(--slate-500);
        font-size: 12px;
        line-height: 1.5;
      }

      .wz-question-foot {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        color: var(--slate-500);
        font-size: 10px;
      }

      .wz-note {
        padding: 14px 15px;
        border-radius: 10px;
        border: 1px solid var(--slate-200);
        background: var(--brand-cyan-50);
        color: var(--slate-600);
        font-size: 12px;
        line-height: 1.5;
      }

      .wz-error-text { margin: 0; color: var(--danger); font-size: 11px; }

      .wz-review-contact {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border: 1px solid var(--slate-200);
        border-radius: 10px;
        overflow: hidden;
      }

      .wz-review__row { padding: 12px 14px; }
      .wz-review__row:nth-child(odd) { border-right: 1px solid var(--slate-200); }
      .wz-review__row:nth-child(-n + 2) { border-bottom: 1px solid var(--slate-200); }
      .wz-review__label { display: block; color: var(--slate-500); font-size: 10px; }
      .wz-review__value { display: block; margin-top: 4px; color: var(--slate-900); font-size: 12px; font-weight: 700; word-break: break-word; }

      .wz-review-answers { display: grid; gap: 0; }
      .wz-review-answer { padding: 16px 0; border-bottom: 1px solid var(--slate-200); }
      .wz-review-answer:first-child { padding-top: 0; }
      .wz-review-answer:last-child { padding-bottom: 0; border-bottom: 0; }
      .wz-review-answer span { color: var(--slate-500); font-size: 10px; font-weight: 700; }
      .wz-review-answer p { margin: 6px 0 0; color: var(--slate-700); font-size: 12px; line-height: 1.55; white-space: pre-wrap; }

      .apply-consent {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        cursor: pointer;
      }

      .apply-consent input { width: 18px; height: 18px; margin: 1px 0 0; accent-color: var(--brand-cyan); flex-shrink: 0; }
      .apply-consent span { color: var(--slate-600); font-size: 12px; line-height: 1.55; }

      .apply-error {
        margin-top: 12px;
        padding: 11px 13px;
        border: 1px solid rgba(220, 38, 38, .25);
        border-radius: 9px;
        background: var(--danger-100);
        color: #7f1d1d;
        font-size: 12px;
        font-weight: 700;
      }

      .wz-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 20px 26px 24px;
      }

      .wz-foot__meta { color: var(--slate-500); font-size: 10px; }
      .wz-foot__meta b { color: var(--slate-600); }
      .wz-foot__btns { display: flex; gap: 8px; }

      .wz-btn-back,
      .wz-btn-next,
      .wz-btn-submit {
        display: inline-flex;
        min-height: 42px;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 0 17px;
        border-radius: 9px;
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 12px;
        font-weight: 800;
      }

      .wz-btn-back { border: 0; background: transparent; color: var(--brand-cyan-700); }
      .wz-btn-next, .wz-btn-submit { border: 0; background: var(--brand-navy); color: var(--white); }
      .wz-btn-back:disabled { color: var(--slate-300); cursor: not-allowed; }
      .wz-btn-next:disabled, .wz-btn-submit:disabled { opacity: .42; cursor: not-allowed; }

      .apply-sent {
        padding: 38px 30px;
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-md);
        background: var(--white);
      }

      .apply-sent__icon {
        display: grid;
        width: 48px;
        height: 48px;
        margin-bottom: 18px;
        place-items: center;
        border-radius: 50%;
        background: var(--brand-cyan-50);
        color: var(--brand-cyan-700);
      }

      .apply-sent h2 { margin: 0 0 8px; color: var(--slate-900); font-size: 24px; font-weight: 800; }
      .apply-sent p { max-width: 470px; margin: 0; color: var(--slate-600); font-size: 14px; line-height: 1.6; }

      @media (max-width: 820px) {
        .staff-test-login { grid-template-columns: 1fr; margin-top: 104px; }
        .apply-hero { grid-template-columns: 1fr; padding-top: 120px; }
        .staff-test-login + .apply-hero { padding-top: 52px; }
        .apply-hero__media { min-height: 430px; }
        .apply-process { grid-template-columns: 1fr; gap: 36px; }
        .apply-form-layout { grid-template-columns: 1fr; gap: 36px; }
        .apply-form-intro { position: static; }
        .wz-btn-back, .wz-btn-next, .wz-btn-submit { min-height: 44px; font-size: 13px; }
        .apply-closed__ring { display: none; }
        .apply-closed[data-sr-revealed="true"] .apply-closed__paper {
          animation: apply-closed-paper 240ms var(--ease-out) both;
        }
        .apply-closed[data-sr-revealed="true"] .apply-closed__paper-line {
          animation: apply-closed-line 180ms var(--ease-out) 50ms both;
        }
        .apply-closed[data-sr-revealed="true"] .apply-closed__shackle {
          animation: apply-closed-shackle 220ms var(--ease-out) 30ms both;
        }
        .apply-closed[data-sr-revealed="true"] .apply-closed__lock-body {
          animation: apply-closed-lock 200ms var(--ease-out) 60ms both;
        }
        .apply-closed[data-sr-revealed="true"] .apply-closed__copy > * { animation: none; }
      }

      @media (max-width: 560px) {
        .apply-shell { width: calc(100% - 28px); }
        .staff-test-login { gap: 26px; margin-top: 92px; padding: 22px 18px; border-radius: var(--radius-md); }
        .staff-test-login__role-grid { grid-template-columns: 1fr; }
        .staff-test-login__controls { grid-template-columns: 1fr; }
        .staff-test-login__controls button { width: 100%; }
        .apply-hero { gap: 36px; padding: 112px 0 58px; }
        .apply-hero h1 { font-size: 42px; }
        .apply-closed { min-height: 430px; padding: 30px 20px; }
        .apply-closed__scene { transform: scale(.9); margin-bottom: 14px; }
        .apply-hero__copy > p { font-size: 15px; }
        .apply-hero__media { min-height: 360px; }
        .apply-process { padding: 54px 0 68px; }
        .apply-form-section { padding: 58px 0 72px; }
        .wz-progress, .wz-body, .wz-foot { padding-right: 18px; padding-left: 18px; }
        .wz-grid { grid-template-columns: 1fr; }
        .wz-grid > .wz-note { grid-column: auto; }
        .wz-progress__copy { align-items: flex-start; flex-direction: column; gap: 3px; }
        .wz-review-contact { grid-template-columns: 1fr; }
        .wz-review__row:nth-child(odd) { border-right: 0; }
        .wz-review__row:not(:last-child) { border-bottom: 1px solid var(--slate-200); }
        .wz-foot { align-items: stretch; flex-direction: column; }
        .wz-foot__btns { justify-content: space-between; }
      }

      @media (prefers-reduced-motion: reduce) {
        .apply-closed__ring { display: none; }
        .apply-closed *, .apply-closed *::before, .apply-closed *::after {
          animation-delay: 0ms !important;
        }
      }
    `}</style>
  );
}
