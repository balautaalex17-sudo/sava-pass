import type { Metadata } from "next";
import { OperationalScanner } from "@/components/dashboard/OperationalScanner";
import { requirePagePermission } from "@/lib/dashboard/auth";

export const metadata: Metadata = { title: "Scanează bilete", robots: { index: false, follow: false } };

export default async function TicketScannerPage() {
  await requirePagePermission("scan_event_tickets");
  return <div className="dash-page"><header className="dash-page-head"><div><span className="dash-eyebrow">Acces eveniment</span><h1>Scanează bilete</h1><p>Scanarea confirmă automat plata cash și intrarea participantului.</p></div></header><OperationalScanner mode="tickets" /></div>;
}
