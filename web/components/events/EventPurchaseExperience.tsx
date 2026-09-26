"use client";

import Image from "next/image";
import {
  Banknote,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Ticket,
  X,
} from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createCheckout, type CheckoutState } from "@/app/[slug]/checkout/actions";
import { Button } from "@/components/ui/Button";
import styles from "./event-purchase.module.css";

export type PurchaseState = "active" | "sold_out" | "ended" | "unavailable";

export interface PurchaseEvent {
  slug: string;
  title: string;
  dateLabel: string;
  dateLong: string;
  timeLabel: string;
  venue: string;
  photoUrl: string | null;
  capacity: number;
  causeCopy: string | null;
  causeTitle: string | null;
}

export interface PurchaseTicketType {
  id: string;
  name: string;
  description: string | null;
  priceRon: number;
  seatsLeft: number;
}

interface EventPurchaseExperienceProps {
  event: PurchaseEvent;
  requestKey: string;
  state: PurchaseState;
  sold: number;
  seatsLeft: number;
  ticketTypes: PurchaseTicketType[];
  initialCheckout?: boolean;
}

type CheckoutStep = "tickets" | "details";

const initialActionState: CheckoutState = {};

function formatPrice(value: number) {
  return value === 0 ? "Gratuit" : `${value.toLocaleString("ro-RO")} RON`;
}

function availabilityLabel(seatsLeft: number) {
  if (seatsLeft <= 0) return "Epuizat";
  if (seatsLeft <= 4) return `Doar ${seatsLeft} rămase`;
  return `${seatsLeft} disponibile`;
}

