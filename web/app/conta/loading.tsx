import { LoaderCircle } from "lucide-react";

import styles from "./conta.module.css";

export default function ContaLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.accessShell} role="status" aria-live="polite" aria-busy="true">
        <section className={styles.accessIntro}>
          <h1 className={styles.accessTitle}>Biletele tale.</h1>
          <p className={styles.accessLead}>
            Verificăm sesiunea și pregătim biletele tale.
          </p>
        </section>
        <section
          className={styles.accessPanel}
          style={{ alignItems: "center", gap: 14, textAlign: "center" }}
        >
          <LoaderCircle
            className="anim-spin-slow"
            size={30}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <p style={{ margin: 0, color: "var(--im-fg-2)", fontSize: 14 }}>
            Se încarcă…
          </p>
        </section>
      </div>
    </main>
  );
}
