"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Sets data-in="true" on its element once it scrolls into view (fires once).
 * CSS does the choreography per section (.mh-up rise, .mh-hl line mask,
 * .mh-seats__fill, .mh-thread__line). One IO primitive, CSS-driven motion —
 * off the main thread, smooth under load.
 */
export function MhReveal({
  as: Tag = "div",
  className = "",
  children,
  amount = 0.25,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  amount?: number;
  [key: string]: unknown;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: amount, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [amount, shown]);

  return (
    <Tag ref={ref} className={`mh-rv ${className}`} data-in={shown ? "true" : "false"} {...rest}>
      {children}
    </Tag>
  );
}
