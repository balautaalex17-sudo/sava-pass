// app.jsx — main composition: interactive phone + design canvas with all screens
// All Romanian copy. Reads tweak state from useTweaks.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "currentEvent": "echoes",
  "ticketStyle": "wallet",
  "accent": "#009FE3"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = ['#009FE3', '#2563EB', '#0EA5E9', '#0F172A'];

// ─────────────────────────────────────────────────────────
// Interactive phone — finite-state flow
// ─────────────────────────────────────────────────────────
function PhoneFlow({ event, accent, ticketStyle, heroPhoto, width = 390, height = 844 }) {
  const [screen, setScreen] = React.useState('home'); // home | event | checkout | success | ticket | scanner
  const [direction, setDirection] = React.useState('forward');

  const go = (next, dir = 'forward') => {
    setDirection(dir);
    setScreen(next);
  };

  const props = { event, accent, showPhoto: heroPhoto };

  // Inline screen with transition
  const renderScreen = () => {
    switch (screen) {
      case 'home':     return <HomeScreen     {...props} onOpenEvent={() => go('event')} onOpenTicket={() => go('ticket')} />;
      case 'event':    return <EventScreen    {...props} onBack={() => go('home', 'back')} onBuy={() => go('checkout')} />;
      case 'checkout': return <CheckoutScreen {...props} onBack={() => go('event', 'back')} onPay={() => go('success')} />;
      case 'success':  return <SuccessScreen  {...props} onSeeTicket={() => go('ticket')} onHome={() => go('home', 'back')} />;
      case 'ticket':   return <TicketScreen   {...props} style={ticketStyle} onBack={() => go('home', 'back')} />;
      case 'scanner':  return <ScannerScreen  {...props} onBack={() => go('home', 'back')} />;
      default: return null;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <PhoneShell width={width} height={height} dark={screen === 'scanner'} statusDark={screen === 'scanner'} scrollKey={screen}>
        <div key={screen} style={{
          height: '100%', animation: `sp-slide-${direction} 380ms cubic-bezier(.22,1,.36,1)`,
        }}>
          {renderScreen()}
        </div>
      </PhoneShell>
      {/* Floating segmented nav under phone */}
      <FlowNav screen={screen} onPick={(s) => go(s, 'forward')} accent={accent} />
    </div>
  );
}

function FlowNav({ screen, onPick, accent }) {
  const steps = [
    { id: 'home',     l: 'Acasă',    i: 'home' },
    { id: 'event',    l: 'Eveniment',i: 'calendar' },
    { id: 'checkout', l: 'Plată',    i: 'credit-card' },
    { id: 'success',  l: 'Succes',   i: 'check-circle-2' },
    { id: 'ticket',   l: 'Bilet',    i: 'ticket' },
    { id: 'scanner',  l: 'Scanare',  i: 'qr-code' },
  ];
  return (
    <div style={{
      position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: -64,
      display: 'flex', gap: 4, padding: 6, borderRadius: 999,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(15,23,42,0.06)',
      boxShadow: '0 14px 40px -10px rgba(15,23,42,0.18)',
      fontFamily: SP_FONT,
    }}>
      {steps.map(s => {
        const active = screen === s.id;
        return (
          <button key={s.id} onClick={() => onPick(s.id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: active ? '8px 14px' : '8px 10px',
            borderRadius: 999, border: 0, cursor: 'pointer',
            background: active ? accent : 'transparent',
            color: active ? 'white' : SP_C.slate600,
            fontWeight: 700, fontSize: 12, transition: 'all 180ms cubic-bezier(.22,1,.36,1)',
          }}>
            <Icon name={s.i} size={14} color={active ? 'white' : SP_C.slate600} stroke={active ? 2.1 : 1.75} />
            {active && <span>{s.l}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Static phone — non-interactive (for canvas side-by-side)
// ─────────────────────────────────────────────────────────
function StaticPhone({ children, dark, width = 360, height = 780 }) {
  return (
    <PhoneShell width={width} height={height} dark={dark} statusDark={dark}>
      <div style={{ height: '100%', pointerEvents: 'none' }}>{children}</div>
    </PhoneShell>
  );
}

// Static phone that scrolls its inner home screen to a position on mount
function ScrolledHome({ event, accent, heroPhoto, scrollTop = 520 }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) {
      const scroller = ref.current.querySelector('[data-home-scroll]');
      if (scroller) scroller.scrollTop = scrollTop;
    }
  }, [scrollTop, event.id, heroPhoto]);
  return (
    <div ref={ref}>
      <StaticPhone>
        <HomeScreen event={event} accent={accent} showPhoto={heroPhoto} onOpenEvent={() => {}} onOpenTicket={() => {}} scrollRef={(el) => {
          if (el) el.setAttribute('data-home-scroll', '');
        }} />
      </StaticPhone>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Tweaks panel
// ─────────────────────────────────────────────────────────
function SavaTweaks({ t, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection label="Eveniment activ" />
      <TweakSelect
        label="Show"
        value={t.currentEvent}
        options={[
          { value: 'echoes', label: 'Echoes Unplugged' },
          { value: 'easter', label: 'Easter Egg Hunt' },
          { value: 'cupids', label: "Cupid's Hex" },
        ]}
        onChange={v => setTweak('currentEvent', v)}
      />

      <TweakSection label="Stil bilet" />
      <TweakRadio
        label="Layout"
        value={t.ticketStyle}
        options={[
          { value: 'wallet',   label: 'Wallet' },
          { value: 'minimal',  label: 'Minimal' },
          { value: 'boarding', label: 'Boarding' },
        ]}
        onChange={v => setTweak('ticketStyle', v)}
      />

      <TweakSection label="Accent" />
      <TweakColor
        label="Culoare"
        value={t.accent}
        options={ACCENT_OPTIONS}
        onChange={v => setTweak('accent', v)}
      />
    </TweaksPanel>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const event = SP_EVENTS[t.currentEvent] || SP_EVENTS.echoes;
  const accent = t.accent;
  const heroPhoto = true; // posters are permanent now
  const ticketStyle = t.ticketStyle;

  // The non-photo events use their accent for the "deep blue" companion to stay coherent
  return (
    <>
      <DesignCanvas>
        <DCSection id="hero-flow"
                   title="SavaPass · Prototype"
                   subtitle="Bilete digitale pentru Interact Sf. Sava. Apasă pe pașii flow-ului ca să navighezi.">
          <DCArtboard id="flow" label="Flow interactiv · iPhone 16" width={460} height={1000}>
            <div data-screen-label="Flow interactiv" style={{
              padding: '40px 35px 100px',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              background: '#f0eee9',
              height: '100%', boxSizing: 'border-box',
            }}>
              <PhoneFlow event={event} accent={accent} ticketStyle={ticketStyle} heroPhoto={heroPhoto} />
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="screens"
                   title="Toate ecranele"
                   subtitle="Mobile · în ordinea fluxului. Fiecare ecran este static aici — pentru interacțiune, folosește panoul de sus.">
          <DCArtboard id="s-home" label="01 · Acasă" width={360} height={780}>
            <div data-screen-label="01 Acasă">
              <StaticPhone>
                <HomeScreen event={event} accent={accent} showPhoto={heroPhoto} onOpenEvent={() => {}} onOpenTicket={() => {}} />
              </StaticPhone>
            </div>
          </DCArtboard>
          <DCArtboard id="s-home-scrolled" label="01b · Acasă (derulat → evenimente trecute)" width={360} height={780}>
            <div data-screen-label="01b Acasă derulat">
              <ScrolledHome event={event} accent={accent} heroPhoto={heroPhoto} scrollTop={540} />
            </div>
          </DCArtboard>
          <DCArtboard id="s-event" label="02 · Detalii eveniment" width={360} height={780}>
            <div data-screen-label="02 Detalii">
              <StaticPhone>
                <EventScreen event={event} accent={accent} showPhoto={heroPhoto} onBack={() => {}} onBuy={() => {}} />
              </StaticPhone>
            </div>
          </DCArtboard>
          <DCArtboard id="s-checkout" label="03 · Plată" width={360} height={780}>
            <div data-screen-label="03 Plată">
              <StaticPhone>
                <CheckoutScreen event={event} accent={accent} onBack={() => {}} onPay={() => {}} />
              </StaticPhone>
            </div>
          </DCArtboard>
          <DCArtboard id="s-success" label="04 · Succes" width={360} height={780}>
            <div data-screen-label="04 Succes">
              <StaticPhone>
                <SuccessScreen event={event} accent={accent} onSeeTicket={() => {}} onHome={() => {}} />
              </StaticPhone>
            </div>
          </DCArtboard>
          <DCArtboard id="s-ticket" label="05 · Biletul tău" width={360} height={780}>
            <div data-screen-label="05 Bilet">
              <StaticPhone>
                <TicketScreen event={event} accent={accent} style={ticketStyle} onBack={() => {}} />
              </StaticPhone>
            </div>
          </DCArtboard>
          <DCArtboard id="s-scanner" label="06 · Scanare" width={360} height={780}>
            <div data-screen-label="06 Scanare">
              <StaticPhone dark>
                <ScannerScreen event={event} accent={accent} onBack={() => {}} />
              </StaticPhone>
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="ticket-variants"
                   title="Variante bilet"
                   subtitle="Trei direcții pentru pass — schimbă-le live din panoul Tweaks.">
          <DCArtboard id="tv-wallet" label="Wallet · gradient header" width={360} height={780}>
            <div data-screen-label="Bilet · Wallet">
              <StaticPhone>
                <TicketScreen event={event} accent={accent} style="wallet" onBack={() => {}} />
              </StaticPhone>
            </div>
          </DCArtboard>
          <DCArtboard id="tv-minimal" label="Minimal · alb" width={360} height={780}>
            <div data-screen-label="Bilet · Minimal">
              <StaticPhone>
                <TicketScreen event={event} accent={accent} style="minimal" onBack={() => {}} />
              </StaticPhone>
            </div>
          </DCArtboard>
          <DCArtboard id="tv-boarding" label="Boarding · 3-liter" width={360} height={780}>
            <div data-screen-label="Bilet · Boarding">
              <StaticPhone>
                <TicketScreen event={event} accent={accent} style="boarding" onBack={() => {}} />
              </StaticPhone>
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="admin"
                   title="Admin · desktop"
                   subtitle="Tablou de bord pentru organizatori. Statistici, jurnal de scanări, exporturi.">
          <DCArtboard id="admin-1" label="Tablou de bord" width={1280} height={860}>
            <div data-screen-label="Admin dashboard">
              <AdminDashboard event={event} accent={accent} />
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="website"
                   title="Site · savapass.ro"
                   subtitle="Aceeași poveste, dar pe web — desktop + mobile.">
          <DCArtboard id="web-home" label="Landing page · desktop 1440" width={1440} height={3100}>
            <div data-screen-label="Site · desktop">
              <ChromeWindow
                tabs={[{ title: 'SavaPass · Interact Sf. Sava', active: true }, { title: 'Interact Sf. Sava' }]}
                activeIndex={0}
                url={'savapass.ro'}
                width={1440}
                height={3100}>
                <Website event={event} accent={accent} heroPhoto={heroPhoto} />
              </ChromeWindow>
            </div>
          </DCArtboard>
          <DCArtboard id="web-mobile" label="Landing page · mobile web" width={420} height={1000}>
            <div data-screen-label="Site · mobile web" style={{
              padding: '24px 30px 60px',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              background: '#f0eee9', height: '100%', boxSizing: 'border-box',
            }}>
              <MobileWebsite event={event} accent={accent} heroPhoto={heroPhoto} />
            </div>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <SavaTweaks t={t} setTweak={setTweak} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
