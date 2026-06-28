import Image from "next/image";
import { mediaUrl } from "@/lib/storage";

/** Accessible, lazy photo gallery (spec §U6, reused by projects + district).
 * Takes an array of Storage object paths; renders nothing if none resolve. Pure
 * CSS masonry-ish grid, lazy-loaded, reduced-motion safe (no JS animation). */
export function Gallery({ paths, alt }: { paths: string[]; alt: string }) {
  const urls = paths.map((p) => mediaUrl(p)).filter((u): u is string => !!u);
  if (urls.length === 0) return null;
  return (
    <div className="cl-gallery">
      {urls.map((u, i) => (
        <div key={i} className="cl-gallery__item anim-rise">
          <Image src={u} alt={`${alt} — imaginea ${i + 1}`} fill sizes="(max-width: 760px) 50vw, 360px" loading="lazy" style={{ objectFit: "cover" }} />
        </div>
      ))}
    </div>
  );
}
