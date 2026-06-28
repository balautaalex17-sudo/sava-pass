import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClubPage } from "@/components/club/ClubPage";
import { ClubHero } from "@/components/club/ClubHero";
import { Gallery } from "@/components/club/Gallery";
import { getProjectBySlug } from "@/lib/club";
import { mediaUrl } from "@/lib/storage";
import type { Metadata } from "next";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProjectBySlug(slug);
  if (!p) return { title: "Proiect — Interact Sf. Sava" };
  return { title: `${p.title} — Interact Sf. Sava`, description: p.summary ?? undefined };
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProjectBySlug(slug);
  // Unknown slug OR an unpublished project (getProjectBySlug filters published) → 404.
  if (!p) notFound();

  const gallery = Array.isArray(p.gallery) ? p.gallery.filter((x): x is string => typeof x === "string") : [];
  const cover = mediaUrl(p.cover_path);
  const meta = [p.category, p.date_label, p.location].filter(Boolean).join(" · ");

  const hero = (
    <ClubHero
      variant={cover ? "cinematic" : "editorial"}
      kicker={p.beneficiary ? `Pentru ${p.beneficiary}` : undefined}
      lines={[<>{p.title}</>]}
      lead={p.summary ?? undefined}
      media={cover ? { src: cover, alt: p.title } : undefined}
    />
  );

  return (
    <ClubPage active="proiecte" hero={hero}>
      <section className="cl-section">
        {meta && <div className="cl-proj-meta cl-label">{meta}</div>}
        {p.body && (
          <div className="cl-prose">
            {p.body.split(/\n\n+/).map((para, i) => (
              <p key={i} className="cl-text">{para}</p>
            ))}
          </div>
        )}
      </section>

      {gallery.length > 0 && (
        <section className="cl-section">
          <h2 className="cl-h2 anim-rise">Galerie</h2>
          <Gallery paths={gallery} alt={p.title} />
        </section>
      )}

      <section className="cl-section">
        <Link href="/proiecte" className="cl-link">
          <ArrowLeft size={16} strokeWidth={2} /> Toate proiectele
        </Link>
      </section>
    </ClubPage>
  );
}
