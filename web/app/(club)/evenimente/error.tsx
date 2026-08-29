"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./evenimente.module.css";

export default function EventsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("evenimente_route_error", { digest: error.digest ?? null });
  }, [error.digest]);

  return (
    <main className={styles.routeError}>
      <p className={styles.eyebrow}>ARHIVA NU S-A ÎNCĂRCAT</p>
      <h1>Nu am putut deschide evenimentele.</h1>
      <p>Datele locale rămân în siguranță. Poți încerca din nou sau reveni la pagina principală.</p>
      <div><button type="button" onClick={reset}>Încearcă din nou</button><Link href="/">Înapoi acasă</Link></div>
    </main>
  );
}
