"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarPlus, Pencil, X } from "lucide-react";
import type { Meeting } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/dashboard/format";
import { MEETING_STATUS_LABELS } from "@/lib/dashboard/meeting-constants";
import { saveMeeting } from "./actions";
import { MeetingCalendar } from "./MeetingCalendar";

const formSchema = z.object({
  title: z.string().trim().min(3, "Titlul este prea scurt.").max(140),
  description: z.string().max(3000),
  startsAt: z.string().min(1, "Alege începutul."),
  endsAt: z.string().min(1, "Alege finalul."),
  location: z.string().trim().min(2, "Adaugă locația.").max(200),
  attendanceOpensAt: z.string().min(1, "Alege deschiderea."),
  attendanceClosesAt: z.string().min(1, "Alege închiderea."),
  status: z.enum(["draft", "upcoming", "attendance_open", "finished", "cancelled"]),
});
type FormValues = z.infer<typeof formSchema>;

function localInput(value: string) {
  const date = new Date(value);
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function emptyValues(): FormValues {
  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  start.setHours(18, 0, 0, 0);
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  const opens = new Date(start.getTime() - 30 * 60 * 1000);
  const closes = new Date(start.getTime() + 45 * 60 * 1000);
  return { title: "", description: "", startsAt: localInput(start.toISOString()), endsAt: localInput(end.toISOString()), location: "", attendanceOpensAt: localInput(opens.toISOString()), attendanceClosesAt: localInput(closes.toISOString()), status: "upcoming" };
}

export function MeetingManager({ meetings, referenceNow }: { meetings: Meeting[]; referenceNow: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(meetings.length === 0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: emptyValues() });

  function edit(meeting: Meeting) {
    setEditingId(meeting.id);
    setFormOpen(true);
    setMessage(null);
    reset({ title: meeting.title, description: meeting.description, startsAt: localInput(meeting.starts_at), endsAt: localInput(meeting.ends_at), location: meeting.location, attendanceOpensAt: localInput(meeting.attendance_opens_at), attendanceClosesAt: localInput(meeting.attendance_closes_at), status: meeting.status as FormValues["status"] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function newMeeting() { setEditingId(null); setFormOpen(true); setMessage(null); reset(emptyValues()); }
  function cancel() { setFormOpen(false); setEditingId(null); setMessage(null); reset(emptyValues()); }

  function submit(values: FormValues) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveMeeting({ id: editingId ?? undefined, title: values.title, description: values.description, startsAt: new Date(values.startsAt).toISOString(), endsAt: new Date(values.endsAt).toISOString(), location: values.location, attendanceOpensAt: new Date(values.attendanceOpensAt).toISOString(), attendanceClosesAt: new Date(values.attendanceClosesAt).toISOString(), status: values.status });
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) { setEditingId(null); reset(emptyValues()); setFormOpen(false); }
    });
  }

  return <>
    <div className="dash-page-actions"><button type="button" className="dash-button" onClick={newMeeting}><CalendarPlus size={17} /> Întâlnire nouă</button></div>
    {formOpen && <form className="dash-card dash-form meeting-form" onSubmit={handleSubmit(submit)} noValidate>
      <div className="dash-section-head"><h2>{editingId ? "Editează întâlnirea" : "Întâlnire nouă"}</h2><button type="button" className="meeting-close" onClick={cancel} aria-label="Închide formularul"><X size={18} /></button></div>
      <div className="dash-field"><label htmlFor="meeting-title">Titlu</label><input id="meeting-title" {...register("title")} />{errors.title && <p className="dash-field-error">{errors.title.message}</p>}</div>
      <div className="dash-field"><label htmlFor="meeting-description">Descriere</label><textarea id="meeting-description" {...register("description")} /></div>
      <div className="dash-form-grid"><Field id="meeting-start" label="Începe" error={errors.startsAt?.message}><input id="meeting-start" type="datetime-local" {...register("startsAt")} /></Field><Field id="meeting-end" label="Se încheie" error={errors.endsAt?.message}><input id="meeting-end" type="datetime-local" {...register("endsAt")} /></Field><Field id="meeting-open" label="Prezența se deschide" error={errors.attendanceOpensAt?.message}><input id="meeting-open" type="datetime-local" {...register("attendanceOpensAt")} /></Field><Field id="meeting-close" label="Prezența se închide" error={errors.attendanceClosesAt?.message}><input id="meeting-close" type="datetime-local" {...register("attendanceClosesAt")} /></Field><Field id="meeting-location" label="Locație" error={errors.location?.message}><input id="meeting-location" {...register("location")} /></Field><Field id="meeting-status" label="Status"><select id="meeting-status" {...register("status")}>{Object.entries(MEETING_STATUS_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>
      {message && <p role="status" className={`dash-form-message dash-form-message--${message.ok ? "success" : "error"}`}>{message.text}</p>}
      <div><button className="dash-button" type="submit" disabled={pending}>{pending ? "Se salvează..." : "Salvează întâlnirea"}</button></div>
    </form>}
    <MeetingCalendar meetings={meetings} onEdit={edit} referenceNow={referenceNow} />
    <section className="dash-card meeting-list">{meetings.length ? meetings.map((meeting) => <article key={meeting.id}><div><span className={`dash-status${meeting.status === "attendance_open" ? " dash-status--success" : meeting.status === "cancelled" ? " dash-status--danger" : ""}`}>{MEETING_STATUS_LABELS[meeting.status] ?? meeting.status}</span><h2>{meeting.title}</h2><p>{formatDateTime(meeting.starts_at)} · {meeting.location}</p></div><button type="button" onClick={() => edit(meeting)}><Pencil size={16} /> Editează</button></article>) : <div className="dash-empty"><strong>Nicio întâlnire</strong>Creează prima întâlnire pentru a porni prezența.</div>}</section>
  </>;
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) { return <div className="dash-field"><label htmlFor={id}>{label}</label>{children}{error && <p className="dash-field-error">{error}</p>}</div>; }
