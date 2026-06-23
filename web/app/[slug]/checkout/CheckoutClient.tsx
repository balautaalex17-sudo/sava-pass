"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Lock, Mail, Ticket } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { createCheckout, type CheckoutState } from "./actions";

const initial: CheckoutState = {};

interface CheckoutEvent {
  slug: string;
  title: string;
  subtitle: string | null;
  dateLabel: string;
  venue: string;
  photoUrl: string | null;
  priceRon: number;
}

export function CheckoutClient({ event, seatsLeft }: { event: CheckoutEvent; seatsLeft: number }) {
  const [state, action, pending] = useActionState(createCheckout, initial);

  return (
    <div className="checkout-page">
      <CheckoutStyles />
      <header className="checkout-nav">
        <Link href={`/${event.slug}`} className="pressable checkout-nav__back" aria-label="Înapoi la eveniment">
          <ChevronLeft size={20} strokeWidth={1.75} />
        </Link>
        <Link href="/" className="logo-spin checkout-nav__logo">
          <Logo size={18} />
        </Link>
        <div className="checkout-nav__spacer" />
      </header>

      <main className="checkout-shell">
        <section className="checkout-intro anim-rise">
          <h1>Aproape gata.</h1>
          <p>Biletul ajunge pe email imediat după plată.</p>
        </section>

        <section className="checkout-ticket anim-rise-fast">
          <div className="checkout-ticket__media">
            {event.photoUrl ? (
              <Image src={event.photoUrl} alt={event.title} fill sizes="96px" />
            ) : (
              <Ticket size={24} strokeWidth={1.75} />
            )}
          </div>
          <div className="checkout-ticket__body">
            <span>Bilet SavaPass</span>
            <strong>{event.title}</strong>
            <small>{event.dateLabel} · {event.venue}</small>
          </div>
          <div className="checkout-ticket__stub">
            <strong>{event.priceRon}</strong>
            <span>RON</span>
          </div>
        </section>

        <form action={action} className="checkout-form">
          <input type="hidden" name="slug" value={event.slug} />

          <div className="anim-rise-fast" style={{ animationDelay: "0ms" }}>
            <FormField
              label="Prenume și nume"
              name="name"
              type="text"
              placeholder="Ana Vasilescu"
              autoComplete="name"
              error={state.errors?.name}
            />
          </div>

          <div className="anim-rise-fast" style={{ animationDelay: "60ms" }}>
            <FormField
              label="Adresa de email"
              name="email"
              type="email"
              placeholder="ana@email.ro"
              autoComplete="email"
              error={state.errors?.email}
              help="Aici trimitem biletul și QR-ul."
            />
          </div>

          <div className="anim-rise-fast" style={{ animationDelay: "120ms" }}>
            <label className="pressable checkout-consent">
              <input type="checkbox" name="gdpr" />
              <span>
                Sunt de acord cu prelucrarea datelor personale de către Interact Sf. Sava în scopul emiterii biletului.
              </span>
            </label>
          </div>
          {state.errors?.gdpr && <p className="checkout-error checkout-error--small">{state.errors.gdpr}</p>}

          {state.errors?.general && (
            <div className="checkout-error anim-shake anim-fade">
              {state.errors.general}
            </div>
          )}

          <Button type="submit" full loading={pending}>
            {pending ? "Se procesează..." : "Continuă la plată"}
          </Button>
        </form>

        <div className="checkout-secure">
          <Lock size={13} strokeWidth={1.75} />
          <span>Datele cardului rămân în Stripe. Noi emitem doar biletul.</span>
        </div>

        <div className="checkout-footnote">
          <Mail size={13} strokeWidth={1.75} />
          <span>{seatsLeft > 0 ? `${seatsLeft} locuri disponibile acum.` : "Evenimentul apare ca sold out."}</span>
        </div>
      </main>
    </div>
  );
}

