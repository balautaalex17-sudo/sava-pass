"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Banknote, ShieldCheck, Ticket } from "lucide-react";
import { FlowNav } from "@/components/ui/FlowNav";
import { createCheckout, type CheckoutState } from "./actions";

const initial: CheckoutState = {};

interface CheckoutEvent {
  slug: string;
  title: string;
  subtitle: string | null;
  dateLabel: string;
  venue: string;
  photoUrl: string | null;
}

interface CheckoutTicketType {
  id: string;
  name: string;
  description: string | null;
  priceRon: number;
  seatsLeft: number;
}

export function CheckoutClient({ event, requestKey, seatsLeft, ticketTypes }: { event: CheckoutEvent; requestKey: string; seatsLeft: number; ticketTypes: CheckoutTicketType[] }) {
  const [state, action, pending] = useActionState(createCheckout, initial);
  const firstAvailable = ticketTypes.find((type) => type.seatsLeft > 0);
  const [selectedId, setSelectedId] = useState(firstAvailable?.id ?? ticketTypes[0]?.id ?? "");
  const selected = ticketTypes.find((type) => type.id === selectedId) ?? firstAvailable ?? ticketTypes[0];
  const canSubmit = Boolean(selected && selected.seatsLeft > 0 && seatsLeft > 0);

  return (
    <div className="sp-light checkout-page">
      <CheckoutStyles />
      <FlowNav backHref={`/${event.slug}`} />

      <main className="checkout-shell">
        <div className="checkout-head">
          <div>
            <h1>Rezervă biletul</h1>
            <p>Pasul 2 din 2 · Date și confirmare</p>
          </div>
          <div className="checkout-secure-badge">
            <ShieldCheck size={14} strokeWidth={2} color="var(--success)" />
            <span>Rezervare securizată</span>
          </div>
        </div>

        <form action={action} className="checkout-grid">
          <input type="hidden" name="slug" value={event.slug} />
          <input type="hidden" name="ticket_type_id" value={selectedId} />
          <input type="hidden" name="request_key" value={requestKey} />

          {/* Left: contact + consent */}
          <div className="checkout-left">
            <section className="checkout-card">
              <span className="checkout-card__eyebrow">Tip de bilet</span>
              <div className="checkout-ticket-types" role="radiogroup" aria-label="Tip de bilet">
                {ticketTypes.map((type) => {
                  const active = type.id === selectedId;
                  const soldOut = type.seatsLeft === 0;
                  return <button
                    key={type.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={soldOut}
                    className={`checkout-ticket-type pressable${active ? " is-active" : ""}`}
                    onClick={() => setSelectedId(type.id)}
                  >
                    <span><b>{type.name}</b><small>{type.description ?? (soldOut ? "Epuizat" : `${type.seatsLeft} locuri rămase`)}</small></span>
                    <strong>{type.priceRon === 0 ? "Gratuit" : `${type.priceRon} RON`}</strong>
                  </button>;
                })}
              </div>
              {!ticketTypes.length ? <p className="checkout-error">Nu există încă un tip de bilet disponibil.</p> : null}
              {state.errors?.ticket_type_id ? <p className="checkout-field__error">{state.errors.ticket_type_id}</p> : null}
            </section>

            <section className="checkout-card">
              <span className="checkout-card__eyebrow">Contact</span>
              <FormField
                label="Prenume și nume"
                name="name"
                type="text"
                placeholder="Ana Vasilescu"
                autoComplete="name"
                error={state.errors?.name}
              />
              <FormField
                label="Adresa de email"
                name="email"
                type="email"
                placeholder="ana@email.ro"
                autoComplete="email"
                error={state.errors?.email}
                help="Aici îți trimitem chitanța și codul QR."
              />
              <FormField
                label="Numărul de telefon"
                name="phone"
                type="tel"
                inputMode="tel"
                placeholder="0722 123 456"
                autoComplete="tel"
                error={state.errors?.phone}
                help="Îl poți folosi apoi pentru a-ți găsi biletele."
              />
            </section>

            <section className="checkout-card">
              <span className="checkout-card__eyebrow">{selected?.priceRon === 0 ? "Rezervare" : "Plată cash"}</span>
              {selected?.priceRon === 0 ? <div className="checkout-payment"><Ticket size={20} strokeWidth={1.75} /><div><strong>Rezervare gratuită</strong><small>Primești imediat biletul cu QR, valid pentru acces.</small></div></div> : <div className="checkout-payment">
                  <Banknote size={20} strokeWidth={1.75} />
                  <div>
                    <strong>Plată cash</strong>
                    <small>Biletul este rezervat acum. Devine valid pentru acces după ce organizatorul confirmă plata cash.</small>
                  </div>
                </div>}

              <label className="pressable checkout-consent">
                <input type="checkbox" name="gdpr" />
                <span>
                  Sunt de acord cu prelucrarea datelor personale de către Interact Sf. Sava în scopul emiterii biletului.
                </span>
              </label>
              {state.errors?.gdpr && <p className="checkout-field__error">{state.errors.gdpr}</p>}
            </section>
          </div>

          {/* Right: order summary */}
          <aside className="checkout-summary">
            <div className="checkout-summary__card">
              <div className="checkout-summary__event">
                <div className="checkout-summary__media">
                  {event.photoUrl ? (
                    <Image src={event.photoUrl} alt={event.title} fill sizes="60px" />
                  ) : (
                    <Ticket size={22} strokeWidth={1.75} />
                  )}
                </div>
                <div className="checkout-summary__info">
                  <strong>{event.title}</strong>
                  <small>{event.dateLabel} · {event.venue}</small>
                </div>
              </div>

              <div className="checkout-summary__divider" />

              <SumRow k={`1 × ${selected?.name ?? "Bilet"}`} v={selected ? (selected.priceRon === 0 ? "0 RON" : `${selected.priceRon} RON`) : "—"} />
              <SumRow k="Comision platformă" v="0 RON" sub />

              <div className="checkout-summary__divider" />

              <SumRow k={selected?.priceRon === 0 ? "Total" : "Total de plată cash"} v={selected ? `${selected.priceRon} RON` : "—"} bold />

              {state.errors?.general && (
                <div className="checkout-error anim-shake anim-fade">{state.errors.general}</div>
              )}

              <button type="submit" className="pressable hover-dim checkout-pay" disabled={pending || !canSubmit}>
                {pending ? (
                  <>
                    <span className="checkout-spinner" /> Se rezervă…
                  </>
                ) : (
                  <>
                    {selected?.priceRon === 0 ? <Ticket size={16} strokeWidth={2} /> : <Banknote size={16} strokeWidth={2} />} Rezervă biletul
                  </>
                )}
              </button>

              <p className="checkout-summary__online-note">Nu vei fi taxat online.</p>

              <div className="checkout-summary__terms">
                Continuând, ești de acord cu{" "}
                <Link href="/termeni" style={{ color: "var(--brand-cyan-700)", fontWeight: 600 }}>termenii</Link> și{" "}
                <Link href="/confidentialitate" style={{ color: "var(--brand-cyan-700)", fontWeight: 600 }}>politica de confidențialitate</Link>.
              </div>
            </div>

            <div className="checkout-footnote">
              <ShieldCheck size={13} strokeWidth={1.75} />
              <span>{seatsLeft > 0 ? `${seatsLeft} locuri disponibile acum.` : "Evenimentul apare ca sold out."}</span>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}

function FormField({
  label, name, type, inputMode, placeholder, autoComplete, error, help,
}: {
  label: string;
  name: string;
  type: string;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder: string;
  autoComplete?: string;
  error?: string;
  help?: string;
}) {
  return (
    <label className="checkout-field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="input"
        style={{
          borderColor: error ? "var(--danger)" : undefined,
          boxShadow: error ? "0 0 0 3px var(--danger-100)" : undefined,
        }}
      />
      {help && !error && <small>{help}</small>}
      {error && <small className="checkout-field__error">{error}</small>}
    </label>
  );
}

function SumRow({ k, v, sub, bold }: { k: string; v: string; sub?: boolean; bold?: boolean }) {
  return (
    <div className={`checkout-sumrow${bold ? " checkout-sumrow--bold" : ""}`}>
      <span>{k}</span>
      <strong style={sub ? { color: "var(--success)" } : undefined}>{v}</strong>
    </div>
  );
}

function CheckoutStyles() {
  return (
    <style>{`
      .checkout-page { min-height: 100vh; background: var(--slate-50); color: var(--slate-900); }

      .checkout-shell {
        width: min(1080px, calc(100% - 40px));
        margin: 0 auto;
        padding: 36px 0 72px;
      }

      .checkout-head {
        display: flex; align-items: center; justify-content: space-between; gap: 16px;
        margin-bottom: 28px;
      }
      .checkout-head h1 { margin: 0; font-size: 30px; font-weight: 800; letter-spacing: -0.025em; color: var(--slate-900); }
      .checkout-head p { margin: 4px 0 0; font-size: 14px; color: var(--slate-500); }
      .checkout-secure-badge {
        display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0;
        padding: 9px 14px; border-radius: var(--radius-pill);
        background: var(--white); border: 1px solid var(--slate-200);
        font-size: 13px; font-weight: 700; color: var(--slate-700);
      }

      .checkout-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 380px;
        gap: 36px;
        align-items: start;
      }
      .checkout-left { display: flex; flex-direction: column; gap: 24px; }

      .checkout-card {
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-xl);
        padding: 26px;
        display: grid;
        gap: 16px;
      }
      .checkout-card__eyebrow {
        font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
        color: var(--brand-cyan-700);
      }
      .checkout-ticket-types { display: grid; gap: 9px; }
      .checkout-ticket-type {
        width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px;
        padding: 14px; border: 1px solid var(--slate-200); border-radius: var(--radius-md);
        background: var(--slate-50); color: var(--slate-900); text-align: left; cursor: pointer;
      }
      .checkout-ticket-type.is-active { border-color: var(--brand-cyan); background: var(--brand-cyan-50); box-shadow: 0 0 0 2px rgba(0,159,227,.1); }
      .checkout-ticket-type:disabled { opacity: .46; cursor: not-allowed; }
      .checkout-ticket-type > span { display: grid; gap: 3px; }
      .checkout-ticket-type b { font-size: 14px; }
      .checkout-ticket-type small { color: var(--slate-500); font-size: 11px; line-height: 1.4; }
      .checkout-ticket-type strong { flex-shrink: 0; color: var(--brand-cyan-700); font-size: 13px; }

      .checkout-field { display: grid; gap: 7px; }
      .checkout-field > span { color: var(--slate-900); font-size: 13px; font-weight: 800; }
      .checkout-field input {
        width: 100%;
        padding: 14px 15px;
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-md);
        outline: none;
        color: var(--slate-900);
        background: var(--white);
        font-family: var(--font-sans);
        font-size: 16px;
      }
      .checkout-field input::placeholder { color: var(--slate-400); }
      .checkout-field input:focus { border-color: var(--brand-cyan); box-shadow: 0 0 0 3px var(--brand-cyan-100); }
      .checkout-field small { color: var(--slate-500); font-size: 12px; }
      .checkout-field__error { color: var(--danger) !important; font-weight: 600; }

      .checkout-payment {
        display: flex; gap: 14px; align-items: flex-start;
        padding: 16px;
        border-radius: var(--radius-md);
        background: var(--brand-cyan-50);
        color: var(--brand-cyan-700);
      }
      .checkout-payment strong { display: block; font-size: 14px; color: var(--slate-900); }
      .checkout-payment small { display: block; margin-top: 4px; font-size: 12.5px; line-height: 1.5; color: var(--slate-600); }

      .checkout-consent {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 14px;
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-md);
        background: var(--slate-50);
        cursor: pointer;
      }
      .checkout-consent input { width: 16px; height: 16px; margin-top: 2px; accent-color: var(--brand-cyan); flex-shrink: 0; }
      .checkout-consent span { color: var(--slate-600); font-size: 13px; line-height: 1.5; }

      /* Summary */
      .checkout-summary { position: sticky; top: 92px; }
      .checkout-summary__card {
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-xl);
        padding: 24px;
        box-shadow: 0 30px 70px -34px rgba(15,23,42,0.2);
      }
      .checkout-summary__event { display: flex; align-items: center; gap: 14px; }
      .checkout-summary__media {
        position: relative; width: 60px; height: 60px; flex-shrink: 0;
        border-radius: var(--radius-md); overflow: hidden;
        background: var(--slate-100);
        display: grid; place-items: center; color: var(--slate-400);
      }
      .checkout-summary__media img { object-fit: cover; }
      .checkout-summary__info { min-width: 0; }
      .checkout-summary__info strong { display: block; font-size: 16px; font-weight: 700; color: var(--slate-900); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .checkout-summary__info small { display: block; margin-top: 2px; font-size: 13px; color: var(--slate-500); }
      .checkout-summary__divider { height: 1px; background: var(--slate-100); margin: 18px 0; }

      .checkout-sumrow { display: flex; align-items: baseline; justify-content: space-between; margin-top: 8px; }
      .checkout-sumrow:first-of-type { margin-top: 0; }
      .checkout-sumrow span { color: var(--slate-600); font-size: 14px; font-weight: 500; }
      .checkout-sumrow strong { color: var(--slate-900); font-size: 14px; font-weight: 600; }
      .checkout-sumrow--bold span { color: var(--slate-900); font-size: 16px; font-weight: 700; }
      .checkout-sumrow--bold strong { font-size: 20px; font-weight: 800; }

      .checkout-pay {
        width: 100%; margin-top: 20px;
        display: flex; align-items: center; justify-content: center; gap: 10px;
        padding: 16px;
        border: 0; border-radius: var(--radius-md);
        background: linear-gradient(135deg, var(--brand-cyan) 0%, #2563EB 100%);
        color: #fff; font-family: var(--font-sans); font-weight: 700; font-size: 16px;
        cursor: pointer;
        box-shadow: 0 14px 30px rgba(0,159,227,0.3);
      }
      .checkout-pay:disabled { background: var(--slate-400); box-shadow: none; cursor: wait; }
      .checkout-spinner {
        width: 16px; height: 16px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff;
        display: inline-block;
        animation: checkout-spin 0.8s linear infinite;
      }
      @keyframes checkout-spin { to { transform: rotate(360deg); } }

      .checkout-summary__terms { margin-top: 16px; font-size: 11px; color: var(--slate-500); text-align: center; line-height: 1.5; }
      .checkout-summary__online-note { margin: 10px 0 0; color: var(--slate-600); font-size: 12px; font-weight: 600; text-align: center; }

      .checkout-error {
        margin-top: 16px;
        padding: 12px 14px;
        border-radius: var(--radius-md);
        background: var(--danger-100);
        border: 1px solid rgba(220,38,38,0.3);
        color: #7F1D1D;
        font-size: 13px; font-weight: 700;
      }
      .checkout-footnote {
        display: flex; align-items: center; justify-content: center; gap: 7px;
        margin-top: 14px;
        color: var(--slate-500); font-size: 12px;
      }

      @media (max-width: 900px) {
        .checkout-grid { display: block; }
        .checkout-summary { position: static; margin-top: 24px; }
      }
      @media (max-width: 480px) {
        .checkout-shell { width: calc(100% - 32px); padding-top: 28px; }
        .checkout-head { align-items: flex-start; flex-direction: column; }
        .checkout-head h1 { font-size: 26px; }
        .checkout-card { padding: 20px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .checkout-spinner { animation: none; }
      }
    `}</style>
  );
}
