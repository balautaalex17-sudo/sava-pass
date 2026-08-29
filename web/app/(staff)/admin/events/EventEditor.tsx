"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { preparePosterUpload, upsertEvent, type EventActionState } from "./actions";
import type { Event, EventTicketType } from "@/lib/supabase/types";

type ProgramRow = { t: string; l: string };
type TicketTypeRow = {
  key: string;
  id: string;
  slug: string;
  name: string;
  description: string;
  price_ron: number;
  capacity: number;
  sales_start_at: string;
  sales_end_at: string;
  status: "active" | "hidden" | "sold_out";
};

function jsonArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? value as T[] : fallback;
}

function localDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}

function ticketRows(ticketTypes: EventTicketType[], event: Event | null): TicketTypeRow[] {
  if (ticketTypes.length) return ticketTypes.map((type) => ({
    key: type.id,
    id: type.id,
    slug: type.slug,
    name: type.name,
    description: type.description ?? "",
    price_ron: Math.round(type.price_bani / 100),
    capacity: type.capacity,
    sales_start_at: localDate(type.sales_start_at),
    sales_end_at: localDate(type.sales_end_at),
    status: type.status as TicketTypeRow["status"],
  }));
  return [{ key: "initial", id: "", slug: "acces-general", name: "Acces general", description: "Bilet individual pentru acces la eveniment.", price_ron: event ? Math.round(event.price_bani / 100) : 45, capacity: event?.capacity ?? 120, sales_start_at: "", sales_end_at: "", status: "active" }];
}

