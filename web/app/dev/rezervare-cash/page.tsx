import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { signTicket } from "@/lib/qr-token";
import { CashDemoClient } from "./CashDemoClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demo rezervare cash | SavaPass",
  robots: { index: false, follow: false },
};

const DEMO_TICKET_ID = "8c83155e-f94a-4cc8-a57d-0ca4d33e7f24";

export default function CashReservationDemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return <CashDemoClient qrToken={signTicket(DEMO_TICKET_ID)} />;
}
