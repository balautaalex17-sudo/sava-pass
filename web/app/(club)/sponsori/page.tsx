import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ClubPage } from "@/components/club/ClubPage";
import { ClubHero } from "@/components/club/ClubHero";
import { SponsorWall } from "@/components/club/SponsorWall";
import { EmptyState } from "@/components/club/EmptyState";
import { getSponsors } from "@/lib/club";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Parteneri — Interact Sf. Sava",
  description: "Oamenii și organizațiile care fac posibile proiectele Interact Sf. Sava.",
};

export default async function SponsoriPage() {
  const sponsors = await getSponsors();

  const hero = (
    <ClubHero
      variant="index"
      kicker="Parteneri"
      lines={[<>Cei care ne sprijină <span key="a" className="cl-hero__accent">să mergem mai departe.</span></>]}
      lead="Proiectele noastre există datorită partenerilor care cred în puterea voluntariatului."
    />
  );

  const cta = (
    <div className="cl-cta-band">
      <div className="cl-cta-row cl-cta-row--split">
        <div>
          <h2 className="cl-h2">Vrei să devii partener?</h2>
          <p className="cl-text">Scrie-ne și construim împreună următorul proiect.</p>
        </div>
        <Link href="/contact" className="cl-btn pressable hover-dim">
          Contactează-ne <ArrowRight size={18} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );

  return (
    <ClubPage active="sponsori" hero={hero} cta={cta}>
      <section className="cl-section">
        {sponsors.length === 0 ? (
          <EmptyState
            title="Lista de parteneri se actualizează"
            text="Pregătim recunoașterea partenerilor noștri. Vrei să fii printre ei?"
          />
        ) : (
          <SponsorWall sponsors={sponsors} />
        )}
      </section>
    </ClubPage>
  );
}
