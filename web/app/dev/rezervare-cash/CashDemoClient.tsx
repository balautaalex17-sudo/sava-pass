"use client";

import Image from "next/image";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Ticket,
  UserRound,
  XCircle,
} from "lucide-react";
import { FlowNav } from "@/components/ui/FlowNav";
import styles from "./cash-demo.module.css";

type DemoStatus = "reserved" | "paid" | "checked_in" | "expired" | "cancelled";

export type CashDemoEvent = {
  title: string;
  dateLabel: string;
  venue: string;
  organizer: string;
  poster: string;
  priceRon: number;
  ticketCode: string;
  stockLabel?: string;
};

const DEFAULT_EVENT: CashDemoEvent = {
  title: "Echoes Unplugged",
  dateLabel: "14 noiembrie 2026, 19:00",
  venue: "Colegiul Național Sfântul Sava, Sala 12",
  organizer: "Interact Sf. Sava",
  poster: "/events/echoes-unplugged.png",
  priceRon: 50,
  ticketCode: "DEMO26",
  stockLabel: "24 locuri",
};

const statusCopy: Record<DemoStatus, { label: string; title: string; body: string }> = {
  reserved: {
    label: "În așteptarea plății",
    title: "Biletul tău a fost rezervat",
    body: "QR-ul identifică rezervarea, dar accesul rămâne blocat până la confirmarea plății cash.",
  },
  paid: {
    label: "Plătit",
    title: "Plata cash a fost confirmată",
    body: "Biletul este acum valid. Prezintă acest QR la intrarea în eveniment.",
  },
  checked_in: {
    label: "Folosit",
    title: "Check-in realizat",
    body: "Biletul a fost folosit la intrare și nu mai poate fi scanat încă o dată.",
  },
  expired: {
    label: "Expirat",
    title: "Rezervarea a expirat",
    body: "Plata nu a fost confirmată la timp, iar locul poate fi oferit altui participant.",
  },
  cancelled: {
    label: "Anulat",
    title: "Rezervarea a fost anulată",
    body: "Acest QR nu mai poate fi folosit pentru plată sau acces.",
  },
};

