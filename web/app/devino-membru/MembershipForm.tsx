"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Check, HeartHandshake, Mail, MailCheck, Megaphone, Send, Sparkles, Wallet } from "lucide-react";
import { submitApplication, type MembershipState } from "./actions";

const initial: MembershipState = {};

const STEP_LABELS = ["Date personale", "Interese", "Motivație", "Trimite"];

const TRACKS: { id: string; sub: string; Icon: typeof Megaphone }[] = [
  { id: "Comunicare", sub: "Social media, foto, design", Icon: Megaphone },
  { id: "Proiecte sociale", sub: "Voluntariat, ONG-uri, școli", Icon: HeartHandshake },
  { id: "Evenimente", sub: "Baluri, concerte, logistică", Icon: Calendar },
  { id: "Finanțe & operațional", sub: "Sponsori, bugete, parteneri", Icon: Wallet },
];

const AVAILABILITY = ["Lun seara", "Mar seara", "Mie seara", "Joi seara", "Vin seara", "Sâm dimineața", "Dum dimineața"];

export function MembershipForm() {
  const [state, action, pending] = useActionState(submitApplication, initial);

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [tracks, setTracks] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [motivation, setMotivation] = useState("");
  const [consent, setConsent] = useState(false);

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

  const toggle = (list: string[], set: (v: string[]) => void, val: string) =>
    set(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);

  const canNext =
    step === 0
      ? fullName.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && phone.trim().length >= 6
      : step === 1
        ? tracks.length >= 1
        : step === 2
          ? motivation.trim().length >= 10
          : true;

  const total = STEP_LABELS.length;
  const next = () => { if (canNext && step < total - 1) setStep((s) => s + 1); };
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <form
      action={action}
      className="wz"
      id="aplica"
      onKeyDown={(e) => {
        // Enter on a text field advances instead of submitting early.
        if (e.key === "Enter" && step < total - 1 && (e.target as HTMLElement).tagName !== "TEXTAREA") {
          e.preventDefault();
          next();
        }
      }}
    >
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />

      {/* Hidden named inputs — carry state into FormData regardless of visible step */}
      <input type="hidden" name="full_name" value={fullName} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="grade" value={school} />
      <input type="hidden" name="motivation" value={motivation} />
      {tracks.map((t) => <input key={t} type="hidden" name="tracks" value={t} />)}
      {availability.map((a) => <input key={a} type="hidden" name="availability" value={a} />)}
      {consent && <input type="hidden" name="gdpr" value="on" />}

      {/* Step bar */}
      <div className="wz-steps">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="wz-step">
            <div className="wz-step__bar" style={{ background: i <= step ? "var(--brand-cyan)" : "var(--slate-200)" }} />
            <div className="wz-step__label" style={{ color: i === step ? "var(--brand-cyan-700)" : i < step ? "var(--slate-600)" : "var(--slate-400)" }}>
              {String(i + 1).padStart(2, "0")} · {label}
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="wz-body">
        {step === 0 && (
          <div className="wz-grid">
            <TextInput label="Nume complet" value={fullName} onChange={setFullName} placeholder="Ana Vasilescu" autoComplete="name" error={state.errors?.full_name} />
            <TextInput label="Clasa & liceul" value={school} onChange={setSchool} placeholder="Sf. Sava · a XI-a C" />
            <TextInput label="Email" value={email} onChange={setEmail} type="email" placeholder="ana@email.ro" autoComplete="email" error={state.errors?.email} />
            <TextInput label="Telefon" value={phone} onChange={setPhone} type="tel" placeholder="07xx xxx xxx" autoComplete="tel" error={state.errors?.phone} />
            <div className="wz-note wz-note--full">
              <Mail size={16} strokeWidth={1.75} />
              <span>Aplicația ta e privată — doar board-ul o vede. Datele nu pleacă din SavaPass.</span>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="wz-lead">Alege una sau două direcții în care te-ai vedea contribuind. Toți membrii ajută la toate.</p>
            <div className="wz-tracks">
              {TRACKS.map(({ id, sub, Icon }) => {
                const on = tracks.includes(id);
                return (
                  <button type="button" key={id} onClick={() => toggle(tracks, setTracks, id)} className={`wz-track${on ? " wz-track--on" : ""}`}>
                    <span className="wz-track__icon"><Icon size={20} strokeWidth={1.9} /></span>
                    <span className="wz-track__text">
                      <strong>{id}</strong>
                      <small>{sub}</small>
                    </span>
                    <span className="wz-track__check">{on && <Check size={14} strokeWidth={3} />}</span>
                  </button>
                );
              })}
            </div>

            <div className="wz-sublabel">Când ești disponibil(ă) pentru ședințe?</div>
            <div className="wz-chips">
              {AVAILABILITY.map((a) => {
                const on = availability.includes(a);
                return (
                  <button type="button" key={a} onClick={() => toggle(availability, setAvailability, a)} className={`wz-chip${on ? " wz-chip--on" : ""}`}>
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="wz-lead">De ce vrei să te alături? Două-trei rânduri sincere, fără CV. Nu există răspuns greșit.</p>
            <div className="wz-textarea">
              <textarea
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                rows={7}
                placeholder="La concertul de toamnă am fost spectator, acum vreau să fiu de partea cealaltă…"
              />
              <div className="wz-textarea__foot">
                <span>Recomandat 200-500 caractere</span>
                <span>{motivation.length} caractere</span>
              </div>
            </div>
            <div className="wz-tip">
              <Sparkles size={16} strokeWidth={1.75} />
              <span><b>Sugestie:</b> spune-ne despre un proiect la care ai contribuit și ce ai învățat din el.</span>
            </div>
            {state.errors?.motivation && <p className="wz-error-text">{state.errors.motivation}</p>}
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="wz-lead">Verifică datele, apoi trimite aplicația. Vei primi imediat un email de confirmare.</p>
            <div className="wz-review">
              <ReviewRow label="Aplicant" value={fullName || "—"} />
              <ReviewRow label="Liceu" value={school || "—"} />
              <ReviewRow label="Email" value={email || "—"} />
              <ReviewRow label="Telefon" value={phone || "—"} />
              <ReviewRow label="Direcții" value={tracks.join(" · ") || "—"} />
              <ReviewRow label="Disponibilitate" value={availability.join(" · ") || "—"} />
            </div>
            <div className="wz-review__mot">
              <span className="wz-review__mot-label">Motivație</span>
              <p>“{motivation || "—"}”</p>
            </div>

            <label className="apply-consent pressable" style={{ marginTop: 16 }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                Am citit și sunt de acord cu{" "}
                <Link href="/termeni" style={{ color: "var(--brand-cyan)", fontWeight: 600 }}>regulamentul intern</Link> și{" "}
                <Link href="/confidentialitate" style={{ color: "var(--brand-cyan)", fontWeight: 600 }}>politica de confidențialitate</Link> Interact Sf. Sava.
              </span>
            </label>
            {state.errors?.gdpr && <p className="wz-error-text">{state.errors.gdpr}</p>}
            {state.errors?.general && <div className="apply-error anim-shake anim-fade">{state.errors.general}</div>}
          </div>
        )}
      </div>

      {/* Footer / nav */}
      <div className="wz-foot">
        <div className="wz-foot__meta">
          Pasul <b>{step + 1}</b> din {total} · cca 4 minute
        </div>
        <div className="wz-foot__btns">
          <button type="button" className="pressable wz-btn-back" onClick={back} disabled={step === 0}>
            Înapoi
          </button>
          {step < total - 1 ? (
            <button type="button" className="pressable hover-dim wz-btn-next" onClick={next} disabled={!canNext}>
              Continuă <ArrowRight size={15} strokeWidth={2.2} />
            </button>
          ) : (
            <button type="submit" className="pressable hover-dim wz-btn-submit" disabled={pending || !consent}>
              {pending ? "Se trimite…" : "Trimite aplicația"} <Send size={15} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function TextInput({
  label, value, onChange, type = "text", placeholder, autoComplete, error, full,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; autoComplete?: string; error?: string; full?: boolean;
}) {
  return (
    <label className={`wz-field${full ? " wz-field--full" : ""}`}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={error ? { borderColor: "var(--danger)" } : undefined}
      />
      {error && <small className="wz-error-text">{error}</small>}
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="wz-review__row">
      <span className="wz-review__label">{label}</span>
      <span className="wz-review__value">{value}</span>
    </div>
  );
}
