"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";
import { Button } from "@/components/ui/Button";

export function ProfileCard({ email, name }: { email: string; name: string }) {
  const [state, action, pending] = useActionState(updateProfile, {});

  return (
    <form
      action={action}
      style={{
        background: "var(--im-ink-2)",
        borderRadius: 20,
        border: "1px solid var(--im-line)",
        padding: 18,
        boxShadow: "var(--im-shadow)",
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelStyle}>Nume afișat</span>
          <input
            name="name"
            defaultValue={name}
            placeholder="Numele tău"
            className="input"
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelStyle}>Email</span>
          <input
            value={email}
            readOnly
            className="input"
            style={{ ...inputStyle, color: "var(--im-fg-3)" }}
          />
        </label>
      </div>
      <p style={{ color: "var(--im-fg-2)", fontSize: 12, margin: 0 }}>
        Numele de pe biletele deja cumpărate nu se schimbă retroactiv.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Button type="submit" variant="navy" size="sm" loading={pending}>
          Salvează profil
        </Button>
        {(state.message || state.error) && (
          <span
            className="anim-fade"
            style={{ fontSize: 12, color: state.ok ? "var(--success)" : "var(--danger)" }}
          >
            {state.message ?? state.error}
          </span>
        )}
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--im-fg-3)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--im-line)",
  background: "var(--im-ink-3)",
  color: "var(--im-fg)",
  fontSize: 14,
  outline: "none",
};
