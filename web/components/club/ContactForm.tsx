"use client";
import { useActionState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { submitContact, type ContactState } from "@/app/(club)/contact/actions";

const initial: ContactState = {};

/** Contact form (spec §U8). Uses the shared `.input` field styling (the immersive
 * theme renders it dark) and the membership honeypot pattern. Best-effort: the
 * action stores first, emails second. */
export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initial);

  if (state.ok) {
    return (
      <div className="cl-form__ok anim-pop" role="status">
        <CheckCircle2 size={28} strokeWidth={1.75} />
        <div>
          <div className="cl-form__ok-title">Mulțumim.</div>
          <p className="cl-form__ok-text">Am primit mesajul tău. Îți răspundem cât putem de repede.</p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="cl-form" noValidate>
      {/* Honeypot — only bots fill this; hidden from people + assistive tech. */}
      <input
        type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <div className="cl-field">
        <label className="cl-flabel" htmlFor="c-name">Nume</label>
        <input id="c-name" name="name" className="input" required autoComplete="name" />
        {state.errors?.name && <span className="cl-form__err">{state.errors.name}</span>}
      </div>

      <div className="cl-field">
        <label className="cl-flabel" htmlFor="c-email">Email</label>
        <input id="c-email" name="email" type="email" className="input" required autoComplete="email" />
        {state.errors?.email && <span className="cl-form__err">{state.errors.email}</span>}
      </div>

      <div className="cl-field">
        <label className="cl-flabel" htmlFor="c-msg">Mesaj</label>
        <textarea id="c-msg" name="message" className="input" rows={5} required />
        {state.errors?.message && <span className="cl-form__err">{state.errors.message}</span>}
      </div>

      {state.errors?.general && (
        <div className="cl-form__err cl-form__err--general anim-shake">{state.errors.general}</div>
      )}

      <button type="submit" className="cl-btn pressable hover-dim" disabled={pending}>
        {pending ? "Se trimite…" : "Trimite mesajul"}
        {!pending && <Send size={17} strokeWidth={2} />}
      </button>
    </form>
  );
}
