import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { mediaUrl } from "@/lib/storage";
import type { Project } from "@/lib/supabase/types";

/** Editorial project card for the /proiecte index (spec §U6). Cover image (or a
 * quiet placeholder), a mono meta line, the title, and a one-line summary. The
 * whole card links to the detail page. */
export function ProjectCard({ project }: { project: Project }) {
  const cover = mediaUrl(project.cover_path);
  const meta = [project.category, project.date_label].filter(Boolean).join(" · ");
  return (
    <Link href={`/proiecte/${project.slug}`} className="cl-proj-card anim-rise">
      <div className="cl-proj-card__cover">
        {cover ? (
          <Image src={cover} alt={project.title} fill sizes="(max-width: 760px) 100vw, 540px" style={{ objectFit: "cover" }} />
        ) : (
          <span className="cl-proj-card__ph" aria-hidden />
        )}
      </div>
      <div className="cl-proj-card__body">
        {meta && <div className="cl-proj-card__meta cl-label">{meta}</div>}
        <div className="cl-proj-card__title">
          <span>{project.title}</span>
          <ArrowUpRight size={18} strokeWidth={2} className="cl-proj-card__arrow" />
        </div>
        {project.summary && <p className="cl-proj-card__sum">{project.summary}</p>}
      </div>
    </Link>
  );
}
