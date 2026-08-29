import { ClubPage } from "@/components/club/ClubPage";
import { ClubHero } from "@/components/club/ClubHero";
import { ProjectCard } from "@/components/club/ProjectCard";
import { EmptyState } from "@/components/club/EmptyState";
import { getPublishedProjects } from "@/lib/club";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Proiecte — Interact Sf. Sava",
  description: "Proiectele și cauzele Interact Sf. Sava — de la educație la comunitate.",
};

export default async function ProiectePage() {
  const projects = await getPublishedProjects();

  const hero = (
    <ClubHero
      variant="index"
      lines={[<>Proiecte făcute la Sf. Sava.</>]}
      lead="Aici documentăm campaniile, evenimentele și acțiunile pe care membrii clubului le-au dus de la idee la rezultat."
      count={projects.length ? `${projects.length} proiecte` : undefined}
    />
  );

  return (
    <ClubPage active="proiecte" hero={hero}>
      <section className="cl-section">
        {projects.length === 0 ? (
          <EmptyState
            title="Proiectele vin în curând"
            text="Documentăm acțiunile clubului. Între timp, află cum te poți implica."
          />
        ) : (
          <div className="cl-proj-grid">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </ClubPage>
  );
}
