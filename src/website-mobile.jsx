// website-mobile.jsx — SavaPass mobile-web view (browser inside phone frame)

function MobileWebsite({ event, accent, heroPhoto = true }) {
  const allEvents = window.SP_EVENTS;
  const pastEvents = Object.values(allEvents).filter(e => e.id !== event.id);
  const totalSold = Object.values(allEvents).reduce((a, e) => a + e.sold, 0);
  const conv = Math.round((event.sold / event.capacity) * 100);

  return (
    <PhoneShell width={390} height={844} url={'savapass.ro/' + event.slug}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Page content (scrolls) */}
        <div style={{ flex: 1, overflow: 'auto', background: 'white', fontFamily: SP_FONT, color: SP_C.navy, paddingTop: 100 }}>
          {/* In-page nav */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 5, background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid ' + SP_C.slate100,
            padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Logo size={18} />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button style={{
                padding: '7px 11px', borderRadius: 999, border: 0, cursor: 'pointer',
                background: SP_C.navy, color: 'white', fontWeight: 700, fontSize: 11, fontFamily: SP_FONT,
              }}>Biletul meu</button>
              <button style={{
                width: 32, height: 32, borderRadius: 8, border: 0, background: SP_C.slate100, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="menu" size={16} color={SP_C.navy} />
              </button>
            </div>
          </div>

          {/* Hero */}
          <section style={{ padding: '24px 20px 8px' }}>
            <Eyebrow color={accent}>EVENIMENTUL CURENT</Eyebrow>
            <h1 style={{
              fontFamily: SP_FONT, fontWeight: 800, fontSize: 40, color: SP_C.navy,
              letterSpacing: '-0.035em', lineHeight: 0.98, margin: '10px 0 0',
            }}>{event.title}</h1>
            <p style={{
              fontFamily: SP_SERIF, fontStyle: 'italic', fontSize: 16, color: SP_C.slate600,
              margin: '10px 0 0', lineHeight: 1.35,
            }}>{event.subtitle}.</p>

            {/* Poster with floating bits */}
            <div style={{ position: 'relative', marginTop: 22, marginRight: 14 }}>
              <div style={{
                borderRadius: 22, overflow: 'hidden',
                boxShadow: '0 24px 60px -20px rgba(15,23,42,0.40), 0 0 0 1px rgba(15,23,42,0.08)',
                aspectRatio: event.photoAspect || '3 / 4', background: SP_C.navy,
                transform: 'rotate(1deg)', position: 'relative',
              }}>
                {heroPhoto ? (
                  <img src={event.photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `radial-gradient(120% 80% at 30% 20%, ${accent}88 0%, transparent 60%), linear-gradient(160deg, #0F172A 0%, #1E3A8A 100%)`,
                    fontFamily: SP_FONT, fontWeight: 800, fontSize: 34, color: 'white',
                    letterSpacing: '-0.025em', textAlign: 'center', padding: 18, lineHeight: 1,
                  }}>{event.title}</div>
                )}
              </div>
              {/* Floating date card */}
              <div style={{
                position: 'absolute', bottom: -14, left: -10, padding: 12, background: 'white',
                borderRadius: 14, boxShadow: '0 12px 30px -10px rgba(15,23,42,0.30), 0 0 0 1px ' + SP_C.slate100,
                transform: 'rotate(-3deg)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: accent, letterSpacing: '0.14em' }}>VINERI</div>
                <div style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 22, color: SP_C.navy, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 2 }}>
                  14 nov
                </div>
              </div>
              {/* Floating price badge */}
              <div style={{
                position: 'absolute', top: -10, right: -14, padding: '7px 10px', borderRadius: 10,
                background: `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`,
                color: 'white', fontWeight: 700, fontSize: 11, fontFamily: SP_FONT,
                boxShadow: '0 10px 22px rgba(0,159,227,0.40)',
                display: 'inline-flex', alignItems: 'center', gap: 4, transform: 'rotate(5deg)',
              }}>
                <Icon name="zap" size={11} color="white" />
                {event.price} RON
              </div>
            </div>

            {/* Facts row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 28 }}>
              <MWFact icon="calendar" label="DATA"   value="14 nov"             accent={accent} />
              <MWFact icon="map-pin"  label="LOCUL"  value={event.venue}        accent={accent} />
              <MWFact icon="ticket"   label="RĂMASE" value={event.capacity - event.sold} accent={accent} />
            </div>

            {/* Social proof */}
            <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, color: SP_C.slate500 }}>
              <span style={{ display: 'inline-flex' }}>
                {['A','T','I'].map((c, i) => (
                  <span key={i} style={{
                    width: 20, height: 20, borderRadius: 999, fontSize: 9, fontWeight: 700,
                    background: ['#FECDD3','#FED7AA','#BAE6FD'][i], color: SP_C.navy,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid white', marginLeft: i === 0 ? 0 : -6,
                  }}>{c}</span>
                ))}
              </span>
              <span><b style={{ color: SP_C.navy }}>{event.sold}</b> au luat bilet · <b style={{ color: accent }}>{conv}%</b> plin</span>
            </div>
          </section>

          {/* Trust */}
          <section style={{ margin: '24px 20px 0', padding: '14px 16px', background: SP_C.slate50, borderRadius: 16, border: '1px solid ' + SP_C.slate100, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <MWTrust icon="lock" title="Plată securizată" sub="Stripe · 3DS" />
            <MWTrust icon="mail" title="QR pe email" sub="Imediat" />
            <MWTrust icon="refresh-ccw" title="Returnabil" sub="−48h" />
            <MWTrust icon="heart-handshake" title="Pentru o cauză" sub="100% Interact" />
          </section>

          {/* Program */}
          <section style={{ padding: '32px 20px 0' }}>
            <Eyebrow color={accent}>PROGRAMUL SERII</Eyebrow>
            <h2 style={mwSectionTitle}>O seară în șase acte.</h2>
            <p style={{ fontSize: 13, color: SP_C.slate600, marginTop: 10, lineHeight: 1.55, textWrap: 'pretty' }}>
              {event.about}
            </p>
            <div style={{ marginTop: 16, background: 'white', borderRadius: 18, border: '1px solid ' + SP_C.slate200, overflow: 'hidden' }}>
              {event.program.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px',
                  borderBottom: i < event.program.length - 1 ? '1px solid ' + SP_C.slate100 : 'none',
                }}>
                  <div style={{
                    fontFamily: SP_MONO, fontWeight: 600, color: accent, fontSize: 13, width: 44, flexShrink: 0,
                  }}>{p.t}</div>
                  <div style={{ fontSize: 13, color: SP_C.navy, fontWeight: 500 }}>{p.l}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {event.perks.map((p, i) => (
                <span key={i} style={{
                  padding: '6px 11px', background: SP_C.slate50, borderRadius: 999, border: '1px solid ' + SP_C.slate200,
                  fontSize: 11, fontWeight: 500, color: SP_C.slate700,
                }}>{p}</span>
              ))}
            </div>
          </section>

          {/* Past events */}
          <section style={{ padding: '32px 20px 0' }}>
            <Eyebrow color={accent}>ARHIVĂ</Eyebrow>
            <h2 style={mwSectionTitle}>Evenimente trecute</h2>
            <div style={{ fontSize: 12, color: SP_C.slate500, marginTop: 6 }}>
              {pastEvents.length} ediții · {totalSold} bilete vândute
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pastEvents.map(p => <PastEventRow key={p.id} event={p} />)}
            </div>
          </section>

          {/* CTA band */}
          <section style={{ margin: '32px 20px 0', padding: 22, background: SP_C.navy, color: 'white', borderRadius: 22, position: 'relative', overflow: 'hidden' }}>
            <Gear style={{ position: 'absolute', right: -30, top: -30, opacity: 0.08 }} size={180} color="white" />
            <div style={{ fontFamily: SP_SERIF, fontStyle: 'italic', fontSize: 30, letterSpacing: '-0.01em', lineHeight: 1.1, position: 'relative' }}>
              Ne vedem vineri.
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8, position: 'relative' }}>
              Mai sunt {event.capacity - event.sold} locuri din {event.capacity}.
            </div>
            <button style={{
              marginTop: 18, position: 'relative', width: '100%', padding: '14px',
              borderRadius: 12, border: 0, background: 'white', color: SP_C.navy,
              fontWeight: 700, fontSize: 14, fontFamily: SP_FONT, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Cumpără bilet · {event.price} RON
              <Icon name="arrow-right" size={15} color={SP_C.navy} stroke={2.2} />
            </button>
          </section>

          {/* Footer */}
          <footer style={{ padding: '24px 20px 32px', background: '#070C18', color: 'rgba(255,255,255,0.6)', marginTop: 24 }}>
            <Logo size={16} dark />
            <div style={{ fontSize: 10, marginTop: 10, opacity: 0.7 }}>© 2025 Interact Sf. Sava · Curtea Veche</div>
            <div style={{ display: 'flex', gap: 14, fontSize: 10, fontWeight: 500, marginTop: 10 }}>
              <a style={{ color: 'rgba(255,255,255,0.7)' }}>Termeni</a>
              <a style={{ color: 'rgba(255,255,255,0.7)' }}>Confidențialitate</a>
              <a style={{ color: 'rgba(255,255,255,0.7)' }}>Contact</a>
            </div>
          </footer>
        </div>

        {/* Fake bottom safari tabbar */}
        <div style={{
          padding: '6px 14px 26px', background: 'rgba(241,243,245,0.95)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        }}>
          {['chevron-left','chevron-right','share','book-marked','copy'].map((i, idx) => (
            <span key={idx} style={{ padding: 8, opacity: idx > 1 ? 0.55 : 1 }}>
              <Icon name={i} size={18} color={SP_C.slate700} />
            </span>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

const mwSectionTitle = {
  fontFamily: SP_FONT, fontWeight: 800, fontSize: 22, color: SP_C.navy,
  letterSpacing: '-0.025em', lineHeight: 1.1, margin: '6px 0 0',
};

function MWFact({ icon, label, value, accent }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: 10, border: '1px solid ' + SP_C.slate200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={11} color={accent} />
        <span style={{ fontSize: 9, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.12em' }}>{label}</span>
      </div>
      <div style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 14, color: SP_C.navy, letterSpacing: '-0.01em', marginTop: 3 }}>
        {value}
      </div>
    </div>
  );
}

function MWTrust({ icon, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, background: 'white', border: '1px solid ' + SP_C.slate200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={icon} size={14} color={SP_C.navy} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 11, color: SP_C.navy, lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 10, color: SP_C.slate500 }}>{sub}</div>
      </div>
    </div>
  );
}

Object.assign(window, { MobileWebsite });
