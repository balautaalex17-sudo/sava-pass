"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { changeRole, inviteStaff, removeMember, type TeamActionState } from "./actions";
import type { StaffRole } from "@/lib/roles";

type Member = {
  id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  pending: boolean;
};

const roleLabels: Record<StaffRole, string> = {
  admin: "Admin",
  scanner: "Scanner",
  statistici: "Statistici",
};

const roles: StaffRole[] = ["admin", "scanner", "statistici"];

export function TeamClient({ members }: { members: Member[] }) {
  const [inviteState, inviteAction, invitePending] = useActionState(inviteStaff, {});

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <form action={inviteAction} style={{ background: "var(--im-ink-2)", border: "1px solid var(--im-line)", borderRadius: 20, padding: 18, boxShadow: "var(--im-shadow)" }}>
        <h2 style={{ margin: "0 0 14px", color: "var(--im-fg)", fontSize: 18 }}>Invită membru</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 10, alignItems: "start" }}>
          <Field label="Email" error={inviteState.errors?.email}>
            <input name="email" className="input" type="email" required placeholder="email@example.com" style={inputStyle} />
          </Field>
          <Field label="Rol" error={inviteState.errors?.role}>
            <select name="role" className="input" defaultValue="scanner" style={inputStyle}>
              {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </select>
          </Field>
          <button type="submit" className="pressable hover-dim" disabled={invitePending} style={primaryButtonStyle}>
            {invitePending ? "Se trimite..." : "Invită"}
          </button>
        </div>
        <ActionMessage state={inviteState} />
      </form>

      <div style={{ background: "var(--im-ink-2)", border: "1px solid var(--im-line)", borderRadius: 20, overflow: "auto", WebkitOverflowScrolling: "touch", boxShadow: "var(--im-shadow)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr style={{ background: "var(--im-ink-3)", borderBottom: "1px solid var(--im-line)" }}>
              {["Membru", "Rol", "Status", ""].map((h) => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, color: "var(--im-fg-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => <MemberRow key={member.id} member={member} index={index} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MemberRow({ member, index }: { member: Member; index: number }) {
  const [roleState, roleAction, rolePending] = useActionState(changeRole, {});
  const [removeState, removeAction, removePending] = useActionState(removeMember, {});

  return (
    <tr className="row-hover anim-rise-fast" style={{ borderBottom: "1px solid var(--im-line-soft)", animationDelay: `${Math.min(index, 6) * 60}ms` }}>
      <td style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, color: "var(--im-fg)", fontSize: 14 }}>{member.full_name}</div>
        <div style={{ color: "var(--im-fg-2)", fontSize: 12, marginTop: 2 }}>{member.email}</div>
        <ActionMessage state={roleState} compact />
        <ActionMessage state={removeState} compact />
      </td>
      <td style={{ padding: 14 }}>
        <form action={roleAction} style={{ display: "flex", gap: 8 }}>
          <input type="hidden" name="id" value={member.id} />
          <select name="role" className="input" defaultValue={member.role} style={{ ...inputStyle, minWidth: 132 }}>
            {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </select>
          <button type="submit" className="pressable" disabled={rolePending} style={secondaryButtonStyle}>Salvează</button>
        </form>
      </td>
      <td style={{ padding: 14 }}>
        <Chip size="sm" tone={member.pending ? "warning" : "success"} dot>{member.pending ? "În așteptare" : "Activ"}</Chip>
      </td>
      <td style={{ padding: 14, textAlign: "right" }}>
        <form action={removeAction}>
          <input type="hidden" name="id" value={member.id} />
          <button type="submit" className="pressable" disabled={removePending} aria-label="Elimină membru" style={iconButtonStyle}>
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        </form>
      </td>
    </tr>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--im-fg-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      {children}
      {error && <span className="anim-shake" style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
    </label>
  );
}

function ActionMessage({ state, compact = false }: { state: TeamActionState; compact?: boolean }) {
  const text = state.message ?? state.errors?.general;
  if (!text) return null;
  return (
    <p className="anim-fade" style={{ margin: compact ? "8px 0 0" : "12px 0 0", fontSize: 12, color: state.ok ? "var(--success)" : "var(--danger)" }}>
      {text}
    </p>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
  borderRadius: 10,
  border: "1px solid var(--im-line)",
  color: "var(--im-fg)",
  background: "var(--im-ink-3)",
  fontSize: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  alignSelf: "end",
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  color: "white",
  background: "var(--im-grad)",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "var(--im-glow)",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid var(--im-line)",
  borderRadius: 10,
  padding: "8px 12px",
  color: "var(--im-fg)",
  background: "var(--im-ink-3)",
  fontWeight: 700,
  cursor: "pointer",
};

const iconButtonStyle: React.CSSProperties = {
  border: "1px solid var(--im-line)",
  borderRadius: 10,
  padding: 8,
  color: "#FCA5A5",
  background: "var(--im-ink-3)",
  cursor: "pointer",
};
