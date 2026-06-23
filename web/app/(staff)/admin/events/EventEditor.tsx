"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { upsertEvent, type EventActionState } from "./actions";
import type { Event } from "@/lib/supabase/types";

type ProgramRow = { t: string; l: string };

function jsonArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? value as T[] : fallback;
}

export function EventEditor({ event, hasOrders }: { event: Event | null; hasOrders: boolean }) {
  const [state, action, pending] = useActionState(upsertEvent, {} as EventActionState);
  const [program, setProgram] = useState<ProgramRow[]>(jsonArray<ProgramRow>(event?.program, []));
  const [perks, setPerks] = useState<string[]>(jsonArray<string>(event?.perks, []));
  const [accent, setAccent] = useState(event?.accent ?? "#009FE3");
  const [newProgramKeys, setNewProgramKeys] = useState<Set<number>>(new Set());
  const [newPerkKeys, setNewPerkKeys] = useState<Set<number>>(new Set());
  const startsAt = useMemo(() => event ? new Date(event.starts_at).toISOString().slice(0, 16) : "", [event]);

  function moveProgram(index: number, dir: -1 | 1) {
    setProgram((rows) => {
      const next = [...rows];
      const target = index + dir;
      if (target < 0 || target >= next.length) return rows;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addProgramRow() {
    setProgram((rows) => {
      const next = [...rows, { t: "19:00", l: "" }];
      setNewProgramKeys((k) => new Set([...k, next.length - 1]));
      return next;
    });
  }

  function addPerkRow() {
    setPerks((rows) => {
      const next = [...rows, ""];
      setNewPerkKeys((k) => new Set([...k, next.length - 1]));
      return next;
    });
  }

  return (
    <form action={action} style={{ display: "grid", gap: 18, paddingBottom: 72 }} encType="multipart/form-data">
      <input type="hidden" name="id" value={event?.id ?? ""} />
      <input type="hidden" name="photo_url" value={event?.photo_url ?? ""} />
      <input type="hidden" name="program" value={JSON.stringify(program.filter((row) => row.t && row.l))} />
      <input type="hidden" name="perks" value={JSON.stringify(perks.map((p) => p.trim()).filter(Boolean))} />

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Detalii</h2>
        <div style={gridStyle}>
          <Field label="Titlu"><input name="title" defaultValue={event?.title ?? ""} required className="input" style={inputStyle} /></Field>
          <Field label="Subtitlu"><input name="subtitle" defaultValue={event?.subtitle ?? ""} className="input" style={inputStyle} /></Field>
          <Field label="Slug">
            <input name="slug" defaultValue={event?.slug ?? ""} disabled={hasOrders} placeholder="generat din titlu" className="input" style={inputStyle} />
          </Field>
          <Field label="Culoare accent">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: accent, border: "1px solid var(--im-line)", flexShrink: 0, display: "inline-block" }} />
              <input
                name="accent"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="input"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </Field>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Dată și loc</h2>
        <div style={gridStyle}>
          <Field label="Data scurtă"><input name="date_label" defaultValue={event?.date_label ?? ""} required className="input" style={inputStyle} /></Field>
          <Field label="Data lungă"><input name="date_long" defaultValue={event?.date_long ?? ""} required className="input" style={inputStyle} /></Field>
          <Field label="Moment exact"><input name="starts_at" type="datetime-local" defaultValue={startsAt} required className="input" style={inputStyle} /></Field>
          <Field label="Porți"><input name="doors" defaultValue={event?.doors ?? ""} required className="input" style={inputStyle} /></Field>
          <Field label="Locație"><input name="venue" defaultValue={event?.venue ?? ""} required className="input" style={inputStyle} /></Field>
          <Field label="Adresă"><input name="venue_line" defaultValue={event?.venue_line ?? ""} className="input" style={inputStyle} /></Field>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Vânzare</h2>
        <div style={gridStyle}>
          <Field label="Preț RON"><input name="price_ron" type="number" min={1} defaultValue={event ? Math.round(event.price_bani / 100) : 45} required className="input" style={inputStyle} /></Field>
          <Field label="Capacitate"><input name="capacity" type="number" min={1} defaultValue={event?.capacity ?? 120} required className="input" style={inputStyle} /></Field>
          <Field label="Poster"><input name="poster" type="file" accept="image/jpeg,image/png,image/webp" className="input" style={inputStyle} /></Field>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Descriere</h2>
        <textarea name="about" defaultValue={event?.about ?? ""} rows={5} className="input" style={{ ...inputStyle, resize: "vertical" }} />
      </section>

      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={sectionTitleStyle}>Program</h2>
          <button type="button" onClick={addProgramRow} style={smallButtonStyle}><Plus size={14} strokeWidth={1.75} /> Rând</button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {program.map((row, index) => (
            <div key={index} className={`ee-prog-row${newProgramKeys.has(index) ? " anim-rise-fast" : ""}`} style={{ display: "grid", gridTemplateColumns: "96px 1fr auto auto auto", gap: 8 }}>
              <input value={row.t} onChange={(e) => setProgram((rows) => rows.map((r, i) => i === index ? { ...r, t: e.target.value } : r))} className="input" style={inputStyle} />
              <input value={row.l} onChange={(e) => setProgram((rows) => rows.map((r, i) => i === index ? { ...r, l: e.target.value } : r))} className="input" style={inputStyle} />
              <IconButton label="Sus" onClick={() => moveProgram(index, -1)}><ArrowUp size={14} strokeWidth={1.75} /></IconButton>
              <IconButton label="Jos" onClick={() => moveProgram(index, 1)}><ArrowDown size={14} strokeWidth={1.75} /></IconButton>
              <IconButton label="Șterge" onClick={() => setProgram((rows) => rows.filter((_, i) => i !== index))}><X size={14} strokeWidth={1.75} /></IconButton>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={sectionTitleStyle}>Beneficii</h2>
          <button type="button" onClick={addPerkRow} style={smallButtonStyle}><Plus size={14} strokeWidth={1.75} /> Beneficiu</button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {perks.map((perk, index) => (
            <div key={index} className={newPerkKeys.has(index) ? "anim-rise-fast" : undefined} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <input value={perk} onChange={(e) => setPerks((rows) => rows.map((p, i) => i === index ? e.target.value : p))} className="input" style={inputStyle} />
              <IconButton label="Șterge" onClick={() => setPerks((rows) => rows.filter((_, i) => i !== index))}><X size={14} strokeWidth={1.75} /></IconButton>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom-sticky save bar */}
      <div style={{
        position: "sticky",
        bottom: 0,
        zIndex: "var(--z-sticky)" as unknown as number,
        background: "var(--im-ink-2)",
        borderTop: "1px solid var(--im-line)",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        margin: "0 -20px",
      }}>
        <div style={{ fontSize: 13 }}>
          {state.errors?.general && (
            <span className="anim-fade" style={{ color: "var(--danger)" }}>{state.errors.general}</span>
          )}
          {state.message && (
            <span className="anim-fade" style={{ color: "var(--success)" }}>{state.message}</span>
          )}
        </div>
        <button type="submit" disabled={pending} className="pressable" style={primaryButtonStyle}>
          {pending ? "Se salvează…" : "Salvează eveniment"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 6 }}><span style={labelStyle}>{label}</span>{children}</label>;
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="pressable" style={iconButtonStyle}>{children}</button>;
}

const sectionStyle: React.CSSProperties = { background: "var(--im-ink-2)", border: "1px solid var(--im-line)", borderRadius: 20, padding: 18, boxShadow: "var(--im-shadow)" };
const sectionTitleStyle: React.CSSProperties = { margin: "0 0 14px", fontSize: 16, color: "var(--im-fg)", fontWeight: 800 };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--im-fg-3)", textTransform: "uppercase", letterSpacing: "0.08em" };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--im-line)", background: "var(--im-ink-3)", color: "var(--im-fg)", fontSize: 14 };
const smallButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--im-line)", background: "var(--im-ink-3)", color: "var(--im-fg)", borderRadius: 10, padding: "7px 10px", fontWeight: 700, cursor: "pointer" };
const iconButtonStyle: React.CSSProperties = { ...smallButtonStyle, padding: 10 };
const primaryButtonStyle: React.CSSProperties = { border: "none", borderRadius: 12, padding: "12px 18px", background: "var(--im-grad)", color: "white", fontWeight: 800, cursor: "pointer", fontSize: 14, boxShadow: "var(--im-glow)" };
