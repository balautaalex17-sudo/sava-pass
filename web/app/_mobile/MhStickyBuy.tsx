"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

// Signature Moment 6 — the sticky door. Always-present buy bar that yields
// (fades out) while a real CTA is on screen (hero CTAs or the ticket's own buy),
// so the two never duplicate intent. Returns after. Only when an event exists.
export function MhStickyBuy({ href, priceRon }: { href: string; priceRon: number }) {
  const [hidden, setHidden] = useState(true);
  const visible = useRef<Set<Element>>(new Set());

  useEffect(() => {
    const targets = [
      ...document.querySelectorAll(".mh-hero__cta"),
      ...document.querySelectorAll(".mh-ticket__buy"),
      ...document.querySelectorAll(".mh-foot"),
    ];
    if (targets.length === 0) {
      setHidden(false);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.current.add(e.target);
          else visible.current.delete(e.target);
        }
        setHidden(visible.current.size > 0);
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <div className="mh-dock" data-hidden={hidden ? "true" : "false"} aria-hidden={hidden}>
      <a className="mh-dock__btn" href={href} tabIndex={hidden ? -1 : 0}>
        Cumpără bilet · <span className="mh-num">{priceRon} RON</span>
        <ArrowRight size={18} strokeWidth={2.2} />
      </a>
    </div>
  );
}
