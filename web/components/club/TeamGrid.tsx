import Image from "next/image";
import { mediaUrl } from "@/lib/storage";
import type { TeamMember } from "@/lib/supabase/types";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Public team grid (spec §U5): crafted portrait cards, ordered by `sort`. Photos
 * come from the Storage `media` bucket via next/image; a member with no photo gets
 * a typographic initials plate so the grid stays even. */
export function TeamGrid({ members }: { members: TeamMember[] }) {
  return (
    <div className="cl-team-grid">
      {members.map((m) => {
        const photo = mediaUrl(m.photo_path);
        return (
          <figure key={m.id} className="cl-member anim-rise">
            <div className="cl-member__photo">
              {photo ? (
                <Image src={photo} alt={m.name} fill sizes="(max-width: 760px) 45vw, 250px" style={{ objectFit: "cover" }} />
              ) : (
                <span className="cl-member__ph" aria-hidden>{initials(m.name)}</span>
              )}
            </div>
            <figcaption className="cl-member__cap">
              <div className="cl-member__name">{m.name}</div>
              <div className="cl-member__role">{m.role}</div>
              {m.mandate && <div className="cl-member__mandate">{m.mandate}</div>}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