export function EventEditor({ event, ticketTypes, mediaAssets, hasOrders }: { event: Event | null; ticketTypes: EventTicketType[]; mediaAssets: { id: string; file_name: string; public_url: string; source_kind: string }[]; hasOrders: boolean }) {
  const [state, action, pending] = useActionState(upsertEvent, {} as EventActionState);
  const pathname = usePathname();
  const router = useRouter();
  const [program, setProgram] = useState<ProgramRow[]>(jsonArray<ProgramRow>(event?.program, []));
  const [perks, setPerks] = useState<string[]>(jsonArray<string>(event?.perks, []));
  const [accent, setAccent] = useState(event?.accent ?? "#009FE3");
  const [types, setTypes] = useState<TicketTypeRow[]>(() => ticketRows(ticketTypes, event));
  const [clientError, setClientError] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState(event?.photo_url ?? "");
  const [posterPreview, setPosterPreview] = useState(event?.photo_url ?? "");
  const [posterMessage, setPosterMessage] = useState(event?.photo_url ? "Imaginea salvată acum." : "");
  const [posterUploading, setPosterUploading] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const posterInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const [newProgramKeys, setNewProgramKeys] = useState<Set<number>>(new Set());
  const [newPerkKeys, setNewPerkKeys] = useState<Set<number>>(new Set());
  const startsAt = useMemo(() => event ? new Date(event.starts_at).toISOString().slice(0, 16) : "", [event]);

  useEffect(() => {
    if (event || !state.ok || !state.eventId) return;
    const editorBase = pathname.startsWith("/board/") ? "/board/evenimente" : "/admin/events";
    router.replace(`${editorBase}/${state.eventId}`);
  }, [event, pathname, router, state.eventId, state.ok]);

  useEffect(() => () => {
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
  }, []);

  function showPosterPreview(url: string) {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPosterPreview(url);
  }

  async function handlePosterSelection(changeEvent: React.ChangeEvent<HTMLInputElement>) {
    const file = changeEvent.currentTarget.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setClientError("Imaginea trebuie să fie JPG, PNG sau WebP și să aibă maximum 5 MB.");
      changeEvent.currentTarget.value = "";
      return;
    }

    const previousPreview = posterUrl;
    const objectUrl = URL.createObjectURL(file);
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    previewObjectUrlRef.current = objectUrl;
    setPosterPreview(objectUrl);
    setPosterMessage("Se încarcă imaginea…");
    setClientError(null);
    setPosterUploading(true);
    setSelectedMediaId("");

    try {
      const prepared = await preparePosterUpload({
        eventId: event?.id,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      });
      if (!prepared.ok) throw new Error(prepared.error);

      const { error } = await createClient().storage
        .from("posters")
        .uploadToSignedUrl(prepared.path, prepared.token, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });
      if (error) throw new Error("Imaginea nu a putut fi încărcată.");

      setPosterUrl(prepared.publicUrl);
      showPosterPreview(prepared.publicUrl);
      setPosterMessage(`${file.name} este gata. Salvează evenimentul pentru a o publica.`);
    } catch (error) {
      showPosterPreview(previousPreview);
      setPosterMessage("");
      setClientError(error instanceof Error ? error.message : "Imaginea nu a putut fi încărcată.");
    } finally {
      setPosterUploading(false);
      if (posterInputRef.current) posterInputRef.current.value = "";
    }
  }

  function handleMediaSelection(changeEvent: React.ChangeEvent<HTMLSelectElement>) {
    const id = changeEvent.currentTarget.value;
    const asset = mediaAssets.find((candidate) => candidate.id === id);
    const nextUrl = asset?.public_url ?? event?.photo_url ?? "";
    setSelectedMediaId(id);
    setPosterUrl(nextUrl);
    showPosterPreview(nextUrl);
    setPosterMessage(asset ? `${asset.file_name} va fi folosită pe homepage și în arhivă.` : event?.photo_url ? "Imaginea salvată acum." : "");
    setClientError(null);
  }

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

  function updateTicketType(key: string, patch: Partial<TicketTypeRow>) {
    setTypes((rows) => rows.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  function addTicketType() {
    setTypes((rows) => [...rows, {
      key: `new-${Date.now()}-${rows.length}`,
      id: "",
      slug: "",
      name: "",
      description: "",
      price_ron: event ? Math.round(event.price_bani / 100) : 45,
      capacity: 30,
      sales_start_at: "",
      sales_end_at: "",
      status: "active",
    }]);
  }

  return (
    <form
      action={action}
      className="event-editor-form"
      style={{ display: "grid", gap: 18, paddingBottom: 72, minWidth: 0, width: "100%" }}
      encType="multipart/form-data"
      onInvalidCapture={(event) => {
        const input = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        const fieldName = input.closest("label")?.querySelector<HTMLElement>("[data-field-label]")?.textContent?.trim();
        setClientError((current) => current ?? (fieldName
          ? `Completează câmpul obligatoriu „${fieldName}”.`
          : "Completează toate câmpurile marcate Obligatoriu."));
      }}
      onInputCapture={() => setClientError(null)}
      onSubmit={(submitEvent) => {
        if (posterUploading) {
          submitEvent.preventDefault();
          setClientError("Așteaptă să se termine încărcarea imaginii.");
          return;
        }
        setClientError(null);
      }}
    >
      <input type="hidden" name="id" value={event?.id ?? ""} />
      <input type="hidden" name="photo_url" value={posterUrl} />
      <input type="hidden" name="program" value={JSON.stringify(program.filter((row) => row.t && row.l))} />
      <input type="hidden" name="perks" value={JSON.stringify(perks.map((p) => p.trim()).filter(Boolean))} />
      <input type="hidden" name="ticket_types" value={JSON.stringify(types.map(({ key, ...type }) => {
        void key;
        return type;
      }))} />

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Detalii</h2>
        <div style={gridStyle}>
          <Field label="Titlu" required><input name="title" defaultValue={event?.title ?? ""} required className="input" style={inputStyle} /></Field>
          <Field label="Subtitlu"><input name="subtitle" defaultValue={event?.subtitle ?? ""} className="input" style={inputStyle} /></Field>
          <Field label="Status public" required>
            <select name="status" defaultValue={event?.status ?? "draft"} required className="input" style={inputStyle}>
              <option value="draft">Ciornă · ascuns</option>
              <option value="active">Activ · public</option>
              <option value="past">Arhivat · public</option>
            </select>
            <small style={{ color: "var(--im-fg-3)", fontSize: 10 }}>Pot fi publice simultan maximum 3 evenimente active.</small>
          </Field>
          <Field label="Slug">
            <input name="slug" defaultValue={event?.slug ?? ""} disabled={hasOrders} placeholder="generat din titlu" className="input" style={inputStyle} />
          </Field>
          <Field label="Culoare accent" required>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: accent, border: "1px solid var(--im-line)", flexShrink: 0, display: "inline-block" }} />
              <input
                name="accent"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                required
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
          <Field label="Data scurtă" required><input name="date_label" defaultValue={event?.date_label ?? ""} required className="input" style={inputStyle} /></Field>
          <Field label="Data lungă" required><input name="date_long" defaultValue={event?.date_long ?? ""} required className="input" style={inputStyle} /></Field>
          <Field label="Moment exact" required><input name="starts_at" type="datetime-local" defaultValue={startsAt} required className="input" style={inputStyle} /></Field>
          <Field label="Porți" required><input name="doors" defaultValue={event?.doors ?? ""} required className="input" style={inputStyle} /></Field>
          <Field label="Locație" required><input name="venue" defaultValue={event?.venue ?? ""} required className="input" style={inputStyle} /></Field>
          <Field label="Adresă"><input name="venue_line" defaultValue={event?.venue_line ?? ""} className="input" style={inputStyle} /></Field>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeadingStyle}>
          <h2 style={sectionTitleStyle}>Imagine eveniment</h2>
          <span style={optionalSectionStyle}>Opțional</span>
        </div>
        <p style={{ margin: "-7px 0 14px", color: "var(--im-fg-3)", fontSize: 11, lineHeight: 1.55 }}>
          Aceeași imagine apare la evenimentul activ pe homepage și rămâne pe card când evenimentul este arhivat.
        </p>
        <div className="ee-poster-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(220px, .72fr)", gap: 14, alignItems: "stretch" }}>
          <div style={{ display: "grid", alignContent: "start", gap: 12 }}>
            <Field label="Încarcă imagine">
              <input
                ref={posterInputRef}
                name="poster"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={posterUploading}
                onChange={handlePosterSelection}
                className="input"
                style={inputStyle}
              />
              <small style={{ color: "var(--im-fg-3)", fontSize: 10 }}>JPG, PNG sau WebP, maximum 5 MB.</small>
            </Field>
            <Field label="Sau din biblioteca media">
              <select name="media_asset_id" value={selectedMediaId} disabled={posterUploading} onChange={handleMediaSelection} className="input" style={inputStyle}>
                <option value="">Păstrează imaginea actuală</option>
                {mediaAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.file_name} · {asset.source_kind}</option>)}
              </select>
            </Field>
            <p role="status" aria-live="polite" style={{ minHeight: 16, margin: 0, color: posterUploading ? "var(--brand-cyan)" : "var(--im-fg-2)", fontSize: 10 }}>
              {posterMessage}
            </p>
          </div>
          <div style={{ position: "relative", minHeight: 220, overflow: "hidden", border: "1px solid var(--im-line-soft)", borderRadius: 14, background: "var(--im-ink-3)", display: "grid", placeItems: "center" }}>
            {posterPreview ? (
              <Image src={posterPreview} alt="Previzualizarea imaginii evenimentului" fill sizes="(max-width: 760px) 100vw, 360px" unoptimized={posterPreview.startsWith("blob:")} style={{ objectFit: "cover" }} />
            ) : (
              <div style={{ display: "grid", justifyItems: "center", gap: 8, padding: 24, color: "var(--im-fg-3)", textAlign: "center" }}>
                <ImagePlus size={28} aria-hidden="true" />
                <span style={{ fontSize: 11, lineHeight: 1.5 }}>Alege o imagine ca să vezi previzualizarea.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Vânzare</h2>
        <div style={gridStyle}>
          <Field label="Preț de rezervă RON" required><input name="price_ron" type="number" min={0} defaultValue={event ? Math.round(event.price_bani / 100) : 45} required className="input" style={inputStyle} /></Field>
          <Field label="Capacitate" required><input name="capacity" type="number" min={1} defaultValue={event?.capacity ?? 120} required className="input" style={inputStyle} /></Field>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div><h2 style={{ ...sectionTitleStyle, marginBottom: 3 }}>Tipuri de bilet</h2><p style={{ margin: 0, color: "var(--im-fg-3)", fontSize: 11 }}>Fiecare tip are propriul preț și propria limită.</p></div>
          <button type="button" onClick={addTicketType} style={smallButtonStyle}><Plus size={14} /> Tip nou</button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {types.map((type, index) => <article key={type.key} style={{ padding: 13, border: "1px solid var(--im-line-soft)", borderRadius: 13, background: "var(--im-ink-3)" }}>
            <div className="ee-ticket-main" style={{ display: "grid", gridTemplateColumns: "minmax(210px,1.3fr) minmax(170px,1fr) minmax(120px,.45fr) minmax(140px,.55fr) 44px", gap: 8, alignItems: "end" }}>
              <Field label="Nume" required><input required value={type.name} onChange={(event) => updateTicketType(type.key, { name: event.target.value })} className="input" style={inputStyle} placeholder="Acces general" /></Field>
              <Field label="Slug"><input value={type.slug} onChange={(event) => updateTicketType(type.key, { slug: event.target.value })} className="input" style={inputStyle} placeholder="generat din nume" /></Field>
              <Field label="Preț RON" required><input required type="number" min={0} value={type.price_ron} onChange={(event) => updateTicketType(type.key, { price_ron: Number(event.target.value) })} className="input" style={inputStyle} /></Field>
              <Field label="Capacitate" required><input required type="number" min={1} value={type.capacity} onChange={(event) => updateTicketType(type.key, { capacity: Number(event.target.value) })} className="input" style={inputStyle} /></Field>
              <IconButton label="Elimină tipul" onClick={() => setTypes((rows) => rows.filter((row) => row.key !== type.key))}><X size={14} /></IconButton>
            </div>
            <div className="ee-ticket-meta" style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) repeat(2,minmax(210px,.72fr)) minmax(145px,.5fr)", gap: 8, marginTop: 8, alignItems: "end" }}>
              <Field label="Descriere"><input value={type.description} onChange={(event) => updateTicketType(type.key, { description: event.target.value })} className="input" style={inputStyle} /></Field>
              <Field label="Vânzare de la"><input type="datetime-local" value={type.sales_start_at} onChange={(event) => updateTicketType(type.key, { sales_start_at: event.target.value })} className="input" style={inputStyle} /></Field>
              <Field label="Vânzare până la"><input type="datetime-local" value={type.sales_end_at} onChange={(event) => updateTicketType(type.key, { sales_end_at: event.target.value })} className="input" style={inputStyle} /></Field>
              <Field label="Status" required><select required value={type.status} onChange={(event) => updateTicketType(type.key, { status: event.target.value as TicketTypeRow["status"] })} className="input" style={inputStyle}><option value="active">Activ</option><option value="hidden">Ascuns</option><option value="sold_out">Epuizat</option></select></Field>
            </div>
            <small style={{ display: "block", marginTop: 7, color: "var(--im-fg-3)", fontSize: 9 }}>Tip {String(index + 1).padStart(2, "0")}{type.id ? " · existent" : " · nou"}</small>
          </article>)}
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeadingStyle}><h2 style={sectionTitleStyle}>Descriere</h2><span style={optionalSectionStyle}>Opțional</span></div>
        <textarea name="about" defaultValue={event?.about ?? ""} rows={5} className="input" style={{ ...inputStyle, resize: "vertical" }} />
      </section>

      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={sectionHeadingStyle}><h2 style={sectionTitleStyle}>Program</h2><span style={optionalSectionStyle}>Opțional</span></div>
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
          <div style={sectionHeadingStyle}><h2 style={sectionTitleStyle}>Beneficii</h2><span style={optionalSectionStyle}>Opțional</span></div>
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
        padding: "12px 20px max(12px, env(safe-area-inset-bottom))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        margin: "0 -20px",
      }}>
        <div aria-live="polite" style={{ fontSize: 13 }}>
          {(clientError || state.errors?.general) && (
            <span className="anim-fade" style={{ color: "var(--danger)" }}>{clientError ?? state.errors?.general}</span>
          )}
          {state.message && (
            <span className="anim-fade" style={{ color: "var(--success)" }}>{state.message}</span>
          )}
        </div>
        <button type="submit" disabled={pending || posterUploading} className="pressable" style={primaryButtonStyle}>
          {posterUploading ? "Se încarcă imaginea…" : pending ? "Se salvează…" : "Salvează eveniment"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <span style={labelStyle}>
        <span data-field-label>{label}</span>
        <span style={{ ...fieldRequirementStyle, color: required ? "var(--brand-cyan)" : "var(--im-fg-3)" }}>
          {required ? "Obligatoriu" : "Opțional"}
        </span>
      </span>
      {children}
    </label>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="pressable" style={iconButtonStyle}>{children}</button>;
}

