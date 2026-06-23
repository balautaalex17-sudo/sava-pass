"use client";
import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import type { Database } from "@/lib/supabase/types";
import { staffRedirectForRole } from "@/lib/staff-routes";

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Email sau parolă incorectă.");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = user
          ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
          : { data: null };

        router.push(staffRedirectForRole(profile?.role, next));
        router.refresh();
      }
    });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--slate-50)",
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
          background: "white",
          /* 3px navy top border — staff register cue */
          borderTop: "3px solid var(--brand-navy)",
          borderLeft: "1px solid var(--slate-200)",
          borderRight: "1px solid var(--slate-200)",
          borderBottom: "1px solid var(--slate-200)",
          borderRadius: 20,
          padding: "32px 28px",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <h1 style={{ fontWeight: 800, fontSize: 22, color: "var(--brand-navy)", margin: "0 0 4px" }}>
          Acces staff
        </h1>
        <p style={{ fontSize: 13, color: "var(--slate-500)", margin: "0 0 28px" }}>
          Interact Sf. Sava · SavaPass
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--slate-500)",
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
              className="input"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid var(--slate-200)",
                fontSize: 15,
                background: "var(--slate-50)",
                color: "var(--brand-navy)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--slate-500)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
              Parolă
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="input"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid var(--slate-200)",
                fontSize: 15,
                background: "var(--slate-50)",
                color: "var(--brand-navy)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <p className="anim-shake anim-fade" style={{ fontSize: 13, color: "var(--danger)", margin: 0 }}>
              {error}
            </p>
          )}

          <Button type="submit" variant="navy" loading={isPending} style={{ marginTop: 4, width: "100%" }}>
            Intră
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
