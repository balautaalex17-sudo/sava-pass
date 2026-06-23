"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import type { Database } from "@/lib/supabase/types";

function InviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(params.get("error") ? "Link invalid sau expirat." : null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError("Parola nu a putut fi salvată.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id ?? "")
        .maybeSingle();

      const next = profile?.role === "admin" ? "/admin" : profile?.role === "statistici" ? "/statistici" : "/scanner";
      router.push(next);
      router.refresh();
    });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--slate-50)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ marginBottom: 28, textAlign: "center" }}><Logo size={22} /></div>
        <form
          onSubmit={handleSubmit}
          className="anim-rise"
          style={{
            background: "white",
            /* 3px navy top border — staff register cue */
            borderTop: "3px solid var(--brand-navy)",
            borderLeft: "1px solid var(--slate-200)",
            borderRight: "1px solid var(--slate-200)",
            borderBottom: "1px solid var(--slate-200)",
            borderRadius: 20,
            boxShadow: "var(--shadow-md)",
            padding: 28,
          }}
        >
          <h1 style={{ fontSize: 22, color: "var(--brand-navy)", fontWeight: 800, margin: "0 0 6px" }}>
            Setează parola
          </h1>
          <p style={{ fontSize: 13, color: "var(--slate-500)", margin: "0 0 24px", lineHeight: 1.45 }}>
            După salvare intri direct în zona potrivită rolului tău.
          </p>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{
              fontSize: 11,
              color: "var(--slate-500)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
              Parolă
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="input"
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid var(--slate-200)",
                borderRadius: 12,
                padding: "10px 12px",
                background: "var(--slate-50)",
                color: "var(--brand-navy)",
                outline: "none",
                fontSize: 15,
              }}
            />
          </label>
          {error && (
            <p className="anim-shake anim-fade" style={{ color: "var(--danger)", fontSize: 13, margin: "14px 0 0" }}>
              {error}
            </p>
          )}
          <Button
            type="submit"
            variant="navy"
            loading={isPending}
            style={{ width: "100%", marginTop: 20 }}
          >
            Salvează parola
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense>
      <InviteForm />
    </Suspense>
  );
}
