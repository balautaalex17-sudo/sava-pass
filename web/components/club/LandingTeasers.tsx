import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ProjectCard } from "./ProjectCard";
import type { Project } from "@/lib/supabase/types";

/**
 * Club teaser band rendered BELOW the immersive scroll on the homepage (spec §U7).
 * Pure React in the dark `--im-*` register, namespaced `.cl-teasers-*` so the
 * unscoped immersive CSS can't bleed in (and we never touch `.sp-immersive-root`
 * or the engine). Reveals via the layout-mounted `ScrollReveal` (`.anim-rise`).
 */
export function LandingTeasers({ projects, eventHref }: { projects: Project[]; eventHref: string }) {
  return (
    <section className="cl-teasers" aria-label="Despre clubul Interact Sf. Sava">
      <div className="cl-teasers__inner">
        <div className="cl-teasers__intro anim-rise">
          <div className="cl-label">Interact Sf. Sava</div>
          <h2 className="cl-teasers__h">
            Concerte în Curtea Veche, proiecte în oraș și o echipă formată la Sf. Sava.
          </h2>
          <p className="cl-text">
            SavaPass ține biletele și accesul în ordine. Interact Sf. Sava alege cauza, construiește proiectul și
            aduce oamenii împreună.
          </p>
          <div className="cl-teasers__links">
            <Link href="/despre" className="cl-link">Despre noi <ArrowRight size={16} strokeWidth={1.75} /></Link>
            <Link href="/proiecte" className="cl-link">Proiecte <ArrowRight size={16} strokeWidth={1.75} /></Link>
            <Link href="/echipa" className="cl-link">Echipa <ArrowRight size={16} strokeWidth={1.75} /></Link>
          </div>
        </div>

        {projects.length > 0 && (
          <div className="cl-teasers__feat">
            <div className="cl-teasers__feat-head anim-rise">
              <h3 className="cl-h3">Proiecte recente</h3>
              <Link href="/proiecte" className="cl-link">Toate proiectele <ArrowUpRight size={15} strokeWidth={1.75} /></Link>
            </div>
            <div className="cl-proj-grid">
              {projects.slice(0, 3).map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        )}

        <div className="cl-teasers__join anim-rise">
          <div>
            <h3 className="cl-teasers__join-h">Vrei să organizezi următoarea ediție?</h3>
            <p className="cl-text">
              Intră în echipă și învață cum se construiește un eveniment, de la prima schiță până la accesul din sală.
            </p>
          </div>
          <div className="cl-teasers__join-cta">
            <Link href="/devino-membru" className="cl-btn pressable hover-dim">
              Devino membru <ArrowRight size={18} strokeWidth={1.75} />
            </Link>
            <Link href={eventHref} className="cl-link">Vezi evenimentul <ArrowRight size={16} strokeWidth={1.75} /></Link>
          </div>
        </div>

      </div>
    </section>
  );
}
