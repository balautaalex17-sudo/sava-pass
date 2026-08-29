import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { GearWatermark } from "@/components/ui/GearWatermark";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";
import { TicketAccessForm } from "./TicketAccessForm";
import styles from "./conta.module.css";

export const metadata: Metadata = {
  title: "Biletele mele — SavaPass",
  description: "Găsește și deschide biletele tale Interact Sf. Sava.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, { tone: "success" | "used" | "danger" | "warning"; label: string }> = {
  reserved: { tone: "warning", label: "Rezervat" },
  paid: { tone: "success", label: "Plătit" },
  checked_in: { tone: "used", label: "Folosit" },
  cancelled: { tone: "danger", label: "Anulat" },
  expired: { tone: "danger", label: "Expirat" },
};

type TicketRow = {
  id: string;
  code: string;
  qr_token: string;
  status: string;
  issued_at: string;
  events: {
    title: string;
    date_label: string;
    venue: string;
    status: string;
  } | null;
};

export default async function ContaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const [{ data: { user } }, params] = await Promise.all([
    supabase.auth.getUser(),
    searchParams,
  ]);

  if (!user) {
    return <TicketLookupPage initialError={params.error === "1"} />;
  }

  const { data } = await supabase
    .from("tickets")
    .select("id, code, qr_token, status, issued_at, events(title, date_label, venue, status)")
    .order("issued_at", { ascending: false });

  const tickets = (data ?? []) as unknown as TicketRow[];
  const activeTickets = tickets.filter((ticket) => ticket.events?.status === "active");
  const pastTickets = tickets.filter((ticket) => ticket.events?.status !== "active");

  return (
    <main className={styles.page}>
      <div className={styles.walletShell}>
        <header className={styles.walletHeader}>
          <div>
            <h1>Biletele tale</h1>
            <p>{user.email}</p>
          </div>
          <SignOutButton />
        </header>

        {tickets.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <section className={styles.walletSection} aria-labelledby="active-tickets-title">
              <div className={styles.sectionHeading}>
                <h2 id="active-tickets-title">Pentru următoarea ieșire</h2>
                <span>{activeTickets.length}</span>
              </div>
              {activeTickets.length > 0 ? (
                <div className={styles.activeList}>
                  {activeTickets.map((ticket) => <ActiveTicket key={ticket.id} ticket={ticket} />)}
                </div>
              ) : (
                <p style={{ color: "var(--im-fg-3)", fontSize: 13, margin: 0 }}>
                  Nu ai bilete pentru un eveniment activ.
                </p>
              )}
            </section>

            {pastTickets.length > 0 ? (
              <section className={styles.walletSection} aria-labelledby="ticket-history-title">
                <div className={styles.sectionHeading}>
                  <h2 id="ticket-history-title">Istoric</h2>
                  <span>{pastTickets.length}</span>
                </div>
                <div className={styles.historyList}>
                  {pastTickets.map((ticket) => <HistoryTicket key={ticket.id} ticket={ticket} />)}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

function TicketLookupPage({ initialError }: { initialError: boolean }) {
  return (
    <main className={styles.page}>
      <div className={styles.accessShell}>
        <section className={styles.accessIntro} aria-labelledby="ticket-access-title">
          <h1 id="ticket-access-title" className={styles.accessTitle}>
            Biletele tale. <span>Fără cont.</span>
          </h1>
          <p className={styles.accessLead}>
            Introdu emailul sau telefonul folosit la rezervare. Îți trimitem un link privat,
            iar toate biletele apar într-un singur loc.
          </p>

        </section>

        <TicketAccessForm initialError={initialError} />
      </div>
    </main>
  );
}

function ActiveTicket({ ticket }: { ticket: TicketRow }) {
  const event = ticket.events;
  const chip = STATUS_CHIP[ticket.status] ?? { tone: "used" as const, label: ticket.status };

  return (
    <Link href={`/bilet/${ticket.qr_token}`} className={styles.activePass}>
      <div className={styles.passMain}>
        <div className={styles.passTop}>
          <h3 className={styles.passTitle}>{event?.title ?? "Eveniment Interact"}</h3>
          <Chip tone={chip.tone} dot>{chip.label}</Chip>
        </div>
        <div className={styles.passMeta}>
          <span><CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />{event?.date_label ?? "Data în curs de confirmare"}</span>
          <span><MapPin size={16} strokeWidth={1.75} aria-hidden="true" />{event?.venue ?? "Locație în curs de confirmare"}</span>
        </div>
      </div>
      <div className={styles.passStub}>
        <span className={styles.ticketCode}>{ticket.code}</span>
        <span className={styles.openTicket}>
          Deschide biletul
          <ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

function HistoryTicket({ ticket }: { ticket: TicketRow }) {
  const event = ticket.events;
  const chip = STATUS_CHIP[ticket.status] ?? { tone: "used" as const, label: ticket.status };

  return (
    <Link href={`/bilet/${ticket.qr_token}`} className={styles.historyItem}>
      <span className={styles.historyEvent}>
        <strong>{event?.title ?? "Eveniment Interact"}</strong>
        <span>{event?.date_label ?? "Dată indisponibilă"} · {event?.venue ?? "Locație indisponibilă"}</span>
      </span>
      <span className={styles.historyCode}>{ticket.code}</span>
      <Chip tone={chip.tone} dot>{chip.label}</Chip>
    </Link>
  );
}

function EmptyState() {
  return (
    <section className={styles.emptyState}>
      <GearWatermark />
      <div className={styles.emptyContent}>
        <h2>Niciun bilet pe acest email</h2>
        <p>
          Biletele apar automat când rezervarea folosește aceeași adresă de email.
          Poți ieși și încerca alte date.
        </p>
        <Link href="/evenimente" className={styles.eventLink}>
          Vezi evenimentele
          <ArrowRight size={17} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
