"use client";

import Link, { useLinkStatus } from "next/link";
import { useState, type ComponentProps } from "react";
import styles from "./navigation.module.css";

// Full prefetch retains a page payload longer than an automatic loading-boundary
// prefetch. Limit it to descriptive content, never live availability or permissions.
export function isStablePublicDestination(href: string) {
  return ["/despre", "/district", "/contact", "/sponsori", "/echipa", "/proiecte"].includes(href)
    || href.startsWith("/proiecte/") || href.startsWith("/evenimente/");
}

type NavigationLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** Native navigation keeps the current screen interactive while Next streams its destination. */
export function AnimatedNavLink({ href, children, prefetch = null, onMouseEnter, onFocus, ...props }: NavigationLinkProps) {
  const [intent, setIntent] = useState(false);
  // Landing assets warm only on intent, not from every visible Home link.
  return (
    <Link
      {...props}
      href={href}
      prefetch={prefetch === false ? false : href === "/" ? intent : intent && isStablePublicDestination(href) ? true : prefetch}
      onMouseEnter={(event) => { onMouseEnter?.(event); setIntent(true); }}
      onFocus={(event) => { onFocus?.(event); setIntent(true); }}
    >
      {children}
      <NavigationFeedback />
    </Link>
  );
}

function NavigationFeedback() {
  const { pending } = useLinkStatus();
  return pending ? <span className={styles.pending} role="status" aria-label="Se deschide pagina" /> : null;
}
