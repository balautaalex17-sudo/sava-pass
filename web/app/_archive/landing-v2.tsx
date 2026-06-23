import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CreditCard,
  Heart,
  HeartHandshake,
  Lock,
  Mail,
  Music,
  QrCode,
  RefreshCcw,
  Ticket,
  Users,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Chip } from "@/components/ui/Chip";
import { Reveal } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/landing/TiltCard";
import { CountUp } from "@/components/landing/CountUp";
import { getActiveEvent, getPastEvents, priceRon } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/supabase/types";

export const metadata = {
  title: "SavaPass - Bilete pentru serile Interact Sf. Sava",
  description: "Cumpără bilete online pentru evenimentele Interact Sf. Sava. Simplu, rapid, sigur.",
};

export default async function LandingPage() {
  const [activeEvent, pastEvents, supabase] = await Promise.all([
    getActiveEvent(),
    getPastEvents(),
    createClient(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="landing-page">
      <LandingStyles />
      <SiteNav activeEvent={activeEvent} isAuthenticated={!!user} />
      <HeroSection event={activeEvent} pastEvents={pastEvents} />
      <TrustBand />
      <HowItWorks />
      <EventsGrid activeEvent={activeEvent} pastEvents={pastEvents} />
      <AboutInteract />
      <SiteFooter />
    </div>
  );
}

function SiteNav({ activeEvent, isAuthenticated }: { activeEvent: Event | null; isAuthenticated: boolean }) {
  return (
    <nav className="landing-nav">
      <div className="landing-nav__inner">
        <div className="landing-nav__left">
          <Link href="/" className="logo-spin landing-logo">
            <Logo size={22} />
          </Link>
          <div className="landing-nav__links">
            <a href="#evenimente">Evenimente</a>
            <a href="#cum-functioneaza">Cum funcționează</a>
            <a href="#despre">Despre Interact</a>
          </div>
        </div>
        <div className="landing-nav__actions">
          <Link href={isAuthenticated ? "/conta" : "/conta/login"} className="pressable landing-nav__account">
            {isAuthenticated ? "Contul meu" : "Biletele mele"}
          </Link>
          {activeEvent && (
            <Link href={`/${activeEvent.slug}`} className="pressable hover-dim landing-nav__cta">
              <Ticket size={14} strokeWidth={1.75} />
              Cumpără bilet
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function HeroSection({ event, pastEvents }: { event: Event | null; pastEvents: Event[] }) {
  const accent = event?.accent ?? "#009FE3";

  return (
    <section className="landing-hero">
      <div className="landing-hero__backdrop">
        <Image
          src="/landing/hero.jpg"
          alt=""
          fill
          priority
          className="landing-hero__backdrop-image anim-zoom-settle"
          sizes="100vw"
        />
      </div>
      <HeroArtwork event={event} pastEvents={pastEvents} />
      <div className="landing-hero__scrim" />
      <div className="landing-hero__content">
        <div className="landing-hero__mark anim-rise">
          <span style={{ background: accent }} />
          Biletele oficiale Interact Sf. Sava
        </div>
        <h1 className="landing-hero__title">
          <span className="line-mask">
            <span style={{ animationDelay: "60ms" }}>Bilete pentru</span>
          </span>
          <span className="line-mask">
            <span style={{ animationDelay: "140ms" }}>
              serile <em>Interact.</em>
            </span>
          </span>
        </h1>
        <p className="landing-hero__copy anim-rise" style={{ animationDelay: "300ms" }}>
          Cumperi online, primești QR-ul pe email și intri la ușă cu o singură scanare.
          Fără aplicații instalate și fără liste pe hârtie la intrare.
        </p>
        <div className="landing-hero__actions anim-rise" style={{ animationDelay: "380ms" }}>
          {event && (
            <Link href={`/${event.slug}`} className="pressable hover-dim landing-hero__primary">
              Cumpără bilet <ArrowRight size={16} strokeWidth={1.75} />
            </Link>
          )}
          <a href="#evenimente" className="pressable landing-hero__secondary">
            Vezi evenimentele
          </a>
        </div>
      </div>

      {event && (
        <div className="landing-hero__event anim-rise" style={{ animationDelay: "460ms" }}>
          <span>Acum la vânzare</span>
          <strong>{event.title}</strong>
          <small>{event.date_label} · {event.venue}</small>
          <Link href={`/${event.slug}`}>Detalii →</Link>
        </div>
      )}
    </section>
  );
}

function HeroArtwork({ event, pastEvents }: { event: Event | null; pastEvents: Event[] }) {
  const posters = [event, ...pastEvents].filter(Boolean).slice(0, 3) as Event[];

  return (
    <div className="hero-artwork" aria-hidden>
      <div className="hero-artwork__grid">
        {posters.map((poster, index) => (
          <div key={poster.id} className={`hero-artwork__poster hero-artwork__poster--${index + 1}`}>
            {poster.photo_url && (
              <Image
                src={poster.photo_url}
                alt=""
                fill
                priority={index === 0}
                sizes="(max-width: 900px) 48vw, 340px"
              />
            )}
          </div>
        ))}
      </div>
      <div className="hero-artwork__ticket">
        <span>BILET ACTIV</span>
        <strong>{event?.title ?? "SavaPass"}</strong>
        <small>{event ? `${event.date_label} · ${event.venue}` : "Interact Sf. Sava"}</small>
        <div>SP1 · QR · {event ? `${priceRon(event.price_bani)} RON` : "RON"}</div>
      </div>
    </div>
  );
}

function TrustBand() {
  const items = [
    { icon: <Lock size={16} strokeWidth={1.75} />, title: "Plată securizată", sub: "Stripe" },
    { icon: <Mail size={16} strokeWidth={1.75} />, title: "QR pe email", sub: "imediat după plată" },
    { icon: <RefreshCcw size={16} strokeWidth={1.75} />, title: "Returnabil", sub: "cu 48h înainte" },
    { icon: <HeartHandshake size={16} strokeWidth={1.75} />, title: "Pentru o cauză", sub: "100% Interact" },
  ];

  return (
    <Reveal as="section" className="trust-band">
      <div className="trust-band__inner">
        {items.map((item, index) => (
          <div key={item.title} className="trust-band__item">
            {index > 0 && <span className="trust-band__line" />}
            <span className="trust-band__icon">{item.icon}</span>
            <strong>{item.title}</strong>
            <small>· {item.sub}</small>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", icon: <Calendar size={20} strokeWidth={1.75} />, title: "Alegi evenimentul", body: "Vezi data, locul, programul și câte locuri mai sunt disponibile." },
    { n: "02", icon: <CreditCard size={20} strokeWidth={1.75} />, title: "Plătești securizat", body: "Card sau Apple Pay prin Stripe. Noi nu vedem datele cardului." },
    { n: "03", icon: <QrCode size={20} strokeWidth={1.75} />, title: "Intri cu QR", body: "Biletul ajunge pe email. La intrare îl scanezi și ești înăuntru." },
  ];

  return (
    <section id="cum-functioneaza" className="how-section">
      <div className="section-heading">
        <h2>Trei pași până la ușă.</h2>
        <p>Fără cont obligatoriu, fără aplicații de instalat. Doar email-ul tău și un card.</p>
      </div>
      <Reveal className="steps">
        <div className="steps__rail" aria-hidden />
        <div className="steps__grid">
          {steps.map((step, index) => (
            <div key={step.n} className="steps__item" style={{ "--i": index } as React.CSSProperties}>
              <div className="steps__number">{step.n}</div>
              <div className="steps__icon">{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </Reveal>
      <FlowPreview />
    </section>
  );
}

function FlowPreview() {
  return (
    <Reveal className="flow-preview">
      <div className="flow-preview__mail rstag" style={{ "--i": 0 } as React.CSSProperties}>
        <span>EMAIL</span>
        <strong>Biletul tău SavaPass</strong>
        <small>QR-ul ajunge automat după plată.</small>
      </div>
      <div className="flow-preview__ticket rstag" style={{ "--i": 1 } as React.CSSProperties}>
        <div>
          <span>BILET</span>
          <strong>Echoes Unplugged</strong>
          <small>Vin · 14 Nov · 19:00</small>
        </div>
        <div className="flow-preview__qr">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="flow-preview__scan rstag" style={{ "--i": 2 } as React.CSSProperties}>
        <span>SCAN</span>
        <strong>Intrat!</strong>
        <small>Validare la ușă în câteva secunde.</small>
      </div>
    </Reveal>
  );
}

function EventsGrid({ activeEvent, pastEvents }: { activeEvent: Event | null; pastEvents: Event[] }) {
  return (
    <section id="evenimente" className="events-section">
      <div className="section-heading">
        <h2>Evenimentele SavaPass.</h2>
      </div>

      {activeEvent && (
        <Reveal className="active-event">
          <div className="group-label">Acum la vânzare</div>
          <TiltCard className="tilt-wrap">
            <Link href={`/${activeEvent.slug}`} className="active-event__card">
              <div className="active-event__media">
                {activeEvent.photo_url && (
                  <Image src={activeEvent.photo_url} alt={activeEvent.title} fill className="active-event__image" sizes="(max-width: 900px) 100vw, 48vw" />
                )}
                <Chip tone="dark" dot={false}>{activeEvent.date_label}</Chip>
              </div>
              <div className="active-event__body">
                <div>
                  <h3>{activeEvent.title}</h3>
                  {activeEvent.subtitle && <p className="active-event__subtitle">{activeEvent.subtitle}</p>}
                  <div className="active-event__facts">
                    <Fact label="Data" value={activeEvent.date_long} />
                    <Fact label="Locul" value={activeEvent.venue} />
                    <Fact label="Porți" value={activeEvent.doors} />
                    <Fact label="Preț" value={`${priceRon(activeEvent.price_bani)} RON`} />
                  </div>
                </div>
                <div className="active-event__bottom">
                  <span>{priceRon(activeEvent.price_bani)} RON</span>
                  <strong>Cumpără bilet →</strong>
                </div>
              </div>
            </Link>
          </TiltCard>
        </Reveal>
      )}

      {pastEvents.length > 0 && (
        <Reveal className="past-events">
          <div className="group-label">Edițiile trecute</div>
          <div className="past-events__grid">
            {pastEvents.map((event, index) => (
              <article key={event.id} className="past-card rstag" style={{ "--i": Math.min(index, 6) } as React.CSSProperties}>
                <div className="past-card__media">
                  {event.photo_url && (
                    <Image src={event.photo_url} alt={event.title} fill className="past-card__image" sizes="420px" />
                  )}
                  <Chip tone="used" dot={false}>Încheiat</Chip>
                </div>
                <div className="past-card__body">
                  <h3>{event.title}</h3>
                  <p>{event.date_label} · {event.venue}</p>
                </div>
              </article>
            ))}
          </div>
        </Reveal>
      )}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AboutInteract() {
  const stats = [
    { value: 3, suffix: "+", decimals: 0, label: "ani de activitate" },
    { value: 264, suffix: "", decimals: 0, label: "bilete vândute" },
    { value: 13.5, suffix: "k", decimals: 1, label: "RON donați" },
    { value: 100, suffix: "%", decimals: 0, label: "fonduri Interact" },
  ];
  const pillars = [
    { icon: <Music size={20} strokeWidth={1.75} />, title: "Cultural", body: "Concerte acustice, baluri, vernisaje și spectacole." },
    { icon: <Heart size={20} strokeWidth={1.75} />, title: "Social", body: "Campanii de donații, voluntariat și proiecte comunitare." },
    { icon: <Users size={20} strokeWidth={1.75} />, title: "Educativ", body: "Workshop-uri, dezbateri și schimburi de experiență." },
  ];

  return (
    <section id="despre" className="about-section">
      <Reveal className="about-section__inner">
        <div className="about-section__text">
          <h2>Condus de elevi, cu impact real.</h2>
          <p>
            Interact Sf. Sava este clubul de voluntariat al Colegiului Național Sfântul Sava,
            afiliat Rotary International. Evenimentele strâng comunitatea liceului în jurul
            unor cauze reale.
          </p>
          <div className="stat-ledger">
            {stats.map((stat) => (
              <div key={stat.label}>
                <strong>
                  <CountUp value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                </strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
          <Link href="/aplica" className="pressable about-section__link">
            Vrei să faci parte din echipă? →
          </Link>
          <div className="about-rhythm">
            <div>
              <span>01</span>
              <strong>Planificare în liceu</strong>
              <small>Echipa stabilește programul, cauza și capacitatea.</small>
            </div>
            <div>
              <span>02</span>
              <strong>Bilete fără liste</strong>
              <small>Participanții primesc QR, staff-ul scanează la intrare.</small>
            </div>
            <div>
              <span>03</span>
              <strong>Fonduri urmărite clar</strong>
              <small>Vânzările și check-in-ul rămân vizibile pentru organizatori.</small>
            </div>
          </div>
        </div>
        <div className="about-section__side">
          <ClubBoard />
          <div className="pillar-list">
            {pillars.map((pillar, index) => (
              <div key={pillar.title} className="pillar-list__row" style={{ borderTop: index > 0 ? "1px solid var(--slate-200)" : "none" }}>
                <span>{pillar.icon}</span>
                <p><strong>{pillar.title}.</strong> {pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function ClubBoard() {
  return (
    <div className="club-board">
      <div className="club-board__photo" style={{ position: "absolute", inset: 0 }}>
        <Image src="/landing/about.jpg" alt="" fill sizes="(max-width: 900px) 100vw, 520px" />
      </div>
      <div className="club-board__poster">
        <Image src="/events/echoes-unplugged.png" alt="" fill sizes="180px" />
      </div>
      <div className="club-board__card club-board__card--main">
        <span>SavaPass</span>
        <strong>Bilet emis</strong>
        <small>QR trimis pe email</small>
        <div className="club-board__code">QQ3SD8</div>
      </div>
      <div className="club-board__logo">
        <Image src="/logo-wordmark.jpg" alt="Interact Sf. Sava" fill sizes="120px" />
      </div>
      <div className="club-board__card club-board__card--scan">
        <span>Scanner</span>
        <strong>OK</strong>
        <small>intrare validată</small>
      </div>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <Logo size={14} showWordmark={false} />
          <span>© 2026 Interact Sf. Sava · București</span>
        </div>
        <div>
          <a href="https://www.instagram.com/interact.sfsava" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="mailto:contact@savapass.ro">Contact</a>
        </div>
      </div>
    </footer>
  );
}

function LandingStyles() {
  return (
    <style>{`
      .landing-page {
        min-height: 100vh;
        background: white;
        color: var(--brand-navy);
      }

      .landing-nav {
        position: sticky;
        top: 0;
        z-index: var(--z-nav);
        background: rgba(255, 255, 255, 0.98);
        border-bottom: 1px solid var(--slate-100);
      }

      @supports (animation-timeline: scroll()) {
        .landing-nav {
          animation: nav-elevate linear both;
          animation-timeline: scroll();
          animation-range: 0 120px;
        }
      }

      @keyframes nav-elevate {
        to { box-shadow: var(--shadow-sm); }
      }

      .landing-nav__inner {
        max-width: 1320px;
        margin: 0 auto;
        padding: 15px 32px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }

      .landing-logo,
      .landing-nav__links a,
      .landing-nav__account,
      .landing-nav__cta {
        text-decoration: none;
      }

      .landing-nav__left,
      .landing-nav__links,
      .landing-nav__actions {
        display: flex;
        align-items: center;
      }

      .landing-nav__left { gap: 36px; }
      .landing-nav__links { gap: 26px; }
      .landing-nav__links a {
        color: var(--slate-700);
        font-size: 13px;
        font-weight: 700;
      }

      .landing-nav__actions { gap: 10px; }
      .landing-nav__account {
        color: var(--slate-700);
        font-size: 13px;
        font-weight: 700;
        padding: 8px 12px;
        border-radius: var(--radius-pill);
      }

      .landing-nav__cta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 9px 16px;
        border-radius: var(--radius-pill);
        background: var(--brand-navy);
        color: white;
        font-size: 13px;
        font-weight: 800;
      }

      .landing-hero {
        position: relative;
        min-height: min(720px, calc(100vh - 66px));
        overflow: hidden;
        display: grid;
        align-items: end;
        padding: 96px 32px 34px;
        background: var(--brand-navy);
      }

      .landing-hero__backdrop {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: var(--brand-navy);
      }

      .landing-hero__backdrop-image {
        object-fit: cover;
        opacity: 0.62;
        filter: saturate(0.82) contrast(1.08);
      }

      .hero-artwork {
        position: absolute;
        inset: 78px 32px 24px auto;
        width: min(48vw, 660px);
        z-index: 0;
        pointer-events: none;
      }

      .hero-artwork__grid {
        position: absolute;
        inset: 0;
        transform-style: preserve-3d;
      }

      .hero-artwork__poster {
        position: absolute;
        width: clamp(180px, 19vw, 270px);
        aspect-ratio: 3 / 4;
        border-radius: var(--radius-lg);
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.22);
        box-shadow: 0 24px 70px rgba(0,0,0,0.38);
        background: var(--slate-900);
        animation: poster-enter 640ms var(--ease-out) both;
      }

      .hero-artwork__poster img {
        object-fit: cover;
      }

      .hero-artwork__poster--1 {
        right: 18%;
        top: 10%;
        z-index: 3;
        transform: rotate(-3deg);
      }

      .hero-artwork__poster--2 {
        right: 2%;
        top: 22%;
        z-index: 2;
        transform: rotate(6deg) scale(0.88);
        animation-delay: 80ms;
      }

      .hero-artwork__poster--3 {
        right: 38%;
        top: 30%;
        z-index: 1;
        transform: rotate(-9deg) scale(0.8);
        opacity: 0.72;
        animation-delay: 140ms;
      }

      .hero-artwork__ticket {
        position: absolute;
        right: 7%;
        bottom: 10%;
        z-index: 4;
        width: min(320px, 70%);
        padding: 18px;
        border-radius: var(--radius-lg);
        background: rgba(255,255,255,0.95);
        color: var(--brand-navy);
        box-shadow: 0 24px 70px rgba(0,0,0,0.32);
        animation: ticket-enter 520ms var(--ease-spring) 220ms both;
      }

      .hero-artwork__ticket span {
        display: block;
        color: var(--slate-500);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      .hero-artwork__ticket strong {
        display: block;
        margin-top: 5px;
        font-size: 19px;
        line-height: 1.1;
      }

      .hero-artwork__ticket small {
        display: block;
        margin-top: 5px;
        color: var(--slate-500);
        font-size: 12px;
      }

      .hero-artwork__ticket div {
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px dashed var(--slate-300);
        color: var(--brand-cyan-700);
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      @keyframes poster-enter {
        from { opacity: 0; transform: translateY(18px) scale(0.96) rotate(0deg); }
      }

      @keyframes ticket-enter {
        from { opacity: 0; transform: translateY(14px) scale(0.94); }
      }

      .landing-hero__scrim {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.62) 45%, rgba(15,23,42,0.18) 100%),
          linear-gradient(0deg, rgba(15,23,42,0.78) 0%, rgba(15,23,42,0) 42%);
      }

      .landing-hero__content {
        position: relative;
        z-index: 1;
        width: min(1320px, 100%);
        margin: 0 auto 70px;
        max-width: 1320px;
        padding-right: min(44vw, 580px);
        justify-self: stretch;
      }

      .landing-hero__mark {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        color: rgba(255,255,255,0.78);
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 18px;
      }

      .landing-hero__mark span {
        width: 9px;
        height: 9px;
        border-radius: 50%;
      }

      .landing-hero__title {
        margin: 0;
        max-width: 760px;
        color: white;
        font-size: clamp(48px, 7.5vw, 96px);
        line-height: 0.96;
        letter-spacing: -0.04em;
        font-weight: 800;
      }

      .landing-hero__title em {
        font-family: var(--font-display);
        font-style: italic;
        font-weight: 400;
        letter-spacing: -0.025em;
      }

      .landing-hero__copy {
        max-width: 540px;
        margin: 24px 0 0;
        color: rgba(255,255,255,0.82);
        font-size: 17px;
        line-height: 1.6;
      }

      .landing-hero__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 32px;
      }

      .landing-hero__primary,
      .landing-hero__secondary {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: var(--radius-md);
        padding: 15px 22px;
        font-size: 15px;
        font-weight: 800;
        text-decoration: none;
      }

      .landing-hero__primary {
        background: var(--grad-brand);
        color: white;
        box-shadow: var(--shadow-brand);
      }

      .landing-hero__primary svg {
        transition: transform var(--dur-fast) var(--ease-out);
      }

      .landing-hero__secondary {
        color: white;
        border: 1px solid rgba(255,255,255,0.28);
        background: rgba(255,255,255,0.08);
      }

      .landing-hero__event {
        position: absolute;
        left: 32px;
        right: 32px;
        bottom: 24px;
        z-index: 1;
        max-width: 1320px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 16px;
        color: white;
        border-top: 1px solid rgba(255,255,255,0.22);
        padding-top: 18px;
      }

      .landing-hero__event span,
      .group-label {
        color: var(--slate-500);
        font-size: 13px;
        font-weight: 800;
      }

      .landing-hero__event span {
        color: rgba(255,255,255,0.58);
      }

      .landing-hero__event strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .landing-hero__event small {
        color: rgba(255,255,255,0.66);
        font-size: 13px;
      }

      .landing-hero__event a {
        color: white;
        font-size: 13px;
        font-weight: 800;
        text-decoration: none;
      }

      .trust-band {
        background: var(--slate-50);
        border-bottom: 1px solid var(--slate-100);
      }

      .trust-band__inner {
        max-width: 1320px;
        margin: 0 auto;
        padding: 19px 32px;
        display: flex;
        justify-content: center;
        gap: 0;
      }

      .trust-band__item {
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
      }

      .trust-band__line {
        width: 1px;
        height: 24px;
        background: var(--slate-200);
        margin: 0 32px;
      }

      .trust-band__icon {
        display: flex;
        color: var(--slate-400);
      }

      .trust-band strong {
        font-size: 13px;
        color: var(--brand-navy);
      }

      .trust-band small {
        color: var(--slate-500);
        font-size: 12px;
      }

      .how-section,
      .events-section {
        max-width: 1320px;
        margin: 0 auto;
        padding: 78px 32px;
      }

      .section-heading {
        margin-bottom: 34px;
      }

      .section-heading h2,
      .about-section h2 {
        margin: 0;
        color: var(--brand-navy);
        font-size: clamp(30px, 4vw, 44px);
        line-height: 1.05;
        letter-spacing: -0.035em;
        font-weight: 800;
      }

      .section-heading p,
      .about-section p {
        max-width: 500px;
        margin: 12px 0 0;
        color: var(--slate-600);
        font-size: 15px;
        line-height: 1.65;
      }

      .steps__rail {
        height: 1px;
        background: var(--slate-200);
        margin-bottom: 30px;
      }

      [data-armed] .steps__rail,
      .steps[data-armed] .steps__rail {
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.7s var(--ease-out) 80ms;
      }

      [data-armed][data-inview] .steps__rail,
      .steps[data-armed][data-inview] .steps__rail {
        transform: scaleX(1);
      }

      .steps__grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0 56px;
      }

      .steps__number {
        color: var(--brand-cyan-700);
        font-family: var(--font-mono);
        font-size: 15px;
        font-weight: 800;
        letter-spacing: 0.04em;
        margin-bottom: 16px;
      }

      .steps__icon {
        color: var(--brand-navy);
        margin-bottom: 12px;
      }

      .steps h3,
      .active-event h3,
      .past-card h3 {
        margin: 0;
        color: var(--brand-navy);
      }

      .steps h3 {
        font-size: 17px;
        font-weight: 800;
      }

      .steps p {
        margin: 8px 0 0;
        color: var(--slate-600);
        font-size: 14px;
        line-height: 1.55;
      }

      .flow-preview {
        position: relative;
        margin-top: 42px;
        padding: 14px;
        display: grid;
        grid-template-columns: minmax(0, 0.9fr) minmax(260px, 1.1fr) minmax(0, 0.9fr);
        align-items: stretch;
        gap: 14px;
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-xl);
        background:
          linear-gradient(135deg, rgba(255,255,255,0.96), rgba(248,250,252,0.98)),
          linear-gradient(90deg, rgba(0,159,227,0.08), transparent 58%);
        box-shadow: var(--shadow-xs);
        overflow: hidden;
      }

      .flow-preview::before {
        content: "";
        position: absolute;
        left: 48px;
        right: 48px;
        top: 50%;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--slate-300), transparent);
        opacity: 0.7;
      }

      .flow-preview__mail,
      .flow-preview__ticket,
      .flow-preview__scan {
        position: relative;
        z-index: 1;
        border: 1px solid var(--slate-200);
        background: white;
        border-radius: var(--radius-lg);
        box-shadow: 0 1px 2px rgba(15,23,42,0.04);
      }

      .flow-preview__mail,
      .flow-preview__scan {
        padding: 18px;
        display: grid;
        align-content: center;
        min-height: 132px;
      }

      .flow-preview__ticket {
        position: relative;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 86px;
        overflow: hidden;
      }

      .flow-preview__ticket > div:first-child {
        padding: 20px;
      }

      .flow-preview span {
        display: block;
        color: var(--slate-500);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      .flow-preview strong {
        display: block;
        margin-top: 5px;
        color: var(--brand-navy);
        font-size: 16px;
        font-weight: 800;
      }

      .flow-preview small {
        display: block;
        margin-top: 5px;
        color: var(--slate-500);
        font-size: 12px;
      }

      .flow-preview__qr {
        position: relative;
        display: grid;
        grid-template-columns: repeat(2, 16px);
        grid-auto-rows: 16px;
        place-content: center;
        gap: 7px;
        background: var(--slate-50);
        border-left: 2px dashed var(--slate-200);
      }

      .flow-preview__qr::before,
      .flow-preview__qr::after {
        content: "";
        position: absolute;
        left: -8px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--slate-50);
        border: 1px solid var(--slate-200);
      }

      .flow-preview__qr::before { top: -8px; }
      .flow-preview__qr::after { bottom: -8px; }

      .flow-preview__qr i {
        border-radius: 4px;
        background: var(--brand-navy);
      }

      .flow-preview__scan strong {
        color: var(--success);
      }

      .active-event {
        margin-bottom: 34px;
      }

      .group-label {
        margin-bottom: 12px;
      }

      .tilt-wrap {
        transform: perspective(1100px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
        transition: transform var(--dur-base) var(--ease-out);
        will-change: transform;
      }

      .active-event__card {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(360px, 0.78fr);
        background: white;
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-xl);
        overflow: hidden;
        color: inherit;
        text-decoration: none;
        box-shadow: var(--shadow-sm);
        transition: box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
      }

      .active-event__media,
      .past-card__media {
        position: relative;
        overflow: hidden;
        background: var(--brand-navy);
      }

      .active-event__media {
        min-height: 360px;
      }

      .active-event__image,
      .past-card__image {
        object-fit: cover;
        transition: transform var(--dur-base) var(--ease-out);
      }

      .active-event__media > span,
      .past-card__media > span {
        position: absolute;
        left: 18px;
        bottom: 18px;
      }

      .active-event__body {
        padding: 34px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .active-event h3 {
        font-size: 31px;
        line-height: 1.08;
        letter-spacing: -0.025em;
        font-weight: 800;
      }

      .active-event__subtitle {
        font-family: var(--font-display);
        font-style: italic;
        color: var(--slate-500);
        font-size: 17px;
        margin: 7px 0 0;
      }

      .active-event__facts {
        margin-top: 24px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }

      .active-event__facts span {
        display: block;
        color: var(--slate-500);
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .active-event__facts strong {
        display: block;
        margin-top: 3px;
        color: var(--brand-navy);
        font-size: 13px;
      }

      .active-event__bottom {
        margin-top: 28px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
      }

      .active-event__bottom span {
        font-family: var(--font-mono);
        font-size: 22px;
        font-weight: 800;
      }

      .active-event__bottom strong {
        display: inline-block;
        color: var(--brand-cyan-700);
        font-size: 15px;
        transition: transform var(--dur-fast) var(--ease-out);
      }

      .past-events__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
      }

      .past-card {
        background: white;
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-lg);
        overflow: hidden;
        box-shadow: var(--shadow-xs);
        transition: box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
      }

      .past-card__media {
        height: 205px;
      }

      .past-card__media > span {
        top: 14px;
        right: 14px;
        left: auto;
        bottom: auto;
      }

      .past-card__body {
        padding: 17px 20px;
      }

      .past-card h3 {
        font-size: 17px;
        font-weight: 800;
      }

      .past-card p {
        margin: 4px 0 0;
        color: var(--slate-500);
        font-size: 13px;
      }

      .about-section {
        background: var(--slate-50);
        border-top: 1px solid var(--slate-100);
        padding: 82px 32px 96px;
      }

      .about-section__inner {
        max-width: 1320px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(360px, 0.82fr);
        gap: 76px;
        align-items: start;
      }

      .stat-ledger {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
        margin-top: 30px;
      }

      .stat-ledger div {
        min-width: 92px;
      }

      .stat-ledger strong {
        display: block;
        font-family: var(--font-mono);
        color: var(--brand-navy);
        font-size: 24px;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }

      .stat-ledger span {
        display: block;
        margin-top: 5px;
        color: var(--slate-500);
        font-size: 12px;
      }

      .about-rhythm {
        margin-top: 26px;
        display: grid;
        gap: 10px;
      }

      .about-rhythm div {
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr);
        gap: 4px 12px;
        padding: 13px 0;
        border-top: 1px solid var(--slate-200);
      }

      .about-rhythm span {
        grid-row: span 2;
        color: var(--brand-cyan-700);
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: 800;
      }

      .about-rhythm strong {
        color: var(--brand-navy);
        font-size: 14px;
        font-weight: 800;
      }

      .about-rhythm small {
        color: var(--slate-500);
        font-size: 12px;
        line-height: 1.45;
      }

      .pillar-list {
        margin-top: 26px;
      }

      .pillar-list__row {
        display: flex;
        align-items: flex-start;
        gap: 15px;
        padding: 19px 0;
      }

      .pillar-list__row span {
        color: var(--brand-cyan-700);
        margin-top: 2px;
      }

      .pillar-list__row p {
        margin: 0;
        color: var(--slate-700);
      }

      .pillar-list__row strong {
        color: var(--brand-navy);
      }

      .about-section__link {
        display: inline-flex;
        margin-top: 26px;
        color: var(--brand-navy);
        font-size: 14px;
        font-weight: 800;
        text-decoration: none;
        background: white;
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-md);
        padding: 12px 18px;
      }

      .club-board {
        position: relative;
        min-height: 340px;
        border-radius: var(--radius-xl);
        border: 1px solid var(--slate-200);
        background: var(--brand-navy);
        box-shadow: var(--shadow-sm);
        overflow: hidden;
      }

      .club-board__photo {
        position: absolute;
        inset: 0;
      }

      .club-board__photo img {
        object-fit: cover;
        transform: scale(1.03);
        filter: saturate(0.9) contrast(1.04);
      }

      .club-board::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 1;
        background:
          linear-gradient(135deg, rgba(248,250,252,0.92), rgba(248,250,252,0.74) 42%, rgba(15,23,42,0.20)),
          radial-gradient(circle at 24% 20%, rgba(0,159,227,0.16), transparent 32%);
      }

      .club-board::before {
        content: "";
        position: absolute;
        inset: 18px;
        z-index: 4;
        border: 1px dashed var(--slate-200);
        border-radius: 20px;
        pointer-events: none;
      }

      .club-board__poster,
      .club-board__logo,
      .club-board__card {
        position: absolute;
        z-index: 3;
        box-shadow: var(--shadow-md);
        animation: board-enter 520ms var(--ease-out) both;
      }

      .club-board__poster {
        left: 34px;
        top: 34px;
        width: 138px;
        aspect-ratio: 3 / 4;
        border-radius: var(--radius-md);
        overflow: hidden;
        transform: rotate(-5deg);
        background: var(--brand-navy);
      }

      .club-board__poster img,
      .club-board__logo img {
        object-fit: cover;
      }

      .club-board__card {
        border: 1px solid var(--slate-200);
        border-radius: var(--radius-lg);
        background: white;
        color: var(--brand-navy);
      }

      .club-board__card span {
        display: block;
        color: var(--slate-500);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      .club-board__card strong {
        display: block;
        margin-top: 4px;
        font-size: 18px;
        font-weight: 800;
      }

      .club-board__card small {
        display: block;
        margin-top: 4px;
        color: var(--slate-500);
        font-size: 12px;
      }

      .club-board__card--main {
        right: 34px;
        top: 54px;
        width: 245px;
        padding: 18px;
        animation-delay: 80ms;
      }

      .club-board__code {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px dashed var(--slate-300);
        color: var(--brand-cyan-700);
        font-family: var(--font-mono);
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 0.16em;
      }

      .club-board__logo {
        left: 82px;
        bottom: 42px;
        width: 122px;
        height: 58px;
        border-radius: var(--radius-md);
        overflow: hidden;
        background: white;
        animation-delay: 150ms;
      }

      .club-board__card--scan {
        right: 52px;
        bottom: 38px;
        width: 176px;
        padding: 16px;
        animation-delay: 210ms;
      }

      .club-board__card--scan strong {
        color: var(--success);
      }

      @keyframes board-enter {
        from { opacity: 0; transform: translateY(14px) scale(0.96); }
      }

      .site-footer {
        background: white;
        border-top: 1px solid var(--slate-100);
        padding: 28px 32px;
      }

      .site-footer__inner {
        max-width: 1320px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .site-footer__inner > div {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--slate-500);
        font-size: 12px;
      }

      .site-footer a {
        color: var(--slate-500);
        text-decoration: none;
      }

      @media (hover: hover) and (pointer: fine) {
        .landing-nav__links a:hover,
        .site-footer a:hover {
          color: var(--brand-navy);
        }

        .landing-hero__primary:hover svg {
          transform: translateX(3px);
        }

        .active-event__card:hover,
        .past-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .active-event__card:hover .active-event__image,
        .past-card:hover .past-card__image {
          transform: scale(1.02);
        }

        .active-event__card:hover .active-event__bottom strong {
          transform: translateX(3px);
        }
      }

      @media (max-width: 900px) {
        .landing-nav__links {
          display: none;
        }

        .landing-nav__inner {
          padding: 14px 20px;
        }

        .landing-nav__account {
          display: none;
        }

        .landing-hero {
          min-height: 680px;
          padding: 76px 20px 28px;
        }

        .hero-artwork {
          inset: 92px 12px auto auto;
          width: min(58vw, 360px);
          height: 360px;
          opacity: 0.42;
        }

        .hero-artwork__ticket {
          display: none;
        }

        .landing-hero__scrim {
          background:
            linear-gradient(180deg, rgba(15,23,42,0.48) 0%, rgba(15,23,42,0.90) 82%),
            linear-gradient(90deg, rgba(15,23,42,0.62), rgba(15,23,42,0.16));
        }

        .landing-hero__content {
          margin-bottom: 118px;
          padding-right: 0;
        }

        .landing-hero__event {
          left: 20px;
          right: 20px;
          grid-template-columns: 1fr auto;
          row-gap: 6px;
        }

        .landing-hero__event span,
        .landing-hero__event small {
          grid-column: 1 / -1;
        }

        .trust-band__inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 18px;
          justify-content: stretch;
          padding: 18px 20px;
        }

        .trust-band__line {
          display: none;
        }

        .trust-band__item {
          white-space: normal;
        }

        .how-section,
        .events-section,
        .about-section {
          padding-left: 20px;
          padding-right: 20px;
        }

        .steps__rail {
          display: none;
        }

        .steps__grid,
        .active-event__card,
        .about-section__inner {
          grid-template-columns: 1fr;
        }

        .steps__grid {
          gap: 24px;
        }

        .steps__item {
          border-left: 1px solid var(--slate-200);
          padding: 0 0 0 22px;
        }

        .flow-preview {
          grid-template-columns: 1fr;
          margin-top: 34px;
        }

        .flow-preview__ticket {
          grid-template-columns: minmax(0, 1fr) 78px;
        }

        .active-event__media {
          min-height: 300px;
        }

        .active-event__body {
          padding: 24px;
        }

        .about-section__inner {
          gap: 40px;
        }

        .club-board {
          min-height: 320px;
        }

        .site-footer__inner {
          align-items: flex-start;
          flex-direction: column;
        }
      }

      @media (max-width: 560px) {
        .landing-nav__cta {
          padding: 9px 12px;
        }

        .landing-hero__title {
          font-size: 48px;
        }

        .hero-artwork {
          width: 72vw;
          opacity: 0.28;
        }

        .hero-artwork__poster {
          width: 170px;
        }

        .landing-hero__copy {
          font-size: 15px;
        }

        .landing-hero__actions {
          flex-direction: column;
          align-items: stretch;
        }

        .landing-hero__primary,
        .landing-hero__secondary {
          justify-content: center;
        }

        .active-event__facts {
          grid-template-columns: 1fr;
        }

        .club-board__poster {
          left: 22px;
          top: 28px;
          width: 118px;
        }

        .club-board__card--main {
          right: 22px;
          top: 46px;
          width: 198px;
        }

        .club-board__logo {
          left: 38px;
          bottom: 34px;
        }

        .club-board__card--scan {
          right: 22px;
          bottom: 28px;
        }
      }
    `}</style>
  );
}
