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
      variant="cinematic"
      lines={[<>Board-ul și membrii</>, <>Interact Sf. Sava.</>]}
      lead="Echipa care propune proiectele, împarte responsabilitățile și le duce până la capăt."
      media={{
        src: "/imersiv/team-interact.webp",
        alt: "Echipa Interact Sf. Sava la un eveniment al clubului",
        mobilePosition: "50% 56%",
      }}
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