export function EventPurchaseExperience({
  event,
  requestKey,
  state: purchaseState,
  sold,
  seatsLeft,
  ticketTypes,
  initialCheckout = false,
}: EventPurchaseExperienceProps) {
  const firstAvailable = ticketTypes.find((type) => type.seatsLeft > 0);
  const [selectedId, setSelectedId] = useState(firstAvailable?.id ?? ticketTypes[0]?.id ?? "");
  const selected = ticketTypes.find((type) => type.id === selectedId) ?? firstAvailable ?? ticketTypes[0];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openedFromUrl = useRef(false);
  const [step, setStep] = useState<CheckoutStep>("tickets");
  const [isOpen, setIsOpen] = useState(false);
  const [actionState, action, pending] = useActionState(createCheckout, initialActionState);
  const [buyer, setBuyer] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const formId = useId();
  const canReserve = purchaseState === "active" && Boolean(selected && selected.seatsLeft > 0 && seatsLeft > 0);

  const totalLabel = selected ? formatPrice(selected.priceRon) : "—";
  const mobileStartingPrice = ticketTypes.reduce(
    (lowest, type) => type.seatsLeft > 0 ? Math.min(lowest, type.priceRon) : lowest,
    selected?.priceRon ?? 0,
  );
  const capacityPercent = event.capacity > 0
    ? Math.min(100, Math.max(0, Math.round((sold / event.capacity) * 100)))
    : 0;

  const openCheckout = (nextStep: CheckoutStep) => {
    if (!canReserve) return;
    setStep(nextStep);
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    setIsOpen(true);
  };

  const closeCheckout = () => {
    if (pending) return;
    dialogRef.current?.close();
    setIsOpen(false);
  };

  useEffect(() => {
    if (!initialCheckout || openedFromUrl.current || !canReserve) return;
    openedFromUrl.current = true;
    setStep("details");
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    setIsOpen(true);
  }, [canReserve, initialCheckout]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const fullName = `${buyer.firstName.trim()} ${buyer.lastName.trim()}`.trim();

  return (
    <>
      <aside
        id="bilete"
        className={`${styles.sidebar} ${purchaseState === "active" ? styles.sidebarActive : ""}`}
        aria-label="Rezervare bilet"
      >
        {purchaseState === "active" && selected ? (
          <div className={styles.ticketCard}>
            <div className={styles.cardHeading}>
              <div>
                <h2>Ia-ți biletul</h2>
                <p>Alege accesul potrivit și rezervă în mai puțin de un minut.</p>
              </div>
              <Ticket size={22} strokeWidth={1.75} aria-hidden="true" />
            </div>

            <EventMiniFacts event={event} />

            <TicketTypeSelector
              legend="Alege tipul de bilet"
              name="ticket-panel"
              ticketTypes={ticketTypes}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <div className={styles.capacityBlock}>
              <div className={styles.capacityCopy}>
                <span>Disponibilitate</span>
                <strong>{seatsLeft} locuri rămase</strong>
              </div>
              <div className={styles.capacityTrack} aria-hidden="true">
                <span style={{ width: `${capacityPercent}%` }} />
              </div>
            </div>

            <div className={styles.priceSummary} aria-live="polite">
              <div>
                <span>Bilet</span>
                <strong>1 × {selected.name}</strong>
              </div>
              <strong>{totalLabel}</strong>
            </div>
            <div className={styles.totalRow}>
              <span>Total</span>
              <strong>{totalLabel}</strong>
            </div>

            <Button
              type="button"
              full
              icon={<ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />}
              onClick={() => openCheckout("details")}
            >
              Continuă rezervarea
            </Button>
            <p className={styles.paymentHint}>
              <Banknote size={14} strokeWidth={1.75} aria-hidden="true" />
              Plată cash · cod QR disponibil imediat
            </p>
          </div>
        ) : (
          <EventPurchaseState
            event={event}
            state={purchaseState === "active" ? "unavailable" : purchaseState}
            sold={sold}
          />
        )}
      </aside>

      {purchaseState === "active" && selected ? (
        <>
          <div className={styles.mobileBar}>
            <div>
              <span>{ticketTypes.length > 1 ? "De la" : "Bilet"}</span>
              <strong>{formatPrice(mobileStartingPrice)}</strong>
            </div>
            <Button type="button" onClick={() => openCheckout("tickets")}>Ia bilet</Button>
          </div>
          <div className={styles.mobileSpacer} aria-hidden="true" />
        </>
      ) : null}

      {canReserve && selected ? (
        <dialog
          ref={dialogRef}
          className={`${styles.dialog} ${step === "tickets" ? styles.dialogTickets : styles.dialogDetails}`}
          aria-labelledby={`${formId}-checkout-title`}
          onCancel={(event) => {
            event.preventDefault();
            closeCheckout();
          }}
          onClose={() => setIsOpen(false)}
          onClick={(clickEvent) => {
            if (clickEvent.target === clickEvent.currentTarget) closeCheckout();
          }}
        >
          <form action={action} className={styles.checkoutForm}>
            <input type="hidden" name="slug" value={event.slug} />
            <input type="hidden" name="request_key" value={requestKey} />
            <input type="hidden" name="name" value={fullName} />

            <header className={styles.checkoutHeader}>
              <div className={styles.checkoutEvent}>
                <div className={styles.checkoutThumb}>
                  {event.photoUrl ? (
                    <Image src={event.photoUrl} alt="" fill sizes="56px" loading="eager" />
                  ) : (
                    <Ticket size={22} strokeWidth={1.75} aria-hidden="true" />
                  )}
                </div>
                <div>
                  <span id={`${formId}-checkout-title`}>Finalizează rezervarea</span>
                  <strong>{event.title}</strong>
                  <small>{event.dateLabel} · {event.timeLabel} · {event.venue}</small>
                </div>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={closeCheckout}
                disabled={pending}
                aria-label="Închide rezervarea"
              >
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </header>

            <CheckoutProgress step={step} />

            <section className={styles.step} hidden={step !== "tickets"} aria-labelledby={`${formId}-ticket-step`}>
              <div className={styles.stepIntro}>
                <h2 id={`${formId}-ticket-step`}>Biletul tău</h2>
                <p>Alege accesul. Data și ora sunt fixate de organizator.</p>
              </div>

              <TicketTypeSelector
                legend="Alege tipul de bilet"
                name="ticket_type_id"
                ticketTypes={ticketTypes}
                selectedId={selectedId}
                onSelect={setSelectedId}
                error={actionState.errors?.ticket_type_id}
              />

              <div className={styles.sessionCard}>
                <div><CalendarDays size={18} strokeWidth={1.75} aria-hidden="true" /><span><small>Data</small><strong>{event.dateLong}</strong></span></div>
                <div><Clock3 size={18} strokeWidth={1.75} aria-hidden="true" /><span><small>Ora</small><strong>{event.timeLabel}</strong></span></div>
                <div><MapPin size={18} strokeWidth={1.75} aria-hidden="true" /><span><small>Locația</small><strong>{event.venue}</strong></span></div>
              </div>

              <div className={styles.sheetFooter}>
                <div><span>Total</span><strong>{totalLabel}</strong></div>
                <Button type="button" onClick={() => setStep("details")} disabled={!selected || selected.seatsLeft <= 0}>
                  Continuă
                </Button>
              </div>
            </section>

            <section className={styles.step} hidden={step !== "details"} aria-labelledby={`${formId}-details-step`}>
              <div className={styles.stepIntro}>
                <h2 id={`${formId}-details-step`}>Datele participantului</h2>
                <p>Folosim aceste date doar pentru emiterea și găsirea biletului.</p>
              </div>

              <div className={styles.reviewRow}>
                <div>
                  <span>Bilet selectat</span>
                  <strong>{selected.name}</strong>
                  <small>{event.dateLabel} · {event.timeLabel} · 1 bilet</small>
                </div>
                <button type="button" onClick={() => setStep("tickets")} disabled={pending}>Modifică</button>
              </div>

              {actionState.errors?.ticket_type_id ? (
                <p className={styles.formError} role="alert">{actionState.errors.ticket_type_id} Apasă „Modifică” pentru a alege alt bilet.</p>
              ) : null}

              <div className={styles.nameGrid}>
                <CheckoutField
                  id={`${formId}-first-name`}
                  label="Prenume"
                  name="first_name"
                  autoComplete="given-name"
                  value={buyer.firstName}
                  onChange={(value) => setBuyer((current) => ({ ...current, firstName: value }))}
                  error={actionState.errors?.name}
                />
                <CheckoutField
                  id={`${formId}-last-name`}
                  label="Nume"
                  name="last_name"
                  autoComplete="family-name"
                  value={buyer.lastName}
                  onChange={(value) => setBuyer((current) => ({ ...current, lastName: value }))}
                  error={actionState.errors?.name}
                  hideErrorText
                />
              </div>
              <CheckoutField
                id={`${formId}-email`}
                label="Email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={buyer.email}
                onChange={(value) => setBuyer((current) => ({ ...current, email: value }))}
                error={actionState.errors?.email}
                hint="Aici primești confirmarea rezervării."
              />
              <CheckoutField
                id={`${formId}-phone`}
                label="Telefon"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={buyer.phone}
                onChange={(value) => setBuyer((current) => ({ ...current, phone: value }))}
                error={actionState.errors?.phone}
                placeholder="0722 123 456"
              />

              {event.causeCopy ? <CauseSupportCard copy={event.causeCopy} title={event.causeTitle} /> : null}

              <div className={styles.cashNotice}>
                <Banknote size={20} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <strong>{selected.priceRon === 0 ? "Rezervare gratuită" : "Plată cash"}</strong>
                  <p>{selected.priceRon === 0
                    ? "Biletul devine valid imediat după confirmare."
                    : "Rezervarea este emisă acum. Organizatorul validează accesul după confirmarea plății cash."}</p>
                </div>
              </div>

              <label className={styles.consent}>
                <input
                  type="checkbox"
                  name="gdpr"
                  required
                  aria-invalid={Boolean(actionState.errors?.gdpr)}
                  aria-describedby={actionState.errors?.gdpr ? `${formId}-gdpr-error` : undefined}
                />
                <span>Sunt de acord cu prelucrarea datelor personale de către Interact Sf. Sava în scopul emiterii biletului.</span>
              </label>
              {actionState.errors?.gdpr ? <p className={styles.fieldError} id={`${formId}-gdpr-error`}>{actionState.errors.gdpr}</p> : null}

              <div className={styles.orderSummary}>
                <h3>Rezervarea ta</h3>
                <div><span>1 × {selected.name}</span><strong>{totalLabel}</strong></div>
                <div className={styles.orderTotal}><span>Total</span><strong>{totalLabel}</strong></div>
              </div>

              {actionState.errors?.general ? (
                <p className={styles.formError} role="alert">{actionState.errors.general}</p>
              ) : null}

              <Button
                type="submit"
                full
                loading={pending}
                disabled={!buyer.firstName.trim() || !buyer.lastName.trim() || !buyer.email.trim() || !buyer.phone.trim()}
              >
                {pending ? "Se rezervă…" : selected.priceRon === 0 ? "Confirmă rezervarea" : "Rezervă biletul"}
              </Button>
              <p className={styles.secureNote}>
                <ShieldCheck size={14} strokeWidth={1.75} aria-hidden="true" />
                Nu vei fi taxat online.
              </p>
            </section>
          </form>
        </dialog>
      ) : null}
    </>
  );
}

function EventMiniFacts({ event }: { event: PurchaseEvent }) {
  return (
    <dl className={styles.miniFacts}>
      <div><CalendarDays size={17} strokeWidth={1.75} aria-hidden="true" /><dt>Data</dt><dd>{event.dateLabel}</dd></div>
      <div><Clock3 size={17} strokeWidth={1.75} aria-hidden="true" /><dt>Ora</dt><dd>{event.timeLabel}</dd></div>
      <div><MapPin size={17} strokeWidth={1.75} aria-hidden="true" /><dt>Locul</dt><dd>{event.venue}</dd></div>
    </dl>
  );
}

function TicketTypeSelector({
  legend,
  name,
  ticketTypes,
  selectedId,
  onSelect,
  error,
}: {
  legend: string;
  name: string;
  ticketTypes: PurchaseTicketType[];
  selectedId: string;
  onSelect: (id: string) => void;
  error?: string;
}) {
  const legendId = useId();
  return (
    <fieldset className={styles.ticketSelector} aria-describedby={error ? `${legendId}-error` : undefined}>
      <legend id={legendId}>{legend}</legend>
      <div className={styles.ticketOptions}>
        {ticketTypes.map((type) => {
          const selected = type.id === selectedId;
          const soldOut = type.seatsLeft <= 0;
          return (
            <label
              className={`${styles.ticketOption} ${selected ? styles.ticketOptionSelected : ""} ${soldOut ? styles.ticketOptionDisabled : ""}`}
              key={type.id}
            >
              <input
                type="radio"
                name={name}
                value={type.id}
                checked={selected}
                onChange={() => onSelect(type.id)}
                disabled={soldOut}
              />
              <span className={styles.optionCheck} aria-hidden="true">{selected ? <Check size={13} strokeWidth={2.4} /> : null}</span>
              <span className={styles.optionCopy}>
                <strong>{type.name}</strong>
                <small>{type.description ?? availabilityLabel(type.seatsLeft)}</small>
                {type.description ? <em>{availabilityLabel(type.seatsLeft)}</em> : null}
              </span>
              <span className={styles.optionPrice}>{formatPrice(type.priceRon)}</span>
            </label>
          );
        })}
      </div>
      {error ? <p className={styles.fieldError} id={`${legendId}-error`}>{error}</p> : null}
    </fieldset>
  );
}

function CheckoutProgress({ step }: { step: CheckoutStep }) {
  const details = step === "details";
  return (
    <ol className={styles.progress} aria-label="Progresul rezervării">
      <li className={details ? styles.progressDone : styles.progressActive} aria-current={details ? undefined : "step"}><span>{details ? <Check size={12} strokeWidth={2.4} /> : "1"}</span>Bilet</li>
      <li className={details ? styles.progressActive : ""} aria-current={details ? "step" : undefined}><span>2</span>Date</li>
      <li><span>3</span>Confirmare</li>
    </ol>
  );
}

function CheckoutField({
  id,
  label,
  name,
  value,
  onChange,
  error,
  hint,
  hideErrorText = false,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  hideErrorText?: boolean;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  placeholder?: string;
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        required
      />
      {hint && !error ? <small id={`${id}-hint`}>{hint}</small> : null}
      {error && !hideErrorText ? <small className={styles.fieldError} id={`${id}-error`}>{error}</small> : null}
    </label>
  );
}

function CauseSupportCard({ copy, title }: { copy: string; title: string | null }) {
  return (
    <section className={styles.causeCard} aria-labelledby="checkout-cause-title">
      <div className={styles.causeIcon}><HeartHandshake size={19} strokeWidth={1.75} aria-hidden="true" /></div>
      <div>
        <span>Biletul tău susține</span>
        <strong id="checkout-cause-title">{title ?? "Impactul evenimentului"}</strong>
        <p>{copy}</p>
      </div>
    </section>
  );
}

function EventPurchaseState({ event, state, sold }: { event: PurchaseEvent; state: Exclude<PurchaseState, "active">; sold: number }) {
  const content = state === "sold_out"
    ? {
      title: "Sold out",
      copy: "Toate biletele disponibile pentru acest eveniment au fost rezervate.",
      tone: "sold" as const,
    }
    : state === "ended"
      ? {
      title: "Eveniment încheiat",
      copy: "Acest eveniment a avut deja loc. Rezervările nu mai sunt disponibile.",
      tone: "ended" as const,
      }
      : {
          title: "Biletele nu sunt disponibile încă",
          copy: "Organizatorii vor publica aici opțiunile de acces când rezervările se deschid.",
          tone: "waiting" as const,
        };

  return (
    <div className={styles.stateCard} data-tone={content.tone}>
      <span className={styles.stateIcon}><Ticket size={22} strokeWidth={1.75} aria-hidden="true" /></span>
      <h2>{content.title}</h2>
      <p>{content.copy}</p>
      <dl>
        <div><dt>Eveniment</dt><dd>{event.title}</dd></div>
        <div><dt>Data</dt><dd>{event.dateLabel}</dd></div>
        {state === "ended" && sold > 0 ? <div><dt>Participanți</dt><dd>{sold}</dd></div> : null}
      </dl>
    </div>
  );
}
