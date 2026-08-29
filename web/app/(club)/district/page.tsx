import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ClubPage } from "@/components/club/ClubPage";
import { ClubHero } from "@/components/club/ClubHero";
import { getContent } from "@/lib/club";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "District 2241 — Interact Sf. Sava",
  description: "Interact Sf. Sava face parte din Districtul Rotary 2241 România & Republica Moldova.",
};

const INTRO_FALLBACK =
  "Interact Sf. Sava nu lucrează izolat. Facem parte din Districtul Rotary 2241, care reunește cluburile Rotary, Rotaract și Interact din România și Republica Moldova — o rețea de mii de voluntari de toate vârstele.";

const BODY_FALLBACK = `Apartenența la district înseamnă mai mult decât un nume. Înseamnă proiecte comune, conferințe unde ne întâlnim cu cluburi din toată țara, schimburi de experiență și acces la mentori care fac voluntariat de zeci de ani.

Pentru un membru Interact, districtul e poarta către o comunitate care nu se termină la finalul liceului: din Interact treci în Rotaract, apoi în Rotary, rămânând conectat la aceiași oameni și aceleași valori.`;

export default async function DistrictPage() {
  const intro = await getContent("district_intro", INTRO_FALLBACK);
  const body = await getContent("district_body", BODY_FALLBACK);

  const hero = (
    <ClubHero
      variant="index"
      kicker="Districtul Rotary 2241"
      lines={[<>De la Sf. Sava,</>, <>într‑o rețea mai mare.</>]}
      lead={intro}
    />
  );

  const cta = (
    <div className="cl-cta-band">
      <div className="cl-cta-row">
        <Link href="/despre" className="cl-btn pressable hover-dim">
          Despre familia Interact <ArrowRight size={18} strokeWidth={2} />
        </Link>
        <Link href="/devino-membru" className="cl-link">
          Devino membru <ArrowRight size={16} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );

  return (
    <ClubPage active="district" hero={hero} cta={cta}>
      <section className="cl-section">
        <div className="cl-prose cl-prose--wide">
          {body.split(/\n\n+/).map((para, i) => (
            <p key={i} className="cl-text">{para}</p>
          ))}
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-family">
          <div className="cl-family__tier cl-family__tier--1 anim-rise">
            <div className="cl-family__name">Rotary</div>
            <div className="cl-family__age">Fondatorii</div>
            <p className="cl-family__role">Cluburile de adulți care susțin întreaga rețea cu resurse și experiență.</p>
          </div>
          <div className="cl-family__tier cl-family__tier--2 anim-rise">
            <div className="cl-family__name">Rotaract</div>
            <div className="cl-family__age">18-30 ani</div>
            <p className="cl-family__role">Tineri și studenți care duc proiectele mai departe la nivel de district.</p>
          </div>
          <div className="cl-family__tier cl-family__tier--3 anim-rise">
            <div className="cl-family__name">Interact</div>
            <div className="cl-family__age">12-18 ani</div>
            <p className="cl-family__role">Cluburi de elevi — locul nostru, primul pas în această comunitate.</p>
          </div>
        </div>
      </section>
    </ClubPage>
  );
}
