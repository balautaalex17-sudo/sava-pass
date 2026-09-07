"use client";

import type { ReactNode } from "react";
import { PortalLink as Link } from "@/components/dashboard/PortalLink";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import styles from "./gallery.module.css";

export function GalleryFrame({ children, membershipStatus, page, hasNext }: {
  children: ReactNode;
  membershipStatus: string | null;
  page: number;
  hasNext: boolean;
}) {
  const pathname = usePathname();
  const inPortal = pathname === "/membru/galerie" || pathname === "/board/galerie";
  const Container = inPortal ? "section" : "main";
  const accountHref = membershipStatus === "active" ? "/membru"
    : membershipStatus === "recruit" ? "/conta/recrut" : "/conta";

  return (
    <Container className={`${styles.page}${inPortal ? ` ${styles.portal}` : ""}`}>
      <div className={styles.shell}>
        {!inPortal && <Link className={styles.back} href={accountHref}><ArrowLeft size={16} /> Înapoi la cont</Link>}
        {children}
        <nav className={styles.pagination} aria-label="Pagini galerie">
          {page > 1 && <Link className={styles.secondary} href={`${pathname}?page=${page - 1}`}>Pagina anterioară</Link>}
          {(page > 1 || hasNext) && <span>Pagina {page}</span>}
          {hasNext && <Link className={styles.secondary} href={`${pathname}?page=${page + 1}`}>Mai multe poze</Link>}
        </nav>
      </div>
    </Container>
  );
}
