"use client";
import { useState, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { MailCheck } from "lucide-react";

function LoginForm() {
  const params = useSearchParams();
  const hasError = params.get("error") === "1";

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(hasError ? "Linkul a expirat sau e invalid. Încearcă din nou." : null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/conta/confirm`,
        },
      });
      if (error) {
        setError("Nu am putut trimite linkul. Verifică adresa de email.");
      } else {
        setSent(true);
      }
    });
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--im-ink)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
    }}>
      <div style={{ marginBottom: 40 }}><Logo size={22} /></div>

      <div
        className="anim-rise"
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--im-ink-2)",
          borderRadius: 20,
          padding: "32px 28px",
          boxShadow: "var(--im-shadow)",
          border: "1px solid var(--im-line)",
        }}
      >
        {sent ? (
          <div className="anim-fade" style={{ textAlign: "center" }}>
            {/* Success icon — spring pop (success moment) */}
            <div
              className="anim-pop"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--brand-cyan-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <MailCheck size={24} color="var(--brand-cyan-700)" strokeWidth={1.75} />
            </div>
            <h1 style={{ fontWeight: 800, fontSize: 20, color: "var(--im-fg)", margin: "0 0 10px" }}>
              Verifică emailul
            </h1>
            <p style={{ fontSize: 14, color: "var(--im-fg-2)", lineHeight: 1.6, margin: 0 }}>
              Am trimis un link de acces la <strong>{email}</strong>.
              Deschide-l pentru a-ți vedea biletele.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              style={{
                marginTop: 20,
                fontSize: 13,
                color: "var(--im-cyan-light)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
                transition: "color var(--dur-fast) ease",
              }}
            >
              Trimite din nou
            </button>
          </div>
        ) : (
          <div className="anim-fade">
            <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--im-fg)", margin: "0 0 4px" }}>
              Biletele mele
            </h1>
            <p style={{ fontSize: 13, color: "var(--im-fg-2)", margin: "0 0 28px" }}>
              Introdu emailul cu care ai cumpărat biletul.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--im-fg-3)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="ana@email.ro"
                  className="input"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--im-line)",
                    fontSize: 15,
                    background: "var(--im-ink-3)",
                    color: "var(--im-fg)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {error && (
                <p className="anim-shake anim-fade" style={{ fontSize: 13, color: "#FCA5A5", margin: 0 }}>
                  {error}
                </p>
              )}

              <Button type="submit" variant="primary" loading={isPending} style={{ marginTop: 4 }}>
                Trimite link de acces
              </Button>
            </form>

            <p style={{ fontSize: 12, color: "var(--im-fg-3)", marginTop: 20, textAlign: "center", lineHeight: 1.5 }}>
              Vei primi un email cu un link de acces · fără parolă.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContaLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
