"use client";

import { useActionState } from "react";
import { setEventStatus, type EventActionState } from "./actions";

export function StatusControl({
  id,
  status,
  label,
  swapEventTitle,
}: {
  id: string;
  status: "active" | "past";
  label: string;
  swapEventTitle?: string | null;
}) {
  const [state, action, pending] = useActionState(setEventStatus, {} as EventActionState);
  const requiresSwap = status === "active" && !!swapEventTitle;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!requiresSwap) return;
    const ok = window.confirm(
      `Activezi acest eveniment și arhivezi "${swapEventTitle}". Continui?`
    );
    if (!ok) event.preventDefault();
  }

  return (
    <form action={action} onSubmit={handleSubmit} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      {requiresSwap && <input type="hidden" name="confirm_swap" value="on" />}
      <button type="submit" disabled={pending} className="pressable" style={smallButtonStyle}>
        {pending ? (
          <span
            className="anim-spin-slow"
            style={{ width: 12, height: 12, border: "2px solid var(--im-line)", borderTopColor: "var(--im-cyan)", borderRadius: "50%", display: "inline-block" }}
          />
        ) : label}
      </button>
      {state.errors?.general && (
        <span className="anim-shake anim-fade" style={{ color: "#FCA5A5", fontSize: 11, maxWidth: 160 }}>
          {state.errors.general}
        </span>
      )}
    </form>
  );
}

const smallButtonStyle: React.CSSProperties = {
  border: "1px solid var(--im-line)",
  borderRadius: 10,
  padding: "8px 10px",
  background: "var(--im-ink-3)",
  color: "var(--im-fg)",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 60,
};
