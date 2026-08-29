import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { HomeNav } from "@/app/HomeNav";
import { GOLDEN_HOUR } from "@/lib/golden-hour";
import styles from "./events-index.module.css";

export default function LoadingEvents() {
  return (
    <div className="cl-shell" aria-live="polite" aria-busy="true">
      <HomeNav active="evenimente" immersive dark />
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Evenimente Interact</p>
            <h1>Evenimente cu scop. Experiențe care rămân.</h1>
            <p className={styles.heroLead}>
              Organizăm și susținem evenimente care inspiră, educă și aduc oamenii împreună.
              Fiecare participare contribuie la binele comunității.
            </p>
            <div className={styles.heroActions}>
              <Link href="#toate-evenimentele" className={styles.primaryButton}>
                Vezi toate evenimentele <ArrowDown size={17} aria-hidden="true" />
              </Link>
              <Link href="#impact" className={styles.textLink}>
                Descoperă cauzele noastre <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className={styles.featuredCard} aria-hidden="true">
            <div className={`${styles.featuredMedia} ${styles.loadingFeaturedMedia}`} />
            <div className={styles.featuredBody}>
              <span className={`${styles.loadingFeaturedLine} ${styles.loadingFeaturedLineShort}`} />
              <span className={`${styles.loadingFeaturedLine} ${styles.loadingFeaturedLineTitle}`} />
              <span className={styles.loadingFeaturedLine} />
              <span className={`${styles.loadingFeaturedLine} ${styles.loadingFeaturedLineMedium}`} />
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
