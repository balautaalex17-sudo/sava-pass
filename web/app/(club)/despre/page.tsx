import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ClubHero } from "@/components/club/ClubHero";
import { ClubPage } from "@/components/club/ClubPage";
import { CompactEventCard } from "@/app/(club)/evenimente/CompactEventCard";
import { getContent } from "@/lib/club";
import { getManagedPublishedEvents, ticketingEventToArchiveEvent } from "@/lib/event-archive";
import { getFeaturedEvents } from "@/lib/events";
import styles from "./despre-events.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Despre · Interact Sf. Sava",
  description: "Cine este Interact Sf. Sava: clubul de voluntariat al elevilor, proiecte reale și o comunitate care crește împreună.",
};

const VALUES = [
  { name: "Voluntariat", body: "Punem mâna la treabă pentru cauze care contează, de la educație la comunitate." },
  { name: "Prietenie", body: "Cele mai bune proiecte se nasc între prieteni. Aici găsești o echipă, nu doar activități." },
  { name: "Implicare", body: "Fiecare membru propune, organizează și duce la capăt. Nimeni nu stă pe margine." },
  { name: "Leadership", body: "Înveți să conduci proiecte reale, cu bugete, termene și oameni, încă din liceu." },
];

const FAMILY = [
  { name: "Interact", age: "12–18 ani", role: "Elevi care fac primii pași în voluntariat și își conduc primele proiecte." },
  { name: "Rotaract", age: "18–30 ani", role: "Tineri și studenți care duc proiectele mai departe, social și profesional." },
  { name: "Rotary", age: "30+ ani", role: "Adulți cu experiență care susțin comunitatea cu timp, resurse și mentorat." },
];

const IMPACT_KEYS = [
  { key: "impact_years", label: "ani activi" },
  { key: "impact_projects", label: "proiecte" },
  { key: "impact_beneficiaries", label: "beneficiari" },
  { key: "impact_funds", label: "lei strânși" },
] as const;

export default async function DesprePage() {
  const [lead, who1, who2, impactValues, featuredRows, historicalEvents] = await Promise.all([
    getContent(
      "despre_lead",
      "Interact Sf. Sava este clubul de voluntariat al elevilor, un loc unde tinerii pornesc proiecte reale și cresc împreună.",
    ),
    getContent(
      "despre_who_1",
      "Interact Sf. Sava este clubul de voluntariat al elevilor de la Colegiul Național „Sfântul Sava” din București. Facem parte din familia Rotary și organizăm proiecte sociale, evenimente și acțiuni care lasă urme în comunitate.",
    ),
    getContent(
      "despre_who_2",
      "Dincolo de fapte bune, clubul este un loc de creștere: descoperi ce te pasionează, înveți să lucrezi în echipă și devii un lider responsabil al generației tale.",
    ),
    Promise.all(IMPACT_KEYS.map((item) => getContent(item.key, "—"))),
    getFeaturedEvents(),
    getManagedPublishedEvents(),
  ]);
  const impact = IMPACT_KEYS.map((item, index) => ({ number: impactValues[index], label: item.label }));
  const historicalBySlug = new Map(historicalEvents.map((event) => [event.slug, event]));
  const featuredEvents = featuredRows.map((event) => ticketingEventToArchiveEvent(event, historicalBySlug.get(event.slug)));

  const hero = (
    <ClubHero
      variant="editorial"
      lines={[<>Servim comunitatea,</>, <span key="accent" className="cl-hero__accent">prin acțiune.</span>]}
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

      {featuredEvents.length > 0 && (
        <section className="cl-section" aria-labelledby="despre-events-title">
          <div className={styles.heading}>
            <div>
              <span className="cl-label">Alese de echipă</span>
              <h2 className="cl-h2" id="despre-events-title">Evenimente pe care le păstrăm aproape</h2>
            </div>
            <p>Pozițiile sunt alese manual. Un eveniment încheiat poate rămâne aici ca parte din povestea clubului.</p>
          </div>
          <div className={styles.grid}>
            {featuredEvents.map((event) => <CompactEventCard event={event} key={event.id} />)}
          </div>
        </section>
      )}

      <section className="cl-section">
        <h2 className="cl-h2 anim-rise">Ce ne definește</h2>
        <div className="cl-values">
          {VALUES.map((value) => (
            <div key={value.name} className="cl-value anim-rise">
              <div className="cl-value__name">{value.name}</div>
              <p className="cl-value__body">{value.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cl-section">
        <h2 className="cl-h2 anim-rise">Familia Interact</h2>
        <div className="cl-family">
          {FAMILY.map((tier, index) => (
            <div key={tier.name} className={`cl-family__tier cl-family__tier--${index + 1} anim-rise`}>
              <div className="cl-family__name">{tier.name}</div>
              <div className="cl-family__age">{tier.age}</div>
              <p className="cl-family__role">{tier.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cl-impact anim-rise" aria-label="Impact">
        <div className="cl-impact__grid">
          {impact.map((item) => (
            <div key={item.label}>
              <div className="cl-impact__num">{item.number}</div>
              <div className="cl-impact__label">{item.label}</div>
            </div>
          ))}
        </div>
      </section>
    </ClubPage>
  );
}

function GearMotif() {
  const spokes = Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2;
    return {
      x1: 12 + Math.cos(angle) * 6,
      y1: 12 + Math.sin(angle) * 6,
      x2: 12 + Math.cos(angle) * 9.5,
      y2: 12 + Math.sin(angle) * 9.5,
    };
  });

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" style={{ position: "absolute", inset: 0, margin: "auto", width: "46%", height: "46%", opacity: 0.16, color: "var(--im-cyan)" }}>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.1" />
      {spokes.map((spoke, index) => (
        <line key={index} x1={spoke.x1} y1={spoke.y1} x2={spoke.x2} y2={spoke.y2} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ))}
    </svg>
  );
}
