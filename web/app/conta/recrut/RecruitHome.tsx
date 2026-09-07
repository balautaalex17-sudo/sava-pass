import Link from "next/link";
import { ArrowUpRight, Images, Ticket, UserRoundCheck } from "lucide-react";
import { SignOutButton } from "../SignOutButton";
import styles from "./recrut.module.css";

export function RecruitHome({ fullName, email, dashboardHref }: { fullName: string; email: string; dashboardHref?: string }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <span>Interact Sf. Sava</span>
          <SignOutButton />
        </header>
        <section className={styles.welcome} aria-labelledby="recruit-title">
          <span className={styles.badge}><UserRoundCheck size={16} /> Recrut</span>
          <h1 id="recruit-title">Bun venit, {fullName.split(" ")[0]}.</h1>
          <p>Ai fost acceptat în club. Acesta este contul tău de recrut.</p>
          <span className={styles.email}>{email}</span>
        </section>
        <div className={styles.cards}>
          {dashboardHref && <Link href={dashboardHref} className={styles.card}>
            <UserRoundCheck size={28} aria-hidden="true" />
            <h2>Instrumentele clubului</h2>
            <p>Accesează funcțiile activate pentru contul tău de recrut.</p>
            <span>Deschide instrumentele <ArrowUpRight size={18} aria-hidden="true" /></span>
          </Link>}
          <Link href="/conta/galerie" className={styles.card}>
            <Images size={28} aria-hidden="true" />
            <h2>Galeria comunității</h2>
            <p>Vezi momentele clubului și adaugă fotografiile tale alături de recruți, membri și board.</p>
            <span>Deschide galeria <ArrowUpRight size={18} aria-hidden="true" /></span>
          </Link>
          <Link href="/conta" className={styles.card}>
            <Ticket size={28} aria-hidden="true" />
            <h2>Biletele tale</h2>
            <p>Găsește biletele rezervate cu aceeași adresă de email și codurile lor QR.</p>
            <span>Vezi biletele <ArrowUpRight size={18} aria-hidden="true" /></span>
          </Link>
        </div>
        <p className={styles.note}>Board-ul te poate trece la membru activ. Vei păstra același cont și aceeași parolă.</p>
      </div>
    </main>
  );
}
