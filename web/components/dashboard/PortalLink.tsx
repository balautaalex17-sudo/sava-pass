"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { createPortal } from "react-dom";
import styles from "./portal-navigation.module.css";

/** Keep Next's automatic, short-lived prefetch for permission-sensitive pages. */
export function PortalLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<PortalNavigationFeedback /></Link>;
}

function PortalNavigationFeedback() {
  const { pending } = useLinkStatus();
  // The mobile menu closes on click. Keep feedback outside that hidden container.
  return pending ? createPortal(
    <span className={styles.progress} role="status" aria-label="Se deschide pagina" data-portal-navigation-pending="true" />,
    document.body,
  ) : null;
}
