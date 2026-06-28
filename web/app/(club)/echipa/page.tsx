import { ClubPage } from "@/components/club/ClubPage";
import { ClubHero } from "@/components/club/ClubHero";
import { TeamGrid } from "@/components/club/TeamGrid";
import { EmptyState } from "@/components/club/EmptyState";
import { getTeam } from "@/lib/club";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Echipa — Interact Sf. Sava",
  description: "Oamenii din spatele proiectelor Interact Sf. Sava — board-ul și membrii clubului.",
};

export default async function EchipaPage() {
  const members = await getTeam();

  const hero = (
    <ClubHero
      variant="index"
      kicker="Echipa"
      lines={[<>Oamenii din spatele <span key="a" className="cl-hero__accent">fiecărui proiect.</span></>]}
      lead="Un board care își asumă răspunderea și membri care transformă ideile în acțiune."
    />
  );

  return (
    <ClubPage active="echipa" hero={hero}>
      <section className="cl-section">
        {members.length === 0 ? (
          <EmptyState
            title="Echipa se actualizează"
            text="Pregătim profilurile noii generații de membri. Revino curând sau aplică să faci parte din ea."
          />
        ) : (
          <TeamGrid members={members} />
        )}
      </section>
    </ClubPage>
  );
}
