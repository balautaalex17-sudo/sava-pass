import { Ticket } from "lucide-react";
import { Skeleton } from "@/components/ui/RouteSkeleton";
import styles from "./rezerva.module.css";

export default function ReservationLoading() {
  return <main className={`sp-light ${styles.page}`} role="status" aria-label="Se pregătesc rezervările" aria-busy="true"><div className={styles.main}>
    <header className={styles.header}>
      <div className={styles.headerIcon}><Ticket size={24} aria-hidden="true" /></div>
      <div><h1>Rezervă un bilet</h1><p>Pregătim evenimentele și opțiunile disponibile.</p></div>
    </header>
    <div className={styles.eventList}>{[0, 1].map((item) => <div className={styles.eventChoice} key={item} aria-hidden="true">
      <div className={styles.poster}><Skeleton height="100%" /></div>
      <div className={styles.eventDetails}><Skeleton width="35%" height={14} /><Skeleton height={36} style={{ marginTop: 20 }} /><Skeleton width="75%" height={18} style={{ marginTop: 20 }} /></div>
    </div>)}</div>
  </div></main>;
}