function FormField({
  label,
  name,
  type,
  placeholder,
  autoComplete,
  error,
  help,
}: {
  label: string;
  name: string;
  type: string;
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
        placeholder={placeholder}
        autoComplete={autoComplete}
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

function CheckoutStyles() {
  return (
    <style>{`
      .checkout-page {
        min-height: 100vh;
        background: var(--im-ink);
        color: var(--im-fg);
      }

      .checkout-nav {
        position: sticky;
        top: 0;
        z-index: var(--z-nav);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        background: rgba(7,10,18,0.92);
        border-bottom: 1px solid var(--im-line);
      }

      .checkout-nav__back,
      .checkout-nav__logo {
        text-decoration: none;
      }

      .checkout-nav__back {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-pill);
        background: var(--im-ink-3);
        border: 1px solid var(--im-line);
        display: grid;
        place-items: center;
        color: var(--im-fg);
        box-shadow: none;
      }

      .checkout-nav__spacer {
        width: 36px;
      }

      .checkout-shell {
        width: min(440px, calc(100% - 40px));
        margin: 0 auto;
        padding: 34px 0 56px;
      }

      .checkout-intro h1 {
        margin: 0;
        color: var(--im-fg);
        font-size: 31px;
        line-height: 1.08;
        letter-spacing: -0.03em;
        font-weight: 800;
      }

      .checkout-intro p {
        margin: 8px 0 0;
        color: var(--im-fg-2);
        font-size: 14px;
        line-height: 1.55;
      }

      .checkout-ticket {
        margin-top: 24px;
        display: grid;
        grid-template-columns: 72px minmax(0, 1fr) 76px;
        min-height: 104px;
        background: var(--im-ink-2);
        border: 1px solid var(--im-line);
        border-radius: var(--radius-lg);
        overflow: hidden;
        box-shadow: var(--im-shadow);
      }

      .checkout-ticket__media {
        position: relative;
        background: var(--im-ink-3);
        color: white;
        display: grid;
        place-items: center;
        overflow: hidden;
      }

      .checkout-ticket__media img {
        object-fit: cover;
      }

      .checkout-ticket__body {
        padding: 15px 16px;
        min-width: 0;
      }

      .checkout-ticket__body span {
        display: block;
        color: var(--im-fg-3);
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .checkout-ticket__body strong {
        display: block;
        margin-top: 4px;
        overflow: hidden;
        color: var(--im-fg);
        font-size: 15px;
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .checkout-ticket__body small {
        display: block;
        margin-top: 5px;
        overflow: hidden;
        color: var(--im-fg-2);
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .checkout-ticket__stub {
        position: relative;
        display: grid;
        place-content: center;
        gap: 2px;
        background: var(--im-ink-3);
        border-left: 2px dashed var(--im-line);
        text-align: center;
      }

      .checkout-ticket__stub::before,
      .checkout-ticket__stub::after {
        content: "";
        position: absolute;
        left: -8px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--im-ink);
        border: 1px solid var(--im-line);
      }

      .checkout-ticket__stub::before { top: -8px; }
      .checkout-ticket__stub::after { bottom: -8px; }

      .checkout-ticket__stub strong {
        font-family: var(--font-mono);
        color: var(--im-cyan-light);
        font-size: 20px;
        line-height: 1;
      }

      .checkout-ticket__stub span {
        color: var(--im-fg-3);
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 800;
      }

      .checkout-form {
        margin-top: 18px;
        display: grid;
        gap: 15px;
        padding: 18px;
        background: var(--im-ink-2);
        border: 1px solid var(--im-line);
        border-radius: var(--radius-lg);
        box-shadow: var(--im-shadow);
      }

      .checkout-field {
        display: grid;
        gap: 7px;
      }

      .checkout-field > span {
        color: var(--im-fg);
        font-size: 13px;
        font-weight: 800;
      }

      .checkout-field input {
        width: 100%;
        padding: 14px 15px;
        border: 1px solid var(--im-line);
        border-radius: var(--radius-md);
        outline: none;
        color: var(--im-fg);
        background: var(--im-ink-3);
        font-family: var(--font-sans);
        font-size: 15px;
      }

      .checkout-field input::placeholder { color: var(--im-fg-3); }

      .checkout-field input:focus { border-color: var(--im-cyan); }

      .checkout-field small {
        color: var(--im-fg-3);
        font-size: 12px;
      }

      .checkout-field__error,
      .checkout-error--small {
        color: #FCA5A5 !important;
      }

      .checkout-consent {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 14px;
        border: 1px solid var(--im-line);
        border-radius: var(--radius-md);
        background: var(--im-ink-3);
        cursor: pointer;
      }

      .checkout-consent input {
        width: 16px;
        height: 16px;
        margin-top: 2px;
        accent-color: var(--im-cyan);
        flex-shrink: 0;
      }

      .checkout-consent span {
        color: var(--im-fg-2);
        font-size: 13px;
        line-height: 1.5;
      }

      .checkout-error {
        padding: 12px 14px;
        border-radius: var(--radius-md);
        background: rgba(225,29,72,0.14);
        border: 1px solid rgba(225,29,72,0.34);
        color: #FCA5A5;
        font-size: 13px;
        font-weight: 700;
      }

      .checkout-error--small {
        margin: -8px 0 0 4px;
        padding: 0;
        background: none;
        border: none;
        font-weight: 600;
      }

      .checkout-secure,
      .checkout-footnote {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 7px;
        color: var(--im-fg-3);
        font-size: 12px;
      }

      .checkout-secure {
        margin-top: 18px;
      }

      .checkout-footnote {
        margin-top: 8px;
      }

      @media (max-width: 480px) {
        .checkout-shell {
          width: calc(100% - 32px);
          padding-top: 28px;
        }

        .checkout-ticket {
          grid-template-columns: 64px minmax(0, 1fr) 70px;
        }

        .checkout-form {
          padding: 16px;
        }
      }
    `}</style>
  );
}
