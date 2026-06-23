"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { submitApplication, type MembershipState } from "./actions";

const initial: MembershipState = {};

export function MembershipForm() {
  const [state, action, pending] = useActionState(submitApplication, initial);

  if (state.ok) {
    return (
      <div className="apply-sent anim-fade">
        <div className="apply-sent__icon anim-pop">
          <MailCheck size={26} strokeWidth={1.75} />
        </div>
        <h2>Aplicația ta a ajuns.</h2>
        <p>
          Ți-am trimis o confirmare pe email. Urmează un scurt interviu — îți scriem în câteva zile cu un slot.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="apply-form" id="aplica">
      <div className="apply-grid">
        <Field label="Prenume și nume" name="full_name" placeholder="Ana Vasilescu" autoComplete="name" error={state.errors?.full_name} />
        <Field label="Email" name="email" type="email" placeholder="ana@email.ro" autoComplete="email" error={state.errors?.email} />
        <Field label="Telefon" name="phone" type="tel" placeholder="07xx xxx xxx" autoComplete="tel" error={state.errors?.phone} />
        <Field label="Clasa" name="grade" placeholder="a 11-a B" />
      </div>

      <TextField
        label="De ce vrei să te alături?"
        name="motivation"
        placeholder="Două-trei rânduri despre ce te aduce la Interact."
        error={state.errors?.motivation}
      />
      <TextField label="Ce aduci echipei?" name="strength" placeholder="O calitate, o abilitate, o idee. (opțional)" />
      <Field label="Disponibilitate" name="availability" placeholder="Ex: seri în timpul săptămânii (opțional)" />

      <label className="apply-consent pressable">
        <input type="checkbox" name="gdpr" />
        <span>
          Sunt de acord cu prelucrarea datelor mele de către Interact Sf. Sava pentru procesul de recrutare.
        </span>
      </label>
      {state.errors?.gdpr && <p className="apply-field__error">{state.errors.gdpr}</p>}

      {state.errors?.general && (
        <div className="apply-error anim-shake anim-fade">{state.errors.general}</div>
      )}

      <Button type="submit" full loading={pending}>
        {pending ? "Se trimite…" : "Trimite aplicația"}
      </Button>
    </form>
  );
}

function Field({
  label, name, type = "text", placeholder, autoComplete, error,
}: {
  label: string; name: string; type?: string; placeholder?: string; autoComplete?: string; error?: string;
}) {
  return (
    <label className="apply-field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="input"
        style={error ? { borderColor: "var(--danger)" } : undefined}
      />
      {error && <small className="apply-field__error">{error}</small>}
    </label>
  );
}

function TextField({
  label, name, placeholder, error,
}: {
  label: string; name: string; placeholder?: string; error?: string;
}) {
  return (
    <label className="apply-field">
      <span>{label}</span>
      <textarea
        name={name}
        rows={3}
        placeholder={placeholder}
        className="input"
        style={error ? { borderColor: "var(--danger)", resize: "vertical" } : { resize: "vertical" }}
      />
      {error && <small className="apply-field__error">{error}</small>}
    </label>
  );
}
