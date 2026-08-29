"use client";

import Link from "next/link";
import { ArrowRight, MailCheck, Send } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  RECRUITMENT_MIN_ANSWER_CHARACTERS,
  RECRUITMENT_QUESTIONS,
  type RecruitmentQuestion,
  type RecruitmentQuestionKey,
} from "@/lib/recruitment-spec";
import { submitApplication, type MembershipState } from "./actions";

const initial: MembershipState = {};
const DRAFT_KEY = "savapass-membership-draft-v3";
const STEP_LABELS = ["Date personale", "Întrebările 1–3", "Întrebările 4–6", "Verifică și trimite"];

type FormValues = {
  full_name: string;
  email: string;
  phone: string;
  grade: string;
} & Record<RecruitmentQuestionKey, string>;

const EMPTY_VALUES: FormValues = {
  full_name: "",
  email: "",
  phone: "",
  grade: "",
  about_you: "",
  mistake: "",
  team_priority: "",
  club_exchange: "",
  promote_event: "",
  team_organization: "",
};

const QUESTION_KEYS = RECRUITMENT_QUESTIONS.map((question) => question.key) as RecruitmentQuestionKey[];

function answerReady(value: string) {
  return value.trim().length >= RECRUITMENT_MIN_ANSWER_CHARACTERS;
}

