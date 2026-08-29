"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Mail, MailCheck, Phone, RotateCcw, ShieldCheck } from "lucide-react";

import {
  requestTicketAccess,
  type TicketAccessState,
} from "./access-actions";
import styles from "./conta.module.css";

type LookupMethod = "email" | "phone";
const initialTicketAccessState: TicketAccessState = { status: "idle" };

export function TicketAccessForm({ initialError = false }: { initialError?: boolean }) {
  const [method, setMethod] = useState<LookupMethod>("email");
  const [version, setVersion] = useState(0);

  function chooseMethod(nextMethod: LookupMethod) {
    setMethod(nextMethod);
    setVersion((current) => current + 1);
  }

  return (
    <AccessForm
      key={`${method}-${version}`}
      method={method}
      initialError={initialError && version === 0}
      onChooseMethod={chooseMethod}
      onReset={() => setVersion((current) => current + 1)}
    />
  );
}

function AccessForm({
  method,
  initialError,
  onChooseMethod,
  onReset,
}: {
  method: LookupMethod;
  initialError: boolean;
  onChooseMethod: (method: LookupMethod) => void;
  onReset: () => void;
}) {
  const initialState: TicketAccessState = initialError
    ? {
        status: "error",
        message: "Linkul a expirat sau nu mai este valid. Cere unul nou.",
      }
    : initialTicketAccessState;
  const [state, action, pending] = useActionState(requestTicketAccess, initialState);
  const [contact, setContact] = useState("");

  if (state.status === "sent") {
    return (
      <div className={styles.accessPanel}>
        <div className={styles.sentState} role="status">
          <span className={`${styles.sentIcon} anim-pop`} aria-hidden="true">
            <MailCheck size={28} strokeWidth={1.75} />
          </span>
          <h2>Cererea a fost verificată</h2>
          <p>
            Dacă datele corespund unui bilet, emailul cu QR și linkul privat a fost trimis.
            Verifică Inbox, apoi Spam dacă nu apare după un minut.
          </p>
          <button type="button" className={styles.resetButton} onClick={onReset}>
            <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
            Încearcă alte date
          </button>
        </div>
      </div>
    );
  }

  const isEmail = method === "email";
  const fieldErrorId = state.fieldError ? "ticket-contact-error" : undefined;

  return (
    <div className={styles.accessPanel}>
      <div className={styles.panelHeading}>
        <h2>Găsește biletele</h2>
        <p>Alege datele folosite la rezervare.</p>
      </div>

      <div className={styles.methodSwitch} role="group" aria-label="Metodă de identificare">
        <button
          type="button"
          className={isEmail ? styles.methodActive : undefined}
          aria-pressed={isEmail}
          disabled={pending}
          onClick={() => onChooseMethod("email")}
        >
          <Mail size={17} strokeWidth={1.75} aria-hidden="true" />
          Email
        </button>
        <button
          type="button"
          className={!isEmail ? styles.methodActive : undefined}
          aria-pressed={!isEmail}
          disabled={pending}
          onClick={() => onChooseMethod("phone")}
        >
          <Phone size={17} strokeWidth={1.75} aria-hidden="true" />
          Telefon
        </button>
      </div>

      <form action={action} className={styles.accessForm}>
        <input type="hidden" name="method" value={method} />

        <label className={styles.fieldLabel} htmlFor="ticket-contact">
          {isEmail ? "Adresa de email" : "Numărul de telefon"}
        </label>
        <div className={styles.inputShell} data-error={state.fieldError ? "true" : "false"}>
          {isEmail
            ? <Mail size={20} strokeWidth={1.75} aria-hidden="true" />
            : <Phone size={20} strokeWidth={1.75} aria-hidden="true" />}
          <input
            id="ticket-contact"
            name="contact"
            type={isEmail ? "email" : "tel"}
            inputMode={isEmail ? "email" : "tel"}
            autoComplete={isEmail ? "email" : "tel"}
            placeholder={isEmail ? "ana@email.ro" : "0722 123 456"}
            maxLength={isEmail ? 254 : 24}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            required
            aria-invalid={Boolean(state.fieldError)}
            aria-describedby={fieldErrorId}
          />
        </div>

        {state.fieldError && (
          <p id="ticket-contact-error" className={styles.fieldError} role="alert">
            {state.fieldError}
          </p>
        )}

        {state.message && (
          <p className={styles.formError} role="alert">
            {state.message}
          </p>
        )}

        <button type="submit" className={styles.submitButton} disabled={pending}>
          {pending ? <span className={`${styles.spinner} anim-spin-slow`} aria-hidden="true" /> : null}
          {pending ? "Se verifică…" : "Trimite biletul"}
          {!pending ? <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /> : null}
        </button>
      </form>

      <p className={styles.securityNote}>
        <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />
        Linkul și codul QR sunt personale. Nu le trimite altor persoane.
      </p>
    </div>
  );
}