const sectionStyle: React.CSSProperties = { background: "var(--im-ink-2)", border: "1px solid var(--im-line)", borderRadius: 20, padding: 18, boxShadow: "var(--im-shadow)", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" };
const sectionHeadingStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
const sectionTitleStyle: React.CSSProperties = { margin: "0 0 14px", fontSize: 16, color: "var(--im-fg)", fontWeight: 800 };
const optionalSectionStyle: React.CSSProperties = { margin: "0 0 14px", color: "var(--im-fg-3)", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: 12, minWidth: 0 };
const labelStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11, fontWeight: 700, color: "var(--im-fg-3)", textTransform: "uppercase", letterSpacing: "0.08em" };
const fieldRequirementStyle: React.CSSProperties = { flexShrink: 0, fontSize: 8, fontWeight: 800, letterSpacing: "0.06em" };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--im-line)", background: "var(--im-ink-3)", color: "var(--im-fg)", fontSize: 14 };
const smallButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, gap: 6, border: "1px solid var(--im-line)", background: "var(--im-ink-3)", color: "var(--im-fg)", borderRadius: 10, padding: "7px 10px", fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer" };
const iconButtonStyle: React.CSSProperties = { ...smallButtonStyle, padding: 10 };
const primaryButtonStyle: React.CSSProperties = { border: "none", borderRadius: 12, padding: "12px 18px", background: "var(--im-grad)", color: "white", fontWeight: 800, cursor: "pointer", fontSize: 14, boxShadow: "var(--im-glow)" };
