"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { CATEGORY_LABELS } from "@/lib/event-display";
import type { EventRecord } from "@/lib/event-types";
import { saveArchiveEvent, type ArchiveEventActionState } from "./actions";

type MediaOption = {
  id: string;
  file_name: string;
  public_url: string;
  source_kind: string;
};

export function ArchiveEventEditor({ event, mediaAssets }: { event: EventRecord; mediaAssets: MediaOption[] }) {
  const [state, action, pending] = useActionState(saveArchiveEvent, {} as ArchiveEventActionState);
  const [coverUrl, setCoverUrl] = useState(event.coverImage.src);

  return (
    <form action={action} className="archive-event-editor" style={{ display: "grid", gap: 18 }}>
      <input type="hidden" name="slug" value={event.slug} />

      <section className="dash-card" style={sectionStyle}>
        <div style={sectionHeadingStyle}>
          <div>
            <span className="dash-eyebrow">Card și pagină publică</span>
            <h2 style={sectionTitleStyle}>Text</h2>
          </div>
          <label style={toggleStyle}>
            <input name="published" type="checkbox" defaultChecked={event.publishingStatus === "published"} />
            Vizibil pe site
          </label>
        </div>

        <div className="dash-form-grid">
          <Field label="Titlu"><input name="title" defaultValue={event.title} required /></Field>
          <Field label="Subtitlu"><input name="subtitle" defaultValue={event.subtitle ?? ""} /></Field>
          <Field label="Descriere scurtă" wide><textarea name="short_description" defaultValue={event.shortDescription} required /></Field>
          <Field label="Descriere completă" wide><textarea name="full_description" defaultValue={event.fullDescription ?? ""} style={{ minHeight: 150 }} /></Field>
        </div>
      </section>

      <section className="dash-card" style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Dată, loc și tip</h2>
        <div className="dash-form-grid">
          <Field label="Data de început"><input name="start_date" type="date" defaultValue={event.startDate ?? ""} /></Field>
          <Field label="Data de final"><input name="end_date" type="date" defaultValue={event.endDate ?? ""} /></Field>
          <Field label="Ora de început"><input name="start_time" type="time" defaultValue={event.startTime ?? ""} /></Field>
          <Field label="Ora de final"><input name="end_time" type="time" defaultValue={event.endTime ?? ""} /></Field>
          <Field label="Locație"><input name="venue_name" defaultValue={event.venueName ?? ""} /></Field>
          <Field label="Adresă"><input name="address" defaultValue={event.address ?? ""} /></Field>
          <Field label="Categorie">
            <select name="category" defaultValue={event.category}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Preț afișat"><input name="ticket_price" defaultValue={event.ticketPrice ?? ""} placeholder="ex. 35 lei" /></Field>
        </div>
      </section>

      <section className="dash-card" style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Imagine</h2>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(220px, .75fr)", gap: 18 }} className="archive-event-image-grid">
          <div style={{ display: "grid", alignContent: "start", gap: 14 }}>
            <Field label="Link imagine">
              <input name="cover_image_src" value={coverUrl} onChange={(inputEvent) => setCoverUrl(inputEvent.target.value)} placeholder="/events/afis.webp" />
            </Field>
            <Field label="Descriere pentru accesibilitate"><input name="cover_image_alt" defaultValue={event.coverImage.alt} required /></Field>
            <Field label="Poziția imaginii">
              <select name="image_position" defaultValue={event.coverImage.position || "center"}>
                <option value="center">Centru</option>
                <option value="top">Sus</option>
                <option value="bottom">Jos</option>
              </select>
            </Field>
            <Field label="Alege din biblioteca media">
              <select
                defaultValue=""
                onChange={(selectEvent) => {
                  const selected = mediaAssets.find((asset) => asset.id === selectEvent.target.value);
                  if (selected) setCoverUrl(selected.public_url);
                }}
              >
                <option value="">Păstrează imaginea de mai sus</option>
                {mediaAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.file_name} · {asset.source_kind}</option>)}
              </select>
            </Field>
          </div>

          <div style={previewStyle}>
            {coverUrl
              ? <Image src={coverUrl} alt="Previzualizare eveniment" fill sizes="(max-width: 760px) 100vw, 360px" style={{ objectFit: "cover", objectPosition: event.coverImage.position || "center" }} />
              : <span style={{ color: "var(--dash-muted)", fontSize: 12, textAlign: "center", padding: 24 }}>Cardul va folosi fundalul tipografic implicit.</span>}
          </div>
        </div>
      </section>

      <section className="dash-card" style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Cauză și linkuri</h2>
        <div className="dash-form-grid">
          <Field label="Cauza susținută"><input name="charitable_cause" defaultValue={event.charitableCause ?? ""} /></Field>
          <Field label="Text donație"><input name="donation_text" defaultValue={event.donationText ?? ""} /></Field>
          <Field label="Link înscriere"><input name="registration_url" defaultValue={event.registrationUrl ?? ""} placeholder="https://…" /></Field>
          <Field label="Link intern / buton principal"><input name="internal_ticketing_url" defaultValue={event.internalTicketingUrl ?? ""} placeholder="/evenimente sau /despre" /></Field>
        </div>
      </section>

      {(state.error || state.message) && (
        <p className={`dash-form-message ${state.error ? "dash-form-message--error" : "dash-form-message--success"}`} role={state.error ? "alert" : "status"}>
          {state.error || state.message}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="dash-button" disabled={pending}>{pending ? "Se salvează…" : "Salvează modificările"}</button>
      </div>
    </form>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className="dash-field" style={wide ? { gridColumn: "1 / -1" } : undefined}><span>{label}</span>{children}</label>;
}

const sectionStyle: React.CSSProperties = { display: "grid", gap: 16, padding: 20 };
const sectionHeadingStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 };
const sectionTitleStyle: React.CSSProperties = { margin: "5px 0 0", color: "var(--dash-ink)", fontSize: 20 };
const toggleStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, color: "var(--slate-700)", fontSize: 13, fontWeight: 750 };
const previewStyle: React.CSSProperties = { position: "relative", minHeight: 310, overflow: "hidden", border: "1px solid var(--dash-line)", borderRadius: 10, background: "var(--slate-50)", display: "grid", placeItems: "center" };
