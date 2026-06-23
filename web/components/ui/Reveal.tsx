"use client";

import { useEffect, useRef, type ElementType, type ReactNode, type CSSProperties } from "react";

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  delay?: number;
}

export function Reveal({ children, as: Tag = "div", className, style, delay }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (delay) {
      el.style.transitionDelay = `${delay}ms`;
    }

    // Mark as armed — this is the trigger for the CSS transition
    el.setAttribute("data-armed", "");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-inview", "");
          observer.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref as React.Ref<HTMLDivElement>} className={className} style={style}>
      {children}
    </Tag>
  );
}
