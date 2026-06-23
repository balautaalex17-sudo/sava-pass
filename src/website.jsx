// website.jsx — SavaPass desktop landing page
// Brand-led landing: what SavaPass is + Interact Sf. Sava events.
// Current event is featured as one of the cards, not as the sole hero.

function Website({ event, accent, heroPhoto = true }) {
  const allEvents = window.SP_EVENTS;
  const upcoming = event;
  const pastEvents = Object.values(allEvents).filter(e => e.id !== upcoming.id);
  const totalSold = Object.values(allEvents).reduce((a, e) => a + e.sold, 0);
  const editions = Object.keys(allEvents).length;

  return (
    <div style={{
      minHeight: '100%', background: 'white', color: SP_C.navy,
      fontFamily: SP_FONT, WebkitFontSmoothing: 'antialiased',
    }}>
      {/* ── Top nav ───────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid ' + SP_C.slate100,
      }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            <Logo size={22} />
            <div style={{ display: 'flex', gap: 26, fontSize: 13, fontWeight: 600, color: SP_C.slate700 }}>
              <a style={navLink}>Evenimente</a>
              <a style={navLink}>Despre Interact</a>
              <a style={navLink}>Cum funcționează</a>
              <a style={navLink}>Contact</a>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button style={{
              padding: '8px 14px', borderRadius: 999, border: 0, cursor: 'pointer',
              background: 'transparent', color: SP_C.slate700, fontWeight: 600, fontSize: 13, fontFamily: SP_FONT,
            }}>Intră în cont</button>
            <button style={{
              padding: '9px 16px', borderRadius: 999, border: 0, cursor: 'pointer',
              background: SP_C.navy, color: 'white', fontWeight: 700, fontSize: 13, fontFamily: SP_FONT,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="ticket" size={14} color="white" />
              Biletul meu
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero: brand-led ───────────────────────────────── */}
      <section style={{ padding: '88px 32px 56px', maxWidth: 1320, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 64, alignItems: 'center' }}>
          {/* Left: pitch */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px', background: SP_C.slate50, borderRadius: 999, border: '1px solid ' + SP_C.slate200 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 999, background: accent,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="ticket" size={12} color="white" stroke={2.2} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: SP_C.slate700 }}>
                Biletele oficiale Interact Sf. Sava
              </span>
            </div>

            <h1 style={{
              fontFamily: SP_FONT, fontWeight: 800, fontSize: 84, color: SP_C.navy,
              letterSpacing: '-0.045em', lineHeight: 0.95, margin: '20px 0 0',
            }}>
              Biletul tău <br />
              pentru fiecare seară <br />
              <span style={{ fontFamily: SP_SERIF, fontStyle: 'italic', fontWeight: 400, color: accent, letterSpacing: '-0.02em' }}>
                Interact.
              </span>
            </h1>
            <p style={{
              fontSize: 17, color: SP_C.slate600,
              margin: '22px 0 0', maxWidth: 460, lineHeight: 1.55, textWrap: 'pretty',
            }}>
              Concerte acustice, baluri, vânători de ouă în curtea liceului. Cumperi în 30 de secunde,
              QR-ul ajunge pe mail, intri la ușă cu o singură scanare.
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 32, alignItems: 'center' }}>
              <button style={{
                padding: '15px 24px', borderRadius: 14, border: 0, cursor: 'pointer',
                background: `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`,
                color: 'white', fontWeight: 700, fontSize: 15, fontFamily: SP_FONT,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 14px 32px rgba(0,159,227,0.30)',
              }}>
                Vezi evenimentele
                <Icon name="arrow-right" size={16} color="white" stroke={2.2} />
              </button>
              <button style={{
                padding: '15px 20px', borderRadius: 14, border: '1px solid ' + SP_C.slate200, cursor: 'pointer',
                background: 'white', color: SP_C.navy, fontWeight: 600, fontSize: 14, fontFamily: SP_FONT,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                Despre Interact Sf. Sava
              </button>
            </div>

            {/* Stat strip */}
            <div style={{ marginTop: 44, display: 'flex', gap: 36, alignItems: 'center' }}>
              <HeroStat value={editions} label="ediții" sub="organizate" accent={accent} />
              <div style={{ width: 1, height: 42, background: SP_C.slate200 }} />
              <HeroStat value={totalSold} label="bilete" sub="vândute" accent={accent} />
              <div style={{ width: 1, height: 42, background: SP_C.slate200 }} />
              <HeroStat value="13.5k" label="RON" sub="donați" accent={accent} />
            </div>
          </div>

          {/* Right: stacked poster collage (all events, current on top) */}
          <PosterStack events={[upcoming, ...pastEvents]} accent={accent} heroPhoto={heroPhoto} />
        </div>
      </section>

      {/* ── Trust band ────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid ' + SP_C.slate100, borderBottom: '1px solid ' + SP_C.slate100, background: SP_C.slate50 }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          <TrustItem icon="lock" title="Plată securizată" sub="Stripe · 3D Secure" />
          <TrustItem icon="mail" title="QR pe email" sub="Imediat după plată" />
          <TrustItem icon="refresh-ccw" title="Returnabil" sub="Cu 48h înainte" />
          <TrustItem icon="heart-handshake" title="Pentru o cauză" sub="100% Interact" />
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section style={{ padding: '80px 32px 32px', maxWidth: 1320, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <Eyebrow color={accent}>CUM FUNCȚIONEAZĂ</Eyebrow>
            <h2 style={sectionTitle}>Trei pași până la ușă.</h2>
          </div>
          <p style={{ fontSize: 14, color: SP_C.slate500, maxWidth: 360, lineHeight: 1.55, margin: 0, textWrap: 'pretty' }}>
            Fără cont, fără aplicații de instalat. Doar email-ul tău și un card.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          <StepCard n={1} icon="calendar"    title="Alegi evenimentul"  body="Le vezi pe toate pe pagina aceasta. Detalii, program, locuri rămase." accent={accent} />
          <StepCard n={2} icon="credit-card" title="Plătești securizat"  body="Card sau Apple Pay, prin Stripe. Bilet generat în 5 secunde."   accent={accent} />
          <StepCard n={3} icon="qr-code"     title="Intri cu QR"         body="Îl primești pe email și în Wallet. La intrare îl scanezi și ești înăuntru." accent={accent} />
        </div>
      </section>

      {/* ── Events grid (current + past) ──────────────────── */}
      <section style={{ padding: '56px 32px 80px', maxWidth: 1320, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <Eyebrow color={accent}>EVENIMENTE</Eyebrow>
            <h2 style={sectionTitle}>Ce urmează și ce a fost.</h2>
            <p style={{ fontSize: 14, color: SP_C.slate500, marginTop: 8 }}>
              {editions} ediții · {totalSold} bilete · cca 13.500 RON donați
            </p>
          </div>
          <button style={{
            padding: '10px 16px', borderRadius: 12, border: '1px solid ' + SP_C.slate200,
            background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: SP_C.slate700,
            display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: SP_FONT,
          }}>
            Toate edițiile
            <Icon name="arrow-right" size={14} color={SP_C.slate600} />
          </button>
        </div>

        {/* Featured upcoming */}
        <FeaturedUpcoming event={upcoming} accent={accent} heroPhoto={heroPhoto} />

        {/* Past events grid */}
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {pastEvents.map(p => <PastEventLarge key={p.id} event={p} />)}
        </div>
      </section>

      {/* ── About Interact ────────────────────────────────── */}
      <section style={{ borderTop: '1px solid ' + SP_C.slate100, background: SP_C.slate50 }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '72px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <Eyebrow color={accent}>DESPRE INTERACT</Eyebrow>
            <h2 style={{ ...sectionTitle, fontSize: 44 }}>
              Un club de elevi <br />
              <span style={{ fontFamily: SP_SERIF, fontStyle: 'italic', fontWeight: 400 }}>
                cu o curte veche.
              </span>
            </h2>
            <p style={{ fontSize: 15, color: SP_C.slate600, marginTop: 18, lineHeight: 1.6, textWrap: 'pretty', maxWidth: 480 }}>
              Interact Sf. Sava · Curtea Veche este un club Rotary-afiliat de elevi din București. Organizăm concerte, baluri și proiecte sociale ca să strângem fonduri pentru burse și pentru proiectul „Cărți pentru sat".
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 22 }}>
              {['Burse Sava', 'Cărți pentru sat', 'Ateliere de vară', 'Voluntariat la spital'].map((p, i) => (
                <span key={i} style={{
                  padding: '8px 14px', background: 'white', borderRadius: 999, border: '1px solid ' + SP_C.slate200,
                  fontSize: 13, fontWeight: 500, color: SP_C.slate700,
                }}>{p}</span>
              ))}
            </div>
          </div>

          {/* Decorative club lockup card */}
          <div style={{ position: 'relative', minHeight: 360 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 28, overflow: 'hidden',
              background: `linear-gradient(160deg, ${accent} 0%, #2563EB 100%)`,
              boxShadow: '0 40px 80px -30px rgba(37,99,235,0.45)',
              padding: 36, color: 'white',
            }}>
              <Gear style={{ position: 'absolute', right: -50, bottom: -50, opacity: 0.18 }} size={320} color="white" />
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.9 }}>EST. 2009</div>
                <div style={{
                  fontFamily: SP_SERIF, fontStyle: 'italic', fontSize: 52, lineHeight: 1.0,
                  letterSpacing: '-0.02em', marginTop: 14,
                }}>
                  Interact <br /> Sf. Sava
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12, opacity: 0.9 }}>
                  Curtea Veche · București
                </div>

                <div style={{ flex: 1 }} />

                <div style={{ display: 'flex', gap: 28, fontSize: 12, opacity: 0.95 }}>
                  <div>
                    <div style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 28 }}>42</div>
                    <div style={{ opacity: 0.8 }}>membri</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 28 }}>16</div>
                    <div style={{ opacity: 0.8 }}>ani</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 28 }}>9</div>
                    <div style={{ opacity: 0.8 }}>proiecte/an</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA band ──────────────────────────────────────── */}
      <section style={{ background: SP_C.navy, color: 'white', position: 'relative', overflow: 'hidden' }}>
        <Gear style={{ position: 'absolute', right: -60, top: -60, opacity: 0.06 }} size={360} color="white" />
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '72px 32px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
          <div>
            <div style={{ fontFamily: SP_SERIF, fontStyle: 'italic', fontSize: 48, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
              Ne vedem la următorul.
            </div>
            <div style={{ fontSize: 15, opacity: 0.7, marginTop: 12, maxWidth: 460 }}>
              Următorul eveniment: <b style={{ opacity: 0.95 }}>{upcoming.title}</b> · {upcoming.dateLabel}. Mai sunt {upcoming.capacity - upcoming.sold} locuri.
            </div>
          </div>
          <button style={{
            padding: '17px 28px', borderRadius: 14, border: 0, cursor: 'pointer',
            background: 'white', color: SP_C.navy, fontWeight: 700, fontSize: 15, fontFamily: SP_FONT,
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            Cumpără bilet · {upcoming.price} RON
            <Icon name="arrow-right" size={16} color={SP_C.navy} stroke={2.2} />
          </button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer style={{ padding: '40px 32px', background: '#070C18', color: 'rgba(255,255,255,0.7)' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Logo size={20} dark />
            <span style={{ fontSize: 12, opacity: 0.6 }}>© 2025 Interact Sf. Sava · Curtea Veche · București</span>
          </div>
          <div style={{ display: 'flex', gap: 22, fontSize: 12, fontWeight: 500 }}>
            <a style={{ color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>Termeni</a>
            <a style={{ color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>Confidențialitate</a>
            <a style={{ color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>Contact</a>
            <a style={{ color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>Pentru organizatori</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Local helpers
// ─────────────────────────────────────────────────────────

const navLink = { color: SP_C.slate700, cursor: 'pointer', textDecoration: 'none' };
const sectionTitle = {
  fontFamily: SP_FONT, fontWeight: 800, fontSize: 38, color: SP_C.navy,
  letterSpacing: '-0.03em', lineHeight: 1.05, margin: '10px 0 0',
};

function HeroStat({ value, label, sub, accent }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 32, color: SP_C.navy, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: accent }}>{label}</div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: SP_C.slate500, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 6 }}>
        {sub}
      </div>
    </div>
  );
}

function PosterStack({ events, accent, heroPhoto }) {
  // Stacked poster collage — three cards fanned out, current on top.
  const layout = [
    { rot: 6,  tx: 120, ty: 40,  z: 1, scale: 0.86, blur: false },
    { rot: -8, tx: -60, ty: 70,  z: 2, scale: 0.92, blur: false },
    { rot: 2,  tx: 30,  ty: -10, z: 3, scale: 1.00, blur: false }, // top (current)
  ];
  const ordered = events.slice(0, 3).reverse(); // so events[0] (current) renders LAST → on top
  // align layout to render order
  const stack = ordered.map((e, i) => ({ event: e, ...layout[i] }));

  return (
    <div style={{ position: 'relative', height: 540 }}>
      {stack.map(({ event, rot, tx, ty, z, scale }) => (
        <div key={event.id} style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 320, aspectRatio: event.photoAspect || '3 / 4',
          transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rot}deg) scale(${scale})`,
          zIndex: z,
          borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 32px 80px -24px rgba(15,23,42,0.40), 0 0 0 1px rgba(15,23,42,0.08)',
          background: SP_C.navy,
        }}>
          {heroPhoto ? (
            <img src={event.photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `radial-gradient(120% 80% at 30% 20%, ${accent}88 0%, transparent 60%), linear-gradient(160deg, #0F172A 0%, #1E3A8A 100%)`,
              fontFamily: SP_FONT, fontWeight: 800, fontSize: 36, color: 'white',
              letterSpacing: '-0.03em', textAlign: 'center', padding: 24, lineHeight: 1,
            }}>{event.title}</div>
          )}
          {/* Bottom info strip on top card */}
          {z === 3 && (
            <div style={{
              position: 'absolute', left: 14, right: 14, bottom: 14,
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.94)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: '0.14em' }}>URMĂTORUL</div>
                <div style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 15, color: SP_C.navy, letterSpacing: '-0.01em', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {event.title}
                </div>
              </div>
              <div style={{
                padding: '7px 11px', borderRadius: 10,
                background: SP_C.navy, color: 'white',
                fontWeight: 700, fontSize: 11, fontFamily: SP_FONT,
                display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
              }}>
                {event.price} RON
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StepCard({ n, icon, title, body, accent }) {
  return (
    <div style={{
      background: 'white', borderRadius: 20, padding: 28,
      border: '1px solid ' + SP_C.slate200,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 18, right: 22, fontFamily: SP_FONT, fontWeight: 800,
        fontSize: 84, color: SP_C.slate100, letterSpacing: '-0.05em', lineHeight: 1,
      }}>
        {n}
      </div>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 22px rgba(0,159,227,0.25)',
      }}>
        <Icon name={icon} size={22} color="white" stroke={2} />
      </div>
      <div style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 20, color: SP_C.navy, letterSpacing: '-0.02em', marginTop: 22, position: 'relative' }}>
        {title}
      </div>
      <p style={{ fontSize: 14, color: SP_C.slate600, marginTop: 8, lineHeight: 1.55, textWrap: 'pretty', position: 'relative' }}>
        {body}
      </p>
    </div>
  );
}

function FeaturedUpcoming({ event, accent, heroPhoto }) {
  const conv = Math.round((event.sold / event.capacity) * 100);
  return (
    <div style={{
      borderRadius: 28, overflow: 'hidden',
      border: '1px solid ' + SP_C.slate200,
      display: 'grid', gridTemplateColumns: '0.9fr 1.1fr',
      background: 'white',
      boxShadow: '0 24px 60px -30px rgba(15,23,42,0.18), 0 1px 2px rgba(15,23,42,0.04)',
    }}>
      {/* Poster side */}
      <div style={{ position: 'relative', background: SP_C.navy, minHeight: 380 }}>
        {heroPhoto ? (
          <img src={event.photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(120% 80% at 30% 20%, ${accent}88 0%, transparent 60%), linear-gradient(160deg, #0F172A 0%, #1E3A8A 100%)`,
            fontFamily: SP_FONT, fontWeight: 800, fontSize: 44, color: 'white',
            letterSpacing: '-0.03em', textAlign: 'center', padding: 32, lineHeight: 1,
          }}>{event.title}</div>
        )}
        <div style={{
          position: 'absolute', top: 18, left: 18, padding: '6px 10px', borderRadius: 999,
          background: 'rgba(255,255,255,0.92)', fontSize: 10, fontWeight: 700,
          color: accent, letterSpacing: '0.14em',
        }}>URMĂTORUL EVENIMENT</div>
      </div>

      {/* Copy side */}
      <div style={{ padding: '40px 44px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.14em' }}>
          {event.dateLabel.toUpperCase()}
        </div>
        <div style={{
          fontFamily: SP_FONT, fontWeight: 800, fontSize: 46, color: SP_C.navy,
          letterSpacing: '-0.03em', lineHeight: 1.0, marginTop: 8,
        }}>
          {event.title}
        </div>
        <p style={{
          fontFamily: SP_SERIF, fontStyle: 'italic', fontSize: 18, color: SP_C.slate600,
          margin: '10px 0 0', lineHeight: 1.4, maxWidth: 440,
        }}>{event.subtitle}.</p>

        <p style={{
          fontSize: 14, color: SP_C.slate600, marginTop: 18, lineHeight: 1.6,
          textWrap: 'pretty', maxWidth: 480,
        }}>{event.about}</p>

        {/* facts row */}
        <div style={{ display: 'flex', gap: 28, marginTop: 22 }}>
          <FactInline icon="map-pin" label={event.venue} accent={accent} />
          <FactInline icon="clock"   label={event.doors} accent={accent} />
          <FactInline icon="ticket"  label={`${event.capacity - event.sold} locuri`} accent={accent} />
        </div>

        {/* progress + CTA */}
        <div style={{ marginTop: 'auto', paddingTop: 28 }}>
          <div style={{
            height: 6, borderRadius: 999, background: SP_C.slate100, overflow: 'hidden', marginBottom: 8,
          }}>
            <div style={{ height: '100%', width: `${conv}%`, background: `linear-gradient(90deg, ${accent} 0%, #2563EB 100%)`, borderRadius: 999 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: SP_C.slate500, fontWeight: 600 }}>
            <span><b style={{ color: SP_C.navy }}>{event.sold}</b> din {event.capacity} bilete</span>
            <span><b style={{ color: accent }}>{conv}%</b> sală plină</span>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
            <button style={{
              flex: 1, padding: '15px 24px', borderRadius: 14, border: 0, cursor: 'pointer',
              background: `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`,
              color: 'white', fontWeight: 700, fontSize: 15, fontFamily: SP_FONT,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 14px 32px rgba(0,159,227,0.30)',
            }}>
              Cumpără bilet · {event.price} RON
              <Icon name="arrow-right" size={16} color="white" stroke={2.2} />
            </button>
            <button style={{
              padding: '15px 20px', borderRadius: 14, border: '1px solid ' + SP_C.slate200, cursor: 'pointer',
              background: 'white', color: SP_C.navy, fontWeight: 600, fontSize: 14, fontFamily: SP_FONT,
            }}>
              Programul serii
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FactInline({ icon, label, accent }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: SP_C.slate700, fontWeight: 500 }}>
      <Icon name={icon} size={15} color={accent} />
      {label}
    </div>
  );
}

function TrustItem({ icon, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: 'white', border: '1px solid ' + SP_C.slate200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={17} color={SP_C.navy} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: SP_C.navy }}>{title}</div>
        <div style={{ fontSize: 11, color: SP_C.slate500 }}>{sub}</div>
      </div>
    </div>
  );
}

function PastEventLarge({ event }) {
  const conv = Math.round((event.checkedIn / event.sold) * 100);
  return (
    <div style={{
      background: 'white', borderRadius: 24, overflow: 'hidden',
      border: '1px solid ' + SP_C.slate200, cursor: 'pointer',
      display: 'grid', gridTemplateColumns: '180px 1fr',
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    }}>
      <div style={{ position: 'relative', background: SP_C.navy }}>
        <img src={event.photo} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        }} />
      </div>
      <div style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: event.accent, letterSpacing: '0.12em' }}>{event.eyebrow}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.12em',
            padding: '2px 7px', background: SP_C.slate100, borderRadius: 999,
          }}>SOLD OUT</span>
        </div>
        <div style={{
          fontFamily: SP_FONT, fontWeight: 800, fontSize: 22, color: SP_C.navy,
          letterSpacing: '-0.02em', marginTop: 6, lineHeight: 1.1,
        }}>{event.title}</div>
        <div style={{ fontSize: 12, color: SP_C.slate500, marginTop: 4 }}>{event.dateLabel}</div>
        <p style={{
          fontSize: 13, color: SP_C.slate600, marginTop: 12, lineHeight: 1.5,
          textWrap: 'pretty',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{event.about}</p>
        <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 12, color: SP_C.slate600 }}>
          <span><b style={{ color: SP_C.navy }}>{event.sold}</b> oameni</span>
          <span><b style={{ color: SP_C.navy }}>{(event.sold * event.price).toLocaleString('ro')}</b> RON</span>
          <span><b style={{ color: SP_C.success }}>{conv}%</b> sosiți</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Website });