export function MembershipForm({ questions }: { questions: readonly RecruitmentQuestion[] }) {
  const [state, action, pending] = useActionState(submitApplication, initial);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as Partial<FormValues> | null;
        if (saved) setValues({ ...EMPTY_VALUES, ...saved });
      } catch {
        // A broken browser draft should never block a fresh application.
      }
    });
  }, []);

  useEffect(() => {
    if (state.ok) {
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      return;
    }
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(values)); } catch {}
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state.ok, values]);

  if (state.ok) {
    return (
      <div className="apply-sent">
        <div className="apply-sent__icon"><MailCheck size={26} strokeWidth={1.75} /></div>
        <h2>Aplicația ta a ajuns.</h2>
        <p>Ți-am trimis confirmarea pe email. Dacă mergem mai departe, te contactăm pe email sau telefon pentru următorii pași.</p>
      </div>
    );
  }

  const stepQuestions = step === 1 ? QUESTION_KEYS.slice(0, 3) : step === 2 ? QUESTION_KEYS.slice(3) : [];
  const canNext = step === 0
    ? values.full_name.trim().length >= 2 && /\S+@\S+\.\S+/.test(values.email) && values.phone.trim().length >= 6 && values.grade.trim().length >= 1
    : step === 1 || step === 2
      ? stepQuestions.every((key) => answerReady(values[key]))
      : true;
  const total = STEP_LABELS.length;
  const setValue = (key: keyof FormValues, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const next = () => {
    if (canNext && step < total - 1) {
      setStep((current) => current + 1);
      document.getElementById("aplica")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const back = () => {
    setStep((current) => Math.max(0, current - 1));
    document.getElementById("aplica")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <form
      action={action}
      className="wz anim-rise"
      data-reveal="scale"
      id="aplica"
      onKeyDown={(event) => {
        if (event.key === "Enter" && step < total - 1 && (event.target as HTMLElement).tagName !== "TEXTAREA") {
          event.preventDefault();
          next();
        }
      }}
    >
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
      {Object.entries(values).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      {consent && <input type="hidden" name="gdpr" value="on" />}

      <div className="wz-progress">
        <div className="wz-progress__copy"><span>Pasul {step + 1} din {total}</span><strong>{STEP_LABELS[step]}</strong></div>
        <progress value={step + 1} max={total} aria-label={`Pasul ${step + 1} din ${total}`} />
      </div>

      <div className="wz-body">
        {step === 0 && (
          <div className="wz-grid">
            <TextInput label="Nume și prenume" required value={values.full_name} onChange={(value) => setValue("full_name", value)} placeholder="Ex. Mara Popescu" autoComplete="name" error={state.errors?.full_name} />
            <TextInput label="Email" required value={values.email} onChange={(value) => setValue("email", value)} type="email" placeholder="mara@email.ro" autoComplete="email" error={state.errors?.email} />
            <TextInput label="Număr de telefon" required value={values.phone} onChange={(value) => setValue("phone", value)} type="tel" placeholder="07xx xxx xxx" autoComplete="tel" error={state.errors?.phone} />
            <TextInput label="Clasa (și litera + specializare)" required value={values.grade} onChange={(value) => setValue("grade", value)} placeholder="Ex. a X-a B, științe ale naturii" error={state.errors?.grade} />
            <div className="wz-note">Sunt 6 întrebări cu răspuns lung. Pentru fiecare, scrie cel puțin {RECRUITMENT_MIN_ANSWER_CHARACTERS} de caractere și folosește exemple concrete când poți.</div>
          </div>
        )}

        {(step === 1 || step === 2) && (
          <div className="wz-long-list">
            {stepQuestions.map((key) => {
              const question = questions.find((item) => item.key === key)
                ?? RECRUITMENT_QUESTIONS.find((item) => item.key === key)!;
              return (
                <QuestionTextarea
                  key={key}
                  id={key}
                  label={question.label}
                  value={values[key]}
                  onChange={(value) => setValue(key, value)}
                  placeholder={`Scrie cel puțin ${RECRUITMENT_MIN_ANSWER_CHARACTERS} de caractere.`}
                  error={state.errors?.[key]}
                />
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="wz-stack">
            <div className="wz-review-contact">
              <ReviewRow label="Candidat" value={values.full_name || "—"} />
              <ReviewRow label="Clasa" value={values.grade || "—"} />
              <ReviewRow label="Email" value={values.email || "—"} />
              <ReviewRow label="Telefon" value={values.phone || "—"} />
            </div>
            <div className="wz-review-answers">
              {questions.map((question) => <ReviewAnswer key={question.key} label={question.label} value={values[question.key]} />)}
            </div>
            <div>
              <label className="apply-consent pressable">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                <span>Am citit și sunt de acord cu <Link href="/termeni" style={{ color: "var(--brand-cyan-700)", fontWeight: 700 }}>regulamentul intern</Link> și <Link href="/confidentialitate" style={{ color: "var(--brand-cyan-700)", fontWeight: 700 }}>politica de confidențialitate</Link> Interact Sf. Sava.<span className="wz-required" aria-hidden="true">*</span></span>
              </label>
              {state.errors?.gdpr && <p className="wz-error-text">{state.errors.gdpr}</p>}
              {state.errors?.general && <div className="apply-error anim-shake" role="alert" aria-live="polite">{state.errors.general}</div>}
            </div>
          </div>
        )}
      </div>

      <div className="wz-foot">
        <div className="wz-foot__meta">Pasul <b>{step + 1}</b> din {total} · progres salvat pe acest dispozitiv</div>
        <div className="wz-foot__btns">
          <button type="button" className="pressable wz-btn-back" onClick={back} disabled={step === 0}>Înapoi</button>
          {step < total - 1 ? (
            <button type="button" className="pressable hover-dim wz-btn-next" onClick={next} disabled={!canNext}>Continuă <ArrowRight size={15} strokeWidth={2.2} /></button>
          ) : (
            <button type="submit" className="pressable hover-dim wz-btn-submit" disabled={pending || !consent}>{pending ? "Se trimite…" : "Trimite aplicația"} <Send size={15} strokeWidth={2.2} /></button>
          )}
        </div>
      </div>
    </form>
  );
}

function TextInput({ label, value, onChange, type = "text", placeholder, autoComplete, error, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; autoComplete?: string; error?: string; required?: boolean }) {
  return (
    <label className="wz-field">
      <span>{label}{required && <span className="wz-required" aria-hidden="true">*</span>}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-required={required} style={error ? { borderColor: "var(--danger)" } : undefined} />
      {error && <small className="wz-error-text">{error}</small>}
    </label>
  );
}

function QuestionTextarea({ id, label, value, onChange, placeholder, error }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string; error?: string }) {
  return (
    <div className="wz-question-field">
      <label htmlFor={id}>{label} <span className="wz-required" aria-hidden="true">*</span></label>
      <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={5} minLength={RECRUITMENT_MIN_ANSWER_CHARACTERS} maxLength={3000} aria-invalid={Boolean(error)} aria-required="true" style={error ? { borderColor: "var(--danger)" } : undefined} />
      <div className="wz-question-foot"><span>Minimum {RECRUITMENT_MIN_ANSWER_CHARACTERS} de caractere</span><span>{value.trim().length} / 3000</span></div>
      {error && <small className="wz-error-text">{error}</small>}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) { return <div className="wz-review__row"><span className="wz-review__label">{label}</span><span className="wz-review__value">{value}</span></div>; }
function ReviewAnswer({ label, value }: { label: string; value: string }) { return <div className="wz-review-answer"><span>{label}</span><p>{value || "—"}</p></div>; }
