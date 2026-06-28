import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ClubPage } from "@/components/club/ClubPage";
import { ClubHero } from "@/components/club/ClubHero";
import { getContent } from "@/lib/club";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Despre — Interact Sf. Sava",
  description:
    "Cine este Interact Sf. Sava: clubul de voluntariat al elevilor, proiecte reale și o comunitate care crește împreună.",
};

// NOTE (scaffold): copy + impact numbers are placeholders here. U2 moves prose to
// the `site_content` table and the impact figures to real club data (admin-editable).
const VALUES = [
  { name: "Voluntariat", body: "Punem mâna la treabă pentru cauze care contează — de la educație la comunitate." },
  { name: "Prietenie", body: "Cele mai bune proiecte se nasc între prieteni. Aici găsești o echipă, nu doar activități." },
  { name: "Implicare", body: "Fiecare membru propune, organizează și duce la capăt. Nimeni nu stă pe margine." },
  { name: "Leadership", body: "Înveți să conduci proiecte reale, cu bugete, termene și oameni — din liceu." },
];

const FAMILY = [
  { name: "Interact", age: "12-18 ani", role: "Elevi care fac primii pași în voluntariat și își conduc primele proiecte." },
  { name: "Rotaract", age: "18-30 ani", role: "Tineri și studenți care duc proiectele mai departe, social și profesional." },
  { name: "Rotary", age: "30+ ani", role: "Adulți cu experiență care susțin comunitatea cu timp, resurse și mentorat." },
];

// Impact figures are admin-editable via site_content (keys below); they render as
// "—" until seeded, so no fake-precise claims ship.
const IMPACT_KEYS = [
  { key: "impact_years", label: "ani activi" },
  { key: "impact_projects", label: "proiecte" },
  { key: "impact_beneficiaries", label: "beneficiari" },
  { key: "impact_funds", label: "lei strânși" },
] as const;

export default async function DesprePage() {
  // Editable prose comes from site_content (admin CMS in U9); the current copy is
  // the fallback so the page reads complete before anything is seeded.
  const [lead, who1, who2, ...impactValues] = await Promise.all([
    getContent(
      "despre_lead",
      "Interact Sf. Sava este clubul de voluntariat al elevilor — un loc unde tinerii pornesc proiecte reale și cresc împreună.",
    ),
    getContent(
      "despre_who_1",
      "Interact Sf. Sava este clubul de voluntariat al elevilor de la Colegiul Național „Sfântul Sava” din București. Facem parte din familia Rotary și organizăm proiecte sociale, evenimente și acțiuni care lasă urme în comunitate.",
    ),
    getContent(
      "despre_who_2",
      "Dincolo de fapte bune, clubul e un loc de creștere: descoperi ce te pasionează, înveți să lucrezi în echipă și devii un lider responsabil al generației tale.",
    ),
    ...IMPACT_KEYS.map((k) => getContent(k.key, "—")),
  ]);
  const impact = IMPACT_KEYS.map((k, i) => ({ n: impactValues[i], label: k.label }));

  const hero = (
    <ClubHero
      variant="editorial"
      lines={[<>Servim comunitatea,</>, <span key="a" className="cl-hero__accent">prin acțiune.</span>]}
      lead={lead}
      cta={<Link href="/proiecte" className="cl-link">Vezi proiectele <ArrowRight size={16} strokeWidth={2} /></Link>}
    />
  );

  const cta = (
    <div className="cl-cta-band">
      <div className="cl-cta-row">
        <Link href="/devino-membru" className="cl-btn pressable hover-dim">
          Devino membru <ArrowRight size={18} strokeWidth={2} />
        </Link>
        <Link href="/echipa" className="cl-link">Vezi echipa <ArrowRight size={16} strokeWidth={2} /></Link>
      </div>
    </div>
  );

  return (
    <ClubPage active="despre" hero={hero} cta={cta}>
      {/* Who we are — asymmetric, not a card */}
      <section className="cl-section anim-rise">
        <div className="cl-2col">
          <div>
            <h2 className="cl-h2">Cine suntem</h2>
            <p className="cl-text">{who1}</p>
            <p className="cl-text">{who2}</p>
          </div>
          <div className="cl-2col__media" aria-hidden>
            <GearMotif />
          </div>
        </div>
      </section>

      {/* Values — typographic list, not a grid */}
      <section className="cl-section">
        <h2 className="cl-h2 anim-rise">Ce ne definește</h2>
        <div className="cl-values">
          {VALUES.map((v) => (
            <div key={v.name} className="cl-value anim-rise">
              <div className="cl-value__name">{v.name}</div>
              <p className="cl-value__body">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Familia Interact — age-ladder, not 3 identical cards */}
      <section className="cl-section">
        <h2 className="cl-h2 anim-rise">Familia Interact</h2>
        <div className="cl-family">
          {FAMILY.map((t, i) => (
            <div key={t.name} className={`cl-family__tier cl-family__tier--${i + 1} anim-rise`}>
              <div className="cl-family__name">{t.name}</div>
              <div className="cl-family__age">{t.age}</div>
              <p className="cl-family__role">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Impact band — the page's single metric moment (placeholder values until U2) */}
      <section className="cl-impact anim-rise" aria-label="Impact">
        <div className="cl-impact__grid">
          {impact.map((s) => (
            <div key={s.label}>
              <div className="cl-impact__num">{s.n}</div>
              <div className="cl-impact__label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </ClubPage>
  );
}

/** Quiet gear motif for the who-we-are media column (no real photo yet). */
function GearMotif() {
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return { x1: 12 + Math.cos(a) * 6, y1: 12 + Math.sin(a) * 6, x2: 12 + Math.cos(a) * 9.5, y2: 12 + Math.sin(a) * 9.5 };
  });
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false"
      style={{ position: "absolute", inset: 0, margin: "auto", width: "46%", height: "46%", opacity: 0.16, color: "var(--im-cyan)" }}>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.1" />
      {spokes.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ))}
    </svg>
  );
}