export function CashDemoClient({
  qrToken,
  event = DEFAULT_EVENT,
  backHref = "/",
  showDemoChrome = true,
}: {
  qrToken: string;
  event?: CashDemoEvent;
  backHref?: string;
  showDemoChrome?: boolean;
}) {
  const [screen, setScreen] = useState<"form" | "ticket">("form");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<DemoStatus>("reserved");
  const [participant, setParticipant] = useState({ name: "", email: "" });
  const priceLabel = `${event.priceRon} RON`;

  function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setParticipant({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
    });
    setPending(true);
    window.setTimeout(() => {
      setStatus("reserved");
      setScreen("ticket");
      setPending(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 550);
  }

  function resetDemo() {
    setStatus("reserved");
    setScreen("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className={`sp-light ${styles.page}`}>
      <FlowNav
        backHref={backHref}
        right={showDemoChrome ? <span className={styles.localBadge}><span /> Rezervare demo</span> : undefined}
      />

      {screen === "form" ? (
        <main className={styles.shell}>
          {showDemoChrome ? (
            <div className={styles.demoNotice} role="note">
              <ShieldCheck size={18} strokeWidth={1.8} />
              <div><strong>Mod demonstrativ</strong><span>Datele rămân în browser și nu sunt trimise în Supabase sau pe email.</span></div>
            </div>
          ) : null}

          <header className={styles.header}>
            <div>
              <h1>Rezervă biletul</h1>
              <p>{event.title} · rezervare cu plată cash.</p>
            </div>
            <div className={styles.secure}><ShieldCheck size={15} /> Rezervare securizată</div>
          </header>

          {showDemoChrome ? (
            <div className={styles.progress} aria-label="Progres rezervare">
              <ProgressStep n="1" label="Bilet" active />
              <span />
              <ProgressStep n="2" label="Date" active />
              <span />
              <ProgressStep n="3" label="QR" />
            </div>
          ) : null}

          <form id="cash-demo-form" onSubmit={reserve} className={styles.checkoutGrid}>
            <div className={styles.mainColumn}>
              <section className={styles.panel}>
                <div className={styles.sectionHead}>
                  <div><Ticket size={20} /><div><h2>Selectează biletul</h2><p>Un singur tip disponibil pentru acest eveniment.</p></div></div>
                  {event.stockLabel ? <span className={styles.stock}>{event.stockLabel}</span> : null}
                </div>
                <label className={styles.ticketChoice}>
                  <input type="radio" name="ticket" value="general" defaultChecked />
                  <span className={styles.radioMark}><Check size={13} /></span>
                  <span><strong>Acces general</strong><small>Acces complet și QR individual</small></span>
                  <b>{priceLabel}</b>
                </label>
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionHead}>
                  <div><UserRound size={20} /><div><h2>Datele participantului</h2><p>Completează datele persoanei care va folosi biletul.</p></div></div>
                </div>
                <div className={styles.fields}>
                  <Field id="demo-name" name="name" label="Prenume și nume" placeholder="Ana Vasilescu" autoComplete="name" />
                  <Field id="demo-email" name="email" label="Adresa de email" placeholder="ana@email.ro" type="email" autoComplete="email" />
                  <Field id="demo-phone" name="phone" label="Număr de telefon" placeholder="0712 345 678" type="tel" autoComplete="tel" />
                  <Field id="demo-school" name="school" label="Liceu sau organizație" placeholder="Colegiul Național Sfântul Sava" />
                </div>
                <label className={styles.checkRow}>
                  <input type="checkbox" name="terms" required />
                  <span>Sunt de acord cu termenii și politica de confidențialitate.</span>
                </label>
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionHead}>
                  <div><Banknote size={20} /><div><h2>Plată cash</h2><p>Confirmarea este făcută de organizator. Nu solicităm date de card.</p></div></div>
                  <span className={styles.selected}>Selectată</span>
                </div>
                <div className={styles.paymentInfo}>
                  <InfoRow icon={<MapPin size={17} />} label="Eveniment" value={event.venue} />
                  <InfoRow icon={<Clock3 size={17} />} label="Data" value={event.dateLabel} />
                  <InfoRow icon={<CalendarDays size={17} />} label="Termen" value="Rezervarea expiră în 48 de ore" />
                </div>
                <p className={styles.cashNote}>QR-ul este generat imediat, dar devine valid pentru acces numai după confirmarea plății cash.</p>
              </section>
            </div>

            <aside className={styles.summary}>
              <div className={styles.eventMini}>
                <div className={styles.poster}><Image src={event.poster} alt={`Afiș ${event.title}`} fill sizes="72px" /></div>
                <div><strong>{event.title}</strong><span>{event.dateLabel}</span><span>{event.organizer}</span></div>
              </div>
              <div className={styles.rule} />
              <SummaryRow label="1 × Acces general" value={priceLabel} />
              <SummaryRow label="Taxe" value="0 RON" />
              <div className={styles.rule} />
              <SummaryRow label="Total de plată cash" value={priceLabel} strong />
              <button className={styles.primary} type="submit" disabled={pending}>
                {pending ? <><span className={styles.spinner} /> Se rezervă...</> : <><Ticket size={17} /> Rezervă biletul</>}
              </button>
              <p className={styles.noCharge}>Nu vei fi taxat online.</p>
            </aside>

          </form>
        </main>
      ) : (
        <TicketDemo
          qrToken={qrToken}
          participant={participant}
          event={event}
          status={status}
          setStatus={setStatus}
          reset={resetDemo}
          showDemoChrome={showDemoChrome}
        />
      )}
    </div>
  );
}

