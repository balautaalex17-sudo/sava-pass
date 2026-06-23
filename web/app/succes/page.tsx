"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { GearWatermark } from "@/components/ui/GearWatermark";

// Gear-only spinner: reuses the Logo gear SVG geometry, 36px, cyan, spins
function GearSpinner() {
  const size = 36;
  const cyan = "#009FE3";
  const dots = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const x1 = 12 + Math.cos(a) * 6;
    const y1 = 12 + Math.sin(a) * 6;
    const x2 = 12 + Math.cos(a) * 8.5;
    const y2 = 12 + Math.sin(a) * 8.5;
    return { x1, y1, x2, y2 };
  });

  return (
    <svg
      className="anim-spin-slow"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3.2" stroke={cyan} strokeWidth="1.6" />
      {dots.map((d, i) => (
        <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={cyan} strokeWidth="1.6" strokeLinecap="round" />
      ))}
    </svg>
  );
}

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<"polling" | "ready" | "error">("polling");
  const [ticketToken, setTicketToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      queueMicrotask(() => setStatus("error"));
      return;
    }

    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/order-status?session_id=${sessionId}`);
        const data = await res.json();
        if (data.status === "paid" && data.ticket_token) {
          setTicketToken(data.ticket_token);
          setEmail(data.email ?? null);
          setStatus("ready");
        } else if (data.status === "failed") {
          setStatus("error");
        } else if (attempts < 15) {
          setTimeout(poll, 2000);
        } else {
          setStatus("error");
        }
      } catch {
        if (attempts < 15) setTimeout(poll, 2000);
        else setStatus("error");
      }
    };
    poll();
  }, [sessionId]);

  if (status === "polling") {
    return (
      <div style={{ textAlign: "center" }}>
        <GearSpinner />
        <p style={{ marginTop: 16, color: "var(--slate-600)", fontSize: 16 }}>Se emite biletul…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ position: "relative", textAlign: "center", padding: "40px 20px" }}>
        <GearWatermark />
        <div style={{ position: "relative", zIndex: 1 }} className="anim-fade">
          <p style={{ color: "var(--danger)", fontSize: 16 }}>Ceva a mers greșit. Contactează Interact Sf. Sava.</p>
          <Link href="/" style={{ color: "var(--brand-cyan-700)", fontSize: 14, display: "block", marginTop: 16 }}>Înapoi acasă</Link>
        </div>
      </div>
    );
  }

  // Ready state — choreographed sequence
  return (
    <div style={{ textAlign: "center" }}>
      {/* Ring + check */}
      <div
        className="anim-pop ring-pulse"
        style={{
          position: "relative",
          width: 80,
          height: 80,
          margin: "0 auto 24px",
          borderRadius: "50%",
          background: "var(--success-100)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--success)",
          animationDelay: "0ms",
        }}
      >
        <CheckCircle
          size={40}
          strokeWidth={1.75}
          color="var(--success)"
          className="anim-pop"
          style={{ animationDelay: "120ms" }}
        />
      </div>

      {/* Serif italic headline — the ceremonial moment */}
      <h1
        className="anim-rise"
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: 40,
          color: "var(--brand-navy)",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          margin: "0 0 12px",
          animationDelay: "220ms",
        }}
      >
        Ești înăuntru.
      </h1>

      {email && (
        <p
          className="anim-fade"
          style={{
            color: "var(--slate-500)",
            fontSize: 14,
            margin: "0 0 32px",
            animationDelay: "320ms",
          }}
        >
          Am trimis biletul pe <strong style={{ color: "var(--brand-navy)" }}>{email}</strong>
        </p>
      )}

      <Link
        href={`/bilet/${ticketToken}`}
        className="pressable hover-dim anim-rise"
        style={{
          display: "inline-block", padding: "14px 28px", borderRadius: 14, textDecoration: "none",
          background: "linear-gradient(135deg, var(--brand-cyan) 0%, var(--brand-blue) 100%)",
          color: "white", fontWeight: 700, fontSize: 15,
          boxShadow: "var(--shadow-brand)",
          animationDelay: "400ms",
        }}
      >
        Vezi biletul
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--slate-50)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ marginBottom: 48 }}><Logo size={22} /></div>
      <Suspense fallback={
        <div style={{ textAlign: "center" }}>
          <GearSpinner />
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
