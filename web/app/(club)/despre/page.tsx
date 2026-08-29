import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GOLDEN_HOUR } from "@/lib/golden-hour";
import { eventIsBookable, getEventBySlug } from "@/lib/events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rezervă Golden Hour · SavaPass",
  description: "Rezervă biletul Golden Hour și primește codul QR SavaPass.",
  robots: { index: false, follow: false },
};

export default async function DesprePage() {
  const event = await getEventBySlug(GOLDEN_HOUR.slug);
  if (event && eventIsBookable(event)) redirect(`/${event.slug}/checkout`);

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#f8fafc" }}>
      <section style={{ width: "100%", maxWidth: 560, padding: 32, border: "1px solid #e2e8f0", borderRadius: 20, background: "white" }}>
        <p style={{ margin: "0 0 8px", color: "#0077a8", fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: ".08em" }}>Golden Hour</p>
        <h1 style={{ margin: "0 0 12px", color: "#0f172a", fontSize: 30 }}>Rezervările nu sunt configurate</h1>
        <p style={{ margin: "0 0 24px", color: "#475569", lineHeight: 1.65 }}>
          Nu îți vom afișa un bilet fals. Evenimentul și tipul de bilet trebuie activate în SavaPass înainte ca rezervarea și emailul cu QR să poată fi emise.
        </p>
        <Link href={GOLDEN_HOUR.detailHref} style={{ color: "#0077a8", fontWeight: 800 }}>Înapoi la eveniment</Link>
      </section>
    </main>
  );
}
