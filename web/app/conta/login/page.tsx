"use client";
import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { MailCheck } from "lucide-react";
import { safeLocalPath } from "@/lib/safe-local-path";
import { requestAccountMagicLink } from "@/app/conta/login/actions";

type LoginMethod = "password" | "magic";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const hasError = params.get("error") === "1";
  const safeNext = safeLocalPath(params.get("next"), "/conta");
  const isMemberDestination = safeNext === "/membru"
    || safeNext.startsWith("/membru/")
    || safeNext.startsWith("/membru?");

  const [method, setMethod] = useState<LoginMethod>(isMemberDestination ? "password" : "magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(hasError ? "Linkul a expirat sau e invalid. Încearcă din nou." : null);
  const [isPending, startTransition] = useTransition();

  function selectMethod(nextMethod: LoginMethod) {
    setMethod(nextMethod);
    setError(null);
    setSent(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      if (method === "password") {
        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError("Email sau parolă incorectă.");
          return;
        }

        router.replace(safeNext);
        router.refresh();
        return;
      }

      const result = await requestAccountMagicLink({ email, next: safeNext });
      if (!result.ok) {
        setError(result.message);
      } else {
        setSent(true);
      }
    });
  }

  return (
    <div style={{
      minHeight: "calc(100dvh - var(--conta-nav-offset, 0px))",
      background: "var(--im-ink)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
    }}>

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
          <div className="anim-fade" role="status" style={{ textAlign: "center" }}>
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
              Deschide-l pentru {isMemberDestination ? "a intra în portalul membrilor" : "a-ți vedea biletele"}.
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
              {isMemberDestination ? "Portal membri" : "Biletele mele"}
            </h1>
            <p style={{ fontSize: 13, color: "var(--im-fg-2)", margin: "0 0 28px" }}>
              {method === "password"
                ? "Intră cu emailul și parola setată când ai acceptat invitația."
                : "Primești pe email un link de acces, fără să introduci parola."}
            </p>

            <div
              role="group"
              aria-label="Metodă de autentificare"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 4,
                padding: 4,
                marginBottom: 20,
                border: "1px solid var(--im-line)",
                borderRadius: 12,
                background: "var(--im-ink-3)",
              }}
            >
              {([
                ["password", "Cu parolă"],
                ["magic", "Link pe email"],
              ] as const).map(([value, label]) => {
                const active = method === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    disabled={isPending}
                    onClick={() => selectMethod(value)}
                    style={{
                      minHeight: 44,
                      border: 0,
                      borderRadius: 9,
                      background: active ? "var(--im-cyan)" : "transparent",
                      color: active ? "#03111a" : "var(--im-fg-2)",
                      cursor: isPending ? "wait" : "pointer",
                      font: "inherit",
                      fontSize: 12,
                      fontWeight: 800,
                      transition: "background var(--dur-fast) ease, color var(--dur-fast) ease",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label htmlFor="conta-email" style={{
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
                  id="conta-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder="ana@email.ro"
                  className="input"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--im-line)",
                    fontSize: 16,
                    background: "var(--im-ink-3)",
                    color: "var(--im-fg)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {method === "password" && (
                <div className="anim-fade">
                  <label htmlFor="conta-password" style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--im-fg-3)",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}>
                    Parolă
                  </label>
                  <input
                    id="conta-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    maxLength={256}
                    autoComplete="current-password"
                    className="input"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid var(--im-line)",
                      fontSize: 16,
                      background: "var(--im-ink-3)",
                      color: "var(--im-fg)",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}

              {error && (
                <p role="alert" className="anim-shake anim-fade" style={{ fontSize: 13, color: "#FCA5A5", margin: 0 }}>
                  {error}
                </p>
              )}

              <Button type="submit" variant="primary" loading={isPending} style={{ marginTop: 4, width: "100%" }}>
                {method === "password" ? "Intră în portal" : "Trimite link de acces"}
              </Button>
            </form>

            <p style={{ fontSize: 12, color: "var(--im-fg-3)", marginTop: 20, textAlign: "center", lineHeight: 1.5 }}>
              {method === "password"
                ? "Nu ai parola la îndemână? Folosește opțiunea Link pe email."
                : "Vei primi un email cu un link de acces · fără parolă."}
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
