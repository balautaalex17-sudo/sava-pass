import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { HomeNav } from "@/app/HomeNav";
import styles from "./events-index.module.css";

export default function LoadingEvents() {
  return (
    <div className="cl-shell" aria-live="polite" aria-busy="true">
      <HomeNav active="evenimente" immersive dark purchaseHref="/evenimente" />
      <header className={styles.hero}>
        <div className={`${styles.heroInner} ${styles.heroInnerSimple}`}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Calendarul clubului</p>
            <h1>Evenimente</h1>
            <p className={styles.heroLead}>Evenimentele active apar primele. După încheiere, rămân aici ca arhivă a clubului.</p>
            <div className={styles.heroActions}>
              <Link href="#evenimente-active" className={styles.primaryButton}>
                Vezi evenimentele <ArrowDown size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </header>
      <div className="cl-body">
        <main className={styles.main}>
          <section className={styles.eventsSection} id="evenimente-active">
            <div className={styles.sectionHeading}><div><h2>Active</h2><p>Se încarcă evenimentele…</p></div></div>
            <div className={styles.archiveLoading} aria-hidden="true"><div /><div /><div /></div>
          </section>
        </main>
      </div>
    </div>
  );
}
