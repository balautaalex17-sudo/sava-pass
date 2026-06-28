"use client";

import { useActionState } from "react";
import { CheckCircle, ExternalLink, Ticket } from "lucide-react";
import { issueCompTicket, type IssueState } from "./actions";

const initial: IssueState = {};

interface EventOption {
  id: string;
  title: string;
  status: string;
}

const STATUS_LABEL: Record<string, string> = { active: "activ", draft: "schiță", past: "arhivă" };

export function IssueTicketForm({
  events,
  defaultEventId,
  defaultEmail,
}: {
  events: EventOption[];
  defaultEventId: string;
  defaultEmail: string;
}) {
  const [state, action, pending] = useActionState(issueCompTicket, initial);

  if (state.ok && state.ticketUrl) {
    return (
      <div style={cardStyle}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(22,163,74,0.16)", color: "var(--success)", display: "grid", placeItems: "center", marginBottom: 14 }}>
          <CheckCircle size={24} strokeWidth={1.75} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--im-fg)", margin: "0 0 6px" }}>Bilet emis</h2>
        <p style={{ fontSize: 13, color: "var(--im-fg-2)", margin: "0 0 16px", lineHeight: 1.55 }}>
          Deschide-l pe telefonul de la care scanezi, sau scanează direct codul QR de pe pagina biletului.
        </p>
        <div style={{ display: "grid", gap: 4, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--im-fg-3)" }}>Cod</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800, letterSpacing: "0.14em", color: "var(--im-cyan-light)" }}>{state.code}</span>
        </div>
        <a href={state.ticketUrl} target="_blank" rel="noopener noreferrer" className="btn btn--navy pressable hover-dim" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <ExternalLink size={15} strokeWidth={1.75} />
          Deschide biletul
        </a>
        <div style={{ marginTop: 14 }}>
          <a href="/admin/emite-bilet" style={{ fontSize: 13, color: "var(--im-cyan-light)", textDecoration: "none", fontWeight: 700 }}>
            Emite încă unul
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={action} style={cardStyle}>
      <Field label="Eveniment" error={state.errors?.event_id}>
        <select name="event_id" defaultValue={defaultEventId} style={inputStyle}>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} · {STATUS_LABEL[e.status] ?? e.status}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Nume titular" error={state.errors?.holder_name}>
        <input name="holder_name" defaultValue="Bilet test" placeholder="Ana Vasilescu" autoComplete="off" style={inputStyle} />
      </Field>

      <Field label="Email titular" error={state.errors?.holder_email}>
        <input name="holder_email" type="email" defaultValue={defaultEmail} placeholder="test@savapass.ro" autoComplete="off" style={inputStyle} />
      </Field>

      {state.errors?.general && (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(220,38,38,0.14)", border: "1px solid rgba(220,38,38,0.34)", color: "#fca5a5", fontSize: 13, fontWeight: 700 }}>
          {state.errors.general}
        </div>
      )}

      <button type="submit" disabled={pending} className="btn btn--navy pressable hover-dim" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: pending ? 0.5 : 1 }}>
        <Ticket size={15} strokeWidth={1.75} />
        {pending ? "Se emite…" : "Emite bilet"}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 7 }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--im-fg-3)" }}>{label}</span>
      {children}
      {error && <small style={{ color: "#fca5a5", fontSize: 12 }}>{error}</small>}
    </label>
  );
}

const cardStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 22,
  background: "var(--im-ink-2)",
  border: "1px solid var(--im-line)",
  borderRadius: 18,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--im-line)",
  background: "var(--im-ink-3)",
  color: "var(--im-fg)",
  fontSize: 15,
  fontFamily: "var(--font-sans)",
  outline: "none",
};