function TicketDemo({ qrToken, participant, event, status, setStatus, reset, showDemoChrome }: {
  qrToken: string;
  participant: { name: string; email: string };
  event: CashDemoEvent;
  status: DemoStatus;
  setStatus: (status: DemoStatus) => void;
  reset: () => void;
  showDemoChrome: boolean;
}) {
  const copy = statusCopy[status];
  const blocked = status === "expired" || status === "cancelled";
  const used = status === "checked_in";

  return (
    <main className={`${styles.shell} ${styles.ticketShell}`}>
      {showDemoChrome ? (
        <div className={styles.demoNotice} role="note">
          <ShieldCheck size={18} /><div><strong>Simulare locală</strong><span>Folosește butoanele de mai jos pentru a testa fiecare status.</span></div>
        </div>
      ) : null}

      <header className={styles.successHeader}>
        <StatusIcon status={status} />
        <div><span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>{copy.label}</span><h1>{copy.title}</h1><p>{copy.body}</p></div>
      </header>

      <div className={styles.ticketGrid}>
        <section className={styles.qrPanel}>
          <div className={`${styles.qrPlate} ${blocked || used ? styles.qrMuted : ""}`}>
            <Image src={`/api/qr/${qrToken}`} alt="QR demonstrativ pentru rezervare" width={220} height={220} unoptimized />
            {(blocked || used) && <span>{status === "cancelled" ? "ANULAT" : status === "expired" ? "EXPIRAT" : "FOLOSIT"}</span>}
          </div>
          <strong className={styles.ticketCode}>{event.ticketCode}</strong>
          <p>Acest QR este real și semnat, dar nu corespunde unei înregistrări din baza de date.</p>
        </section>

        <section className={styles.detailsPanel}>
          <h2>Detalii rezervare</h2>
          <Detail label="Eveniment" value={event.title} />
          <Detail label="Participant" value={participant.name} />
          <Detail label="Email" value={participant.email} />
          <Detail label="Total cash" value={`${event.priceRon} RON`} />
          <Detail label="Termen" value="48 de ore" />

          <div className={styles.timeline}>
            <TimelineItem done label="Rezervare realizată" />
            <TimelineItem done={status !== "reserved" && status !== "expired" && status !== "cancelled"} label="Plată cash confirmată" />
            <TimelineItem done={status === "checked_in"} label="Check-in realizat" />
          </div>
        </section>
      </div>

      <section className={styles.simulator} aria-label="Simulator status bilet">
        <div><h2>Testează statusurile</h2><p>Ordinea normală este Rezervat, Plătit, apoi Folosit.</p></div>
        <div className={styles.simulatorActions}>
          <button type="button" className={styles.primary} onClick={() => setStatus("paid")} disabled={status !== "reserved"}><Banknote size={17} /> Confirmă plata cash</button>
          <button type="button" className={styles.secondary} onClick={() => setStatus("checked_in")} disabled={status !== "paid"}><ScanLine size={17} /> Simulează check-in</button>
          <button type="button" className={styles.secondary} onClick={() => setStatus("expired")}><Clock3 size={17} /> Expiră</button>
          <button type="button" className={styles.secondary} onClick={() => setStatus("cancelled")}><XCircle size={17} /> Anulează</button>
          <button type="button" className={styles.textButton} onClick={reset}><RefreshCw size={16} /> Reia exemplul</button>
        </div>
      </section>
    </main>
  );
}

function ProgressStep({ n, label, active }: { n: string; label: string; active?: boolean }) {
  return <div className={active ? styles.progressActive : ""}><b>{active ? <Check size={13} /> : n}</b><span>{label}</span></div>;
}

function Field({ id, name, label, placeholder, type = "text", autoComplete }: {
  id: string; name: string; label: string; placeholder: string; type?: string; autoComplete?: string;
}) {
  return <label className={styles.field} htmlFor={id}><span>{label}</span><input id={id} name={name} type={type} placeholder={placeholder} autoComplete={autoComplete} required /></label>;
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className={styles.infoRow}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={strong ? styles.summaryStrong : styles.summaryRow}><span>{label}</span><strong>{value}</strong></div>;
}

function StatusIcon({ status }: { status: DemoStatus }) {
  if (status === "paid" || status === "checked_in") return <span className={`${styles.statusIcon} ${styles.statusIconSuccess}`}><CheckCircle2 size={34} /></span>;
  if (status === "expired" || status === "cancelled") return <span className={`${styles.statusIcon} ${styles.statusIconDanger}`}><XCircle size={34} /></span>;
  return <span className={`${styles.statusIcon} ${styles.statusIconWarning}`}><Clock3 size={34} /></span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className={styles.detail}><span>{label}</span><strong>{value}</strong></div>;
}

function TimelineItem({ label, done }: { label: string; done: boolean }) {
  return <div className={done ? styles.timelineDone : ""}><span>{done ? <Check size={12} /> : null}</span><strong>{label}</strong></div>;
}
