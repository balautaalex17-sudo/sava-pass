import { Skeleton } from "@/components/ui/RouteSkeleton";
import styles from "./event-page.module.css";

export default function EventLoading() {
  return <main className={`sp-light ${styles.page}`} role="status" aria-label="Se pregătește evenimentul" aria-busy="true">
    <section className={styles.hero}><div className={styles.heroInner}>
      <div className={styles.poster}><Skeleton height="100%" /></div>
      <div className={styles.heroCopy}>
        <Skeleton width="32%" height={14} /><Skeleton height={64} style={{ marginTop: 20 }} />
        <Skeleton width="75%" height={28} style={{ marginTop: 18 }} />
        <div className={styles.heroFacts}>{[0, 1, 2].map((fact) => <div key={fact}><Skeleton width="60%" height={12} /><Skeleton width="80%" height={20} style={{ marginTop: 12 }} /></div>)}</div>
        <Skeleton height={54} style={{ marginTop: 24 }} />
      </div>
    </div></section>
  </main>;
}
