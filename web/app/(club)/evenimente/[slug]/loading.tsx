import { Skeleton } from "@/components/ui/RouteSkeleton";
import styles from "../evenimente.module.css";
import detailStyles from "./event-detail.module.css";

export default function EventDetailLoading() {
  return <div className={`${styles.detailShell} ${detailStyles.detailPage}`} role="status" aria-label="Se pregătesc detaliile evenimentului" aria-busy="true">
    <main className={styles.detailMain}>
      <Skeleton width={160} height={20} />
      <div className={`${styles.detailHero} ${detailStyles.hero}`}>
        <div className={styles.detailIntro}><Skeleton width="40%" height={16} /><Skeleton height={72} style={{ marginTop: 24 }} /><Skeleton height={24} style={{ marginTop: 24 }} />
          <div className={styles.factList}>{[0, 1, 2].map((fact) => <div key={fact}><Skeleton width="25%" height={12} /><Skeleton width="55%" height={22} style={{ marginTop: 10 }} /></div>)}</div>
          <Skeleton width="60%" height={48} style={{ marginTop: 24 }} />
        </div>
        <div className={styles.detailVisual}><Skeleton height="100%" style={{ minHeight: 360 }} /></div>
      </div>
    </main>
  </div>;
}
