// screens-mobile.jsx — SavaPass mobile screens: Home, Event, Checkout, Success, Ticket, Scanner
// All Romanian copy. Uses shared atoms from components.jsx (window globals).

// ─────────────────────────────────────────────────────────
// Common phone shell — iPhone-like, 390 × 844, light or dark
// ─────────────────────────────────────────────────────────
function PhoneShell({ children, dark = false, statusDark, width = 390, height = 844, scrollKey, url }) {
  const showUrl = !!url;
  return (
    <div style={{
      width, height, borderRadius: 48, overflow: 'hidden', position: 'relative',
      background: dark ? '#0B1220' : '#F8FAFC',
      boxShadow: '0 36px 80px -20px rgba(15,23,42,0.35), 0 0 0 1px rgba(15,23,42,0.10), inset 0 0 0 4px rgba(15,23,42,0.92)',
      fontFamily: SP_FONT,
      WebkitFontSmoothing: 'antialiased'
    }}>
      {/* dynamic island */}
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 122, height: 35, borderRadius: 22, background: '#000', zIndex: 100
      }} />
      {/* status bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 90 }}>
        <PhoneStatusBar dark={statusDark ?? dark} />
      </div>
      <div key={scrollKey} style={{ height: '100%', position: 'relative', overflow: 'hidden', fontFamily: "Arial" }}>
        {children}
      </div>
      {/* Safari URL bar */}
      {showUrl &&
      <div style={{
        position: 'absolute', top: 54, left: 10, right: 10, zIndex: 95,
        padding: '8px 12px',
        background: dark ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: 12,
        border: dark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(15,23,42,0.06)',
        boxShadow: '0 6px 14px -6px rgba(15,23,42,0.15)',
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: '-apple-system, "SF Pro", system-ui', height: "36px"
      }}>
          <Icon name="lock" size={12} color={dark ? 'rgba(255,255,255,0.7)' : SP_C.slate500} />
          <span style={{
          flex: 1, fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
          color: dark ? 'rgba(255,255,255,0.92)' : SP_C.slate700,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>{url}</span>
          <Icon name="rotate-cw" size={13} color={dark ? 'rgba(255,255,255,0.7)' : SP_C.slate500} />
        </div>
      }
      {/* home indicator */}
      <div style={{
        position: 'absolute', bottom: 7, left: '50%', transform: 'translateX(-50%)',
        width: 134, height: 5, borderRadius: 100, zIndex: 110,
        background: dark ? 'rgba(255,255,255,0.65)' : 'rgba(15,23,42,0.32)'
      }} />
    </div>);

}

function PhoneStatusBar({ dark = false }) {
  const c = dark ? '#fff' : SP_C.navy;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 32px 0', height: 54, fontFamily: '-apple-system, "SF Pro", system-ui'
    }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: c, letterSpacing: 0.2 }}>9:41</span>
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        {/* signal */}
        <svg width="17" height="11" viewBox="0 0 17 11">
          <rect x="0" y="7" width="3" height="4" rx="0.6" fill={c} />
          <rect x="4.5" y="5" width="3" height="6" rx="0.6" fill={c} />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.6" fill={c} />
          <rect x="13.5" y="0" width="3" height="11" rx="0.6" fill={c} />
        </svg>
        {/* wifi */}
        <svg width="15" height="11" viewBox="0 0 15 11">
          <path d="M7.5 2.5C9.6 2.5 11.5 3.3 13 4.7L14 3.7C12.3 2 10 1 7.5 1S2.7 2 1 3.7L2 4.7C3.5 3.3 5.4 2.5 7.5 2.5Z" fill={c} />
          <path d="M7.5 5.7C8.8 5.7 9.9 6.2 10.8 7L11.8 6C10.6 4.9 9.1 4.2 7.5 4.2C5.9 4.2 4.4 4.9 3.2 6L4.2 7C5.1 6.2 6.2 5.7 7.5 5.7Z" fill={c} />
          <circle cx="7.5" cy="9.5" r="1.3" fill={c} />
        </svg>
        {/* battery */}
        <svg width="25" height="12" viewBox="0 0 25 12">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke={c} strokeOpacity="0.4" fill="none" />
          <rect x="2" y="2" width="18" height="8" rx="1.5" fill={c} />
          <path d="M23 4v4c0.7-0.2 1.3-1 1.3-2S23.7 4.2 23 4Z" fill={c} fillOpacity="0.4" />
        </svg>
      </span>
    </div>);

}

// ─────────────────────────────────────────────────────────
// 1) HOME / ACASĂ
// ─────────────────────────────────────────────────────────
function HomeScreen({ event, onOpenEvent, onOpenTicket, accent, showPhoto = true, scrollRef }) {
  // Past events = anything that's not the current event
  const allEvents = window.SP_EVENTS;
  const pastEvents = Object.values(allEvents).filter((e) => e.id !== event.id);
  const totalSold = pastEvents.reduce((a, e) => a + e.sold, 0);

  return (
    <div ref={scrollRef} style={{ height: '100%', background: SP_C.slate50, overflow: 'auto', paddingBottom: 100 }}>
      <div style={{ paddingTop: 64, padding: '64px 20px 0' }}>
        {/* App header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <Logo size={22} />
          <button style={{
            width: 38, height: 38, borderRadius: 999, border: '1px solid ' + SP_C.slate200,
            background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <Icon name="user" size={18} color={SP_C.navy} />
          </button>
        </div>

        {/* Eyebrow */}
        <Eyebrow color={accent}>EVENIMENTUL CURENT</Eyebrow>

        {/* Hero event card — poster-led */}
        <div onClick={onOpenEvent} style={{
          marginTop: 12, borderRadius: 28, overflow: 'hidden', cursor: 'pointer',
          position: 'relative',
          background: 'white',
          border: '1px solid ' + SP_C.slate200,
          boxShadow: '0 24px 60px -20px rgba(15,23,42,0.30)'
        }}>
          {/* Poster area */}
          <div style={{ position: 'relative', aspectRatio: event.photoAspect || '3 / 4', background: SP_C.navy, overflow: 'hidden' }}>
            {showPhoto ?
            <img src={event.photo} alt="" style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'
            }} /> :

            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(120% 80% at 30% 20%, ${accent}88 0%, transparent 60%), linear-gradient(160deg, #0F172A 0%, #1E3A8A 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{
                fontFamily: SP_FONT, fontWeight: 800, fontSize: 40, color: 'white',
                letterSpacing: '-0.025em', textAlign: 'center', padding: 24, lineHeight: 1.0
              }}>{event.title}</div>
            </div>
            }
            {/* top chips */}
            <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <Chip tone="dark" dot={false}>{event.dateLabel}</Chip>
              <Chip tone="dark" dot>Locuri puține</Chip>
            </div>
          </div>
          {/* Footer band */}
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: SP_C.slate500 }}>
                <Icon name="map-pin" size={13} color={SP_C.slate500} />
                <span style={{ fontWeight: 500 }}>{event.venue}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span style={{ fontWeight: 500 }}>{event.doors.split('·')[0].trim()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <span style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 22, color: SP_C.navy, letterSpacing: '-0.02em' }}>{event.price}</span>
                <span style={{ fontSize: 13, color: SP_C.slate500, fontWeight: 600 }}>RON</span>
              </div>
            </div>
            <button style={{
              padding: '11px 14px', borderRadius: 12, border: 0, cursor: 'pointer',
              background: `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`,
              color: 'white', fontWeight: 700, fontSize: 13, fontFamily: SP_FONT,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              boxShadow: '0 6px 18px rgba(0,159,227,0.30)'
            }}>
              Cumpără
              <Icon name="arrow-right" size={14} color="white" stroke={2.2} />
            </button>
          </div>
        </div>

        {/* Section */}
        <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: SP_C.navy, letterSpacing: '-0.01em' }}>Biletele tale</div>
          <button onClick={onOpenTicket} style={{
            background: 'none', border: 0, color: accent, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 3
          }}>Vezi toate <Icon name="chevron-right" size={14} color={accent} /></button>
        </div>

        {/* Ticket preview row */}
        <div onClick={onOpenTicket} style={{
          marginTop: 12, background: 'white', borderRadius: 20,
          border: '1px solid ' + SP_C.slate200, padding: 14, display: 'flex', gap: 12, alignItems: 'center',
          cursor: 'pointer'
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
            background: `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`
          }}>
            {showPhoto && <img src={event.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: SP_C.navy, marginBottom: 2 }}>{event.title}</div>
            <div style={{ fontSize: 12, color: SP_C.slate500 }}>{event.dateLabel} · 1 bilet</div>
          </div>
          <Chip tone="success">Valid</Chip>
        </div>

        {/* Scroll affordance */}
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: SP_C.slate400 }}>
          <Icon name="chevron-down" size={18} color={SP_C.slate400} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em' }}>DERULEAZĂ</span>
        </div>

        {/* Past events */}
        <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: SP_C.navy, letterSpacing: '-0.01em' }}>Evenimente trecute</div>
            <div style={{ fontSize: 12, color: SP_C.slate500, marginTop: 2 }}>
              {pastEvents.length} arhivate · {totalSold} oameni
            </div>
          </div>
          <button style={{
            background: 'none', border: 0, color: accent, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 3
          }}>Toate <Icon name="chevron-right" size={14} color={accent} /></button>
        </div>

        {/* Past event cards */}
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pastEvents.map((p) => <PastEventRow key={p.id} event={p} />)}
        </div>

        {/* Photo album promo */}
        <div style={{
          marginTop: 18, background: 'white', borderRadius: 20, border: '1px solid ' + SP_C.slate200,
          padding: 16, display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer'
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: SP_C.cyan50,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="images" size={22} color={accent} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: SP_C.navy }}>Albume foto</div>
            <div style={{ fontSize: 12, color: SP_C.slate500 }}>Pozele de la evenimentele trecute</div>
          </div>
          <Icon name="chevron-right" size={18} color={SP_C.slate400} />
        </div>

        {/* About Interact (moved to end) */}
        <div style={{
          marginTop: 14, background: 'white', borderRadius: 20, border: '1px solid ' + SP_C.slate200,
          padding: 16, display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer'
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, overflow: 'hidden', background: 'white',
            border: '1px solid ' + SP_C.slate200,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <img src="assets/logo-wordmark.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: SP_C.navy }}>Despre Interact</div>
            <div style={{ fontSize: 12, color: SP_C.slate500 }}>Cine suntem și ce facem</div>
          </div>
          <Icon name="chevron-right" size={18} color={SP_C.slate400} />
        </div>

        <div style={{ marginTop: 22, textAlign: 'center', fontFamily: SP_SERIF, fontStyle: 'italic', fontSize: 13, color: SP_C.slate400 }}>
          Interact Sf. Sava · Curtea Veche · Buc.
        </div>
      </div>

      {/* Bottom nav */}
      <BottomNav active="home" />
    </div>);

}

// Past-event row — poster thumb left, stats right
function PastEventRow({ event }) {
  const conv = Math.round(event.checkedIn / event.sold * 100);
  const accent = event.accent;
  return (
    <div style={{
      background: 'white', borderRadius: 18, overflow: 'hidden',
      border: '1px solid ' + SP_C.slate200,
      display: 'flex', cursor: 'pointer',
      boxShadow: '0 2px 8px -2px rgba(15,23,42,0.05)'
    }}>
      <div style={{ width: 96, flexShrink: 0, position: 'relative', background: SP_C.slate100 }}>
        <img src={event.photo} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'
        }} />
      </div>
      <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: '0.12em' }}>
          {event.eyebrow}
        </div>
        <div style={{
          fontFamily: SP_FONT, fontWeight: 800, fontSize: 15, color: SP_C.navy,
          letterSpacing: '-0.01em', marginTop: 3, lineHeight: 1.15
        }}>{event.title}</div>
        <div style={{ fontSize: 11, color: SP_C.slate500, marginTop: 3 }}>{event.dateLabel}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: SP_C.slate600, fontWeight: 600 }}>
            <Icon name="users" size={11} color={SP_C.slate500} />
            {event.sold}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: SP_C.slate600, fontWeight: 600 }}>
            <Icon name="check" size={11} color={SP_C.success} stroke={2.4} />
            {conv}%
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: SP_C.slate500,
            background: SP_C.slate100, padding: '3px 7px', borderRadius: 999, letterSpacing: '0.06em'
          }}>SOLD OUT</span>
        </div>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────
// 2) EVENT DETAILS
// ─────────────────────────────────────────────────────────
function EventScreen({ event, onBack, onBuy, accent, showPhoto = true }) {
  const [qty, setQty] = React.useState(1);
  const total = qty * event.price;
  return (
    <div style={{ height: '100%', background: SP_C.slate50, position: 'relative', overflow: 'auto' }}>
      {/* Hero image (full bleed top) */}
      <div style={{ position: 'relative', aspectRatio: event.photoAspect || '3 / 4', width: '100%', background: SP_C.navy }}>
        {showPhoto ?
        <img src={event.photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> :

        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, #0F172A 0%, #1E3A8A 100%)` }} />
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,23,42,0.4) 0%, rgba(15,23,42,0) 30%, rgba(15,23,42,0.7) 100%)' }} />
        {/* back + share buttons */}
        <div style={{ position: 'absolute', top: 64, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{
            width: 40, height: 40, borderRadius: 999, border: 0, background: 'rgba(255,255,255,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(15,23,42,0.2)'
          }}>
            <Icon name="chevron-left" size={20} color={SP_C.navy} />
          </button>
          <button style={{
            width: 40, height: 40, borderRadius: 999, border: 0, background: 'rgba(255,255,255,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(15,23,42,0.2)'
          }}>
            <Icon name="share" size={18} color={SP_C.navy} />
          </button>
        </div>
        {/* date floating chip */}
        <div style={{ position: 'absolute', bottom: 32, left: 20 }}>
          <Chip tone="dark" dot={false}>{event.eyebrow}</Chip>
        </div>
      </div>

      {/* Sheet content */}
      <div style={{
        background: SP_C.slate50, marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        position: 'relative', paddingBottom: 120, paddingTop: 24, padding: '24px 20px 120px'
      }}>
        <div style={{
          fontFamily: SP_FONT, fontWeight: 800, fontSize: 30, color: SP_C.navy,
          letterSpacing: '-0.025em', lineHeight: 1.05
        }}>{event.title}</div>
        <div style={{ fontFamily: SP_SERIF, fontStyle: 'italic', fontSize: 16, color: SP_C.slate600, marginTop: 6 }}>
          {event.subtitle}
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
          <InfoCell icon="calendar" label="Data" value={event.dateLong} sub={event.doors} accent={accent} />
          <InfoCell icon="map-pin" label="Locul" value={event.venue} sub={event.venueLine} accent={accent} />
        </div>

        {/* About */}
        <div style={{ marginTop: 22 }}>
          <Eyebrow color={accent}>DESPRE EVENIMENT</Eyebrow>
          <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.55, color: SP_C.slate700, textWrap: 'pretty' }}>
            {event.about}
          </p>
        </div>

        {/* Program */}
        <div style={{ marginTop: 22 }}>
          <Eyebrow color={accent}>PROGRAMUL SERII</Eyebrow>
          <div style={{ marginTop: 10, background: 'white', borderRadius: 20, border: '1px solid ' + SP_C.slate200, overflow: 'hidden' }}>
            {event.program.map((p, i) =>
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
              borderBottom: i < event.program.length - 1 ? '1px solid ' + SP_C.slate100 : 'none'
            }}>
                <div style={{
                fontFamily: SP_MONO, fontSize: 13, fontWeight: 600, color: accent, width: 44, flexShrink: 0
              }}>{p.t}</div>
                <div style={{ fontSize: 14, color: SP_C.navy, fontWeight: 500 }}>{p.l}</div>
              </div>
            )}
          </div>
        </div>

        {/* Includes */}
        <div style={{ marginTop: 22 }}>
          <Eyebrow color={accent}>BILETUL INCLUDE</Eyebrow>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {event.perks.map((p, i) =>
            <span key={i} style={{
              padding: '8px 14px', background: 'white', borderRadius: 999, border: '1px solid ' + SP_C.slate200,
              fontSize: 13, fontWeight: 500, color: SP_C.slate700
            }}>{p}</span>
            )}
          </div>
        </div>

        {/* Organizer */}
        <div style={{
          marginTop: 22, background: 'white', borderRadius: 20, border: '1px solid ' + SP_C.slate200,
          padding: 16, display: 'flex', alignItems: 'center', gap: 12
        }}>
          <img src="assets/logo-wordmark.jpg" alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', background: 'white' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: SP_C.slate500, fontWeight: 600 }}>ORGANIZATOR</div>
            <div style={{ fontWeight: 700, color: SP_C.navy, fontSize: 14 }}>Interact Sf. Sava · Curtea Veche</div>
          </div>
        </div>
      </div>

      {/* Fixed CTA bar */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '14px 20px 28px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid ' + SP_C.slate200, display: 'flex', gap: 12, alignItems: 'center', zIndex: 20
      }}>
        {/* Qty stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid ' + SP_C.slate200, borderRadius: 14, background: 'white' }}>
          <button onClick={() => setQty(Math.max(1, qty - 1))} style={stepBtn}>
            <Icon name="minus" size={16} color={SP_C.navy} />
          </button>
          <div style={{ minWidth: 26, textAlign: 'center', fontWeight: 700, color: SP_C.navy }}>{qty}</div>
          <button onClick={() => setQty(qty + 1)} style={stepBtn}>
            <Icon name="plus" size={16} color={SP_C.navy} />
          </button>
        </div>
        <button onClick={onBuy} style={{
          flex: 1, padding: '14px 18px', borderRadius: 14, border: 0, cursor: 'pointer',
          background: `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`,
          color: 'white', fontWeight: 700, fontSize: 15, fontFamily: SP_FONT,
          boxShadow: '0 12px 30px rgba(0,159,227,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}>
          Cumpără bilet · {total} RON
        </button>
      </div>
    </div>);

}

const stepBtn = {
  width: 38, height: 44, border: 0, background: 'transparent', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};

function InfoCell({ icon, label, value, sub, accent }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 14, border: '1px solid ' + SP_C.slate200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon name={icon} size={16} color={accent} />
        <span style={{ fontSize: 11, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: SP_C.navy, lineHeight: 1.25 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: SP_C.slate500, marginTop: 2 }}>{sub}</div>}
    </div>);

}

// ─────────────────────────────────────────────────────────
// 3) CHECKOUT
// ─────────────────────────────────────────────────────────
function CheckoutScreen({ event, onBack, onPay, accent }) {
  const [email, setEmail] = React.useState('ana.v@savaapp.ro');
  const [name, setName] = React.useState('Ana Vasilescu');
  const [card, setCard] = React.useState('4242 4242 4242 4242');
  const [exp, setExp] = React.useState('12 / 27');
  const [cvc, setCvc] = React.useState('123');
  const [loading, setLoading] = React.useState(false);

  const pay = () => {
    setLoading(true);
    setTimeout(() => {setLoading(false);onPay && onPay();}, 950);
  };

  return (
    <div style={{ height: '100%', background: SP_C.slate50, position: 'relative', overflow: 'auto', paddingBottom: 110 }}>
      {/* Top bar */}
      <div style={{
        paddingTop: 54, padding: '54px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'white', borderBottom: '1px solid ' + SP_C.slate100
      }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: 999, border: 0, background: SP_C.slate100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}>
          <Icon name="x" size={20} color={SP_C.navy} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 16, color: SP_C.navy }}>Plată</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: SP_C.slate100, borderRadius: 999 }}>
          <Icon name="lock" size={12} color={SP_C.slate600} />
          <span style={{ fontSize: 11, fontWeight: 600, color: SP_C.slate600 }}>Securizat</span>
        </div>
      </div>
      <div style={{ height: 14, background: 'white' }} />

      <div style={{ padding: '0 20px' }}>
        {/* Order card */}
        <div style={{
          background: 'white', borderRadius: 20, border: '1px solid ' + SP_C.slate200,
          padding: 16, display: 'flex', gap: 14, alignItems: 'center'
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
            background: `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <img src={event.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: SP_C.navy }}>{event.title}</div>
            <div style={{ fontSize: 12, color: SP_C.slate500, marginTop: 2 }}>{event.dateLabel} · 1 bilet</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, color: SP_C.navy, fontFamily: SP_FONT }}>{event.price} RON</div>
        </div>

        {/* Email */}
        <div style={{ marginTop: 18 }}>
          <Eyebrow color={accent}>CONTACT</Eyebrow>
          <div style={{ marginTop: 8 }}>
            <Field label="Email" value={email} onChange={setEmail} placeholder="ana@example.com" />
            <div style={{ fontSize: 11, color: SP_C.slate500, marginTop: 6, paddingLeft: 4 }}>
              Aici îți trimitem chitanța și QR-ul.
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{ marginTop: 18 }}>
          <Eyebrow color={accent}>METODA DE PLATĂ</Eyebrow>
          {/* Method tabs */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 10 }}>
            <MethodTab active label="Card" icon="credit-card" accent={accent} />
            <MethodTab label="Apple Pay" icon="apple" />
            <MethodTab label="Revolut" icon="smartphone" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label="Numele de pe card" value={name} onChange={setName} />
            <Field label="Numărul cardului" value={card} onChange={setCard} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Expiră" value={exp} onChange={setExp} />
              <Field label="CVC" value={cvc} onChange={setCvc} />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ marginTop: 22, background: 'white', borderRadius: 20, border: '1px solid ' + SP_C.slate200, padding: 16 }}>
          <Row k="1 × Bilet acces" v={`${event.price} RON`} />
          <Row k="Comision platformă" v="0 RON" sub />
          <div style={{ height: 1, background: SP_C.slate100, margin: '12px 0' }} />
          <Row k="Total" v={`${event.price} RON`} bold />
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: SP_C.slate500, textAlign: 'center', lineHeight: 1.5 }}>
          Continuând, ești de acord cu <span style={{ color: accent, fontWeight: 600 }}>termenii</span> și <span style={{ color: accent, fontWeight: 600 }}>politica de confidențialitate</span>.
        </div>
      </div>

      {/* Fixed CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '14px 20px 28px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid ' + SP_C.slate200, zIndex: 20
      }}>
        <button onClick={pay} disabled={loading} style={{
          width: '100%', padding: '15px 18px', borderRadius: 14, border: 0, cursor: loading ? 'wait' : 'pointer',
          background: loading ? SP_C.slate600 : `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`,
          color: 'white', fontWeight: 700, fontSize: 15, fontFamily: SP_FONT,
          boxShadow: '0 12px 30px rgba(0,159,227,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
        }}>
          {loading ?
          <>
              <Spinner /> Se procesează…
            </> :

          <>
              <Icon name="lock" size={16} color="white" /> Plătește {event.price} RON
            </>
          }
        </button>
      </div>
    </div>);

}

function MethodTab({ active, label, icon, accent }) {
  return (
    <button style={{
      flex: 1, padding: '10px 8px', borderRadius: 12,
      background: active ? 'white' : SP_C.slate100,
      border: active ? `1.5px solid ${accent}` : '1px solid transparent',
      color: active ? SP_C.navy : SP_C.slate600,
      fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: SP_FONT,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      boxShadow: active ? `0 0 0 3px ${SP_C.cyan100}` : 'none'
    }}>
      <Icon name={icon} size={14} color={active ? accent : SP_C.slate500} />
      {label}
    </button>);

}

function Row({ k, v, sub, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: sub ? 4 : 6 }}>
      <span style={{ color: bold ? SP_C.navy : SP_C.slate600, fontWeight: bold ? 700 : 500, fontSize: bold ? 15 : 13 }}>{k}</span>
      <span style={{ color: bold ? SP_C.navy : sub ? SP_C.success : SP_C.navy, fontWeight: bold ? 800 : 600, fontSize: bold ? 17 : 13, fontFamily: SP_FONT }}>{v}</span>
    </div>);

}

function Spinner() {
  return (
    <span style={{
      width: 16, height: 16, borderRadius: 999,
      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
      display: 'inline-block', animation: 'sp-spin 0.8s linear infinite'
    }} />);

}

// ─────────────────────────────────────────────────────────
// 4) SUCCESS
// ─────────────────────────────────────────────────────────
function SuccessScreen({ event, onSeeTicket, onHome, accent }) {
  return (
    <div style={{ height: '100%', background: SP_C.slate50, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 28px 20px', textAlign: 'center' }}>
        {/* Success ring */}
        <div style={{
          width: 96, height: 96, borderRadius: 999,
          background: SP_C.successBg ?? '#DCFCE7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 0 12px rgba(22,163,74,0.10)`,
          animation: 'sp-pop 380ms cubic-bezier(.22,1.4,.36,1)'
        }}>
          <Icon name="check" size={48} color={SP_C.success} stroke={2.4} />
        </div>

        <div style={{
          fontFamily: SP_SERIF, fontStyle: 'italic', fontSize: 44, color: SP_C.navy,
          letterSpacing: '-0.01em', marginTop: 28, lineHeight: 1.05
        }}>Ești înăuntru.</div>

        <div style={{ fontSize: 15, color: SP_C.slate600, marginTop: 12, maxWidth: 280, lineHeight: 1.5 }}>
          Ți-am trimis biletul la <span style={{ color: SP_C.navy, fontWeight: 600 }}>ana.v@savaapp.ro</span>.
          Îl găsești și în <span style={{ color: SP_C.navy, fontWeight: 600 }}>Biletele tale</span>.
        </div>

        {/* Mini ticket */}
        <div style={{
          marginTop: 32, width: '100%', maxWidth: 320, borderRadius: 20, overflow: 'hidden',
          background: 'white', border: '1px solid ' + SP_C.slate200,
          boxShadow: '0 24px 60px -20px rgba(15,23,42,0.20)'
        }}>
          <div style={{
            padding: 16, color: 'white',
            background: `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.85 }}>BILETUL TĂU</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginTop: 4, letterSpacing: '-0.01em' }}>{event.title}</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{event.dateLabel} · {event.venue}</div>
          </div>
          {/* perforation */}
          <div style={{ position: 'relative', height: 14, background: 'white' }}>
            <Notch side="left" />
            <Notch side="right" />
            <div style={{ position: 'absolute', top: 6, left: 18, right: 18, height: 2, borderTop: '1px dashed ' + SP_C.slate300 }} />
          </div>
          <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: SP_C.slate500, fontWeight: 600 }}>COD</div>
              <div style={{ fontFamily: SP_MONO, fontWeight: 600, color: SP_C.navy, fontSize: 13, marginTop: 2 }}>SP-2611-AV</div>
            </div>
            <Chip tone="success">Valid</Chip>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button variant="primary" full onClick={onSeeTicket}>Vezi biletul</Button>
        <Button variant="ghost" full onClick={onHome}>Înapoi la Acasă</Button>
      </div>
    </div>);

}

function Notch({ side }) {
  return (
    <div style={{
      position: 'absolute', top: -7, [side]: -7, width: 14, height: 14,
      borderRadius: 999, background: SP_C.slate50
    }} />);

}

// ─────────────────────────────────────────────────────────
// 5) TICKET / PASS
// ─────────────────────────────────────────────────────────
function TicketScreen({ event, onBack, accent, style = 'wallet' }) {
  return (
    <div style={{ height: '100%', background: SP_C.slate50, overflow: 'auto', paddingBottom: 100, position: 'relative' }}>
      {/* Top bar */}
      <div style={{ paddingTop: 56, padding: '56px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: 999, border: 0, background: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(15,23,42,0.06)'
        }}>
          <Icon name="chevron-left" size={20} color={SP_C.navy} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 15, color: SP_C.navy }}>Biletul tău</div>
        <button style={{
          width: 38, height: 38, borderRadius: 999, border: 0, background: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(15,23,42,0.06)'
        }}>
          <Icon name="share" size={18} color={SP_C.navy} />
        </button>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {style === 'wallet' && <WalletTicket event={event} accent={accent} />}
        {style === 'minimal' && <MinimalTicket event={event} accent={accent} />}
        {style === 'boarding' && <BoardingTicket event={event} accent={accent} />}

        {/* Add to wallet */}
        <button style={{
          marginTop: 20, width: '100%', padding: '14px', borderRadius: 14, border: 0,
          background: SP_C.navy, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: SP_FONT
        }}>
          <Icon name="wallet" size={18} color="white" />
          Adaugă în Apple Wallet
        </button>

        {/* Detail rows */}
        <div style={{ marginTop: 16, background: 'white', borderRadius: 20, border: '1px solid ' + SP_C.slate200, overflow: 'hidden' }}>
          <DetailRow k="Titular" v="Ana Vasilescu" />
          <DetailRow k="Email" v="ana.v@savaapp.ro" />
          <DetailRow k="Comandă" v="ORD-2611-3F8A" mono />
          <DetailRow k="Achitat" v="14 Nov · 14:22" />
          <DetailRow k="Total" v="45 RON" bold last />
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: SP_C.slate500, textAlign: 'center', lineHeight: 1.5 }}>
          Arată QR-ul la intrare. Un bilet, o singură folosire.
        </div>
      </div>

      <BottomNav active="ticket" />
    </div>);

}

function WalletTicket({ event, accent }) {
  return (
    <div style={{ borderRadius: 28, overflow: 'hidden', boxShadow: '0 24px 60px -20px rgba(15,23,42,0.30)' }}>
      {/* Top hero band */}
      <div style={{
        padding: 22, color: 'white', position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`
      }}>
        {/* gear watermark */}
        <Gear style={{ position: 'absolute', right: -20, top: -20, opacity: 0.18 }} size={180} color="white" />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.9 }}>SAVAPASS · BILET</div>
          <div style={{ fontFamily: SP_SERIF, fontStyle: 'italic', fontSize: 14, opacity: 0.85, marginTop: 18 }}>by Interact Sf. Sava</div>
          <div style={{ fontWeight: 800, fontSize: 28, marginTop: 4, letterSpacing: '-0.02em' }}>{event.title}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
            <Stat label="DATA" value={event.dateLabel} />
            <Stat label="LOCUL" value={event.venue} />
          </div>
        </div>
      </div>
      {/* perforation */}
      <div style={{ position: 'relative', height: 18, background: 'white' }}>
        <Notch side="left" />
        <Notch side="right" />
        <div style={{ position: 'absolute', top: 8, left: 22, right: 22, height: 2, borderTop: '1px dashed ' + SP_C.slate300 }} />
      </div>
      {/* QR */}
      <div style={{ background: 'white', padding: '8px 22px 22px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block', padding: 14, borderRadius: 16, background: 'white',
          border: '1px solid ' + SP_C.slate200
        }}>
          <QR size={170} seed="SP-2611-AV-ECHOES" />
        </div>
        <div style={{
          marginTop: 14, fontFamily: SP_MONO, fontWeight: 600, fontSize: 14,
          letterSpacing: '0.12em', color: SP_C.navy
        }}>SP-2611-AV</div>
        <div style={{ marginTop: 8 }}>
          <Chip tone="success">Valid · 1 din 1</Chip>
        </div>
      </div>
    </div>);

}

function MinimalTicket({ event, accent }) {
  return (
    <div style={{
      background: 'white', borderRadius: 28, padding: 24, border: '1px solid ' + SP_C.slate200,
      boxShadow: '0 24px 60px -20px rgba(15,23,42,0.20)'
    }}>
      <Eyebrow color={accent}>SAVAPASS · BILET</Eyebrow>
      <div style={{ fontWeight: 800, fontSize: 28, color: SP_C.navy, letterSpacing: '-0.02em', marginTop: 8, lineHeight: 1.05 }}>
        {event.title}
      </div>
      <div style={{ fontSize: 14, color: SP_C.slate500, marginTop: 4 }}>{event.dateLabel} · {event.venue}</div>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', padding: '24px 0', borderTop: '1px dashed ' + SP_C.slate300, borderBottom: '1px dashed ' + SP_C.slate300 }}>
        <QR size={190} seed="SP-2611-AV-ECHOES" />
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.06em' }}>COD</div>
          <div style={{ fontFamily: SP_MONO, fontWeight: 600, color: SP_C.navy, fontSize: 14, marginTop: 2 }}>SP-2611-AV</div>
        </div>
        <Chip tone="success">Valid</Chip>
      </div>
    </div>);

}

function BoardingTicket({ event, accent }) {
  return (
    <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 60px -20px rgba(15,23,42,0.25)', background: 'white' }}>
      {/* Header strip */}
      <div style={{
        background: SP_C.navy, color: 'white', padding: '18px 22px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <Logo size={20} dark />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', opacity: 0.7 }}>EVENT PASS</span>
      </div>
      {/* big route */}
      <div style={{ padding: '22px 22px 18px', display: 'flex', alignItems: 'flex-start', gap: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.06em' }}>EVENIMENT</div>
          <div style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 32, color: SP_C.navy, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 4 }}>
            ECH
          </div>
          <div style={{ fontSize: 12, color: SP_C.slate500, marginTop: 2 }}>Echoes Unplugged</div>
        </div>
        <div style={{ marginTop: 22, color: accent }}>
          <Icon name="arrow-right" size={28} color={accent} stroke={2.4} />
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.06em' }}>LOC</div>
          <div style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 32, color: SP_C.navy, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 4 }}>
            CRT
          </div>
          <div style={{ fontSize: 12, color: SP_C.slate500, marginTop: 2 }}>Curtea Veche</div>
        </div>
      </div>
      {/* stripe */}
      <div style={{ height: 1, background: SP_C.slate200 }} />
      <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <SmallStat label="DATA" value="14 NOV" />
        <SmallStat label="ORA" value="19:00" />
        <SmallStat label="LOC" value="GEN" />
      </div>
      {/* perforation w stub */}
      <div style={{ position: 'relative', height: 16 }}>
        <Notch side="left" />
        <Notch side="right" />
        <div style={{ position: 'absolute', top: 7, left: 22, right: 22, height: 2, borderTop: '1px dashed ' + SP_C.slate300 }} />
      </div>
      <div style={{ display: 'flex', gap: 16, padding: '14px 22px 22px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.06em' }}>PASAGER</div>
          <div style={{ fontWeight: 700, color: SP_C.navy, fontSize: 14, marginTop: 2 }}>Ana Vasilescu</div>
          <div style={{ fontFamily: SP_MONO, fontSize: 12, color: SP_C.slate500, marginTop: 10, letterSpacing: '0.08em' }}>SP-2611-AV</div>
          <div style={{ marginTop: 10 }}><Chip tone="success">Valid · 1 din 1</Chip></div>
        </div>
        <QR size={120} seed="SP-2611-AV-ECHOES" />
      </div>
    </div>);

}

function Stat({ label, value }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>{value}</div>
    </div>);

}

function SmallStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.14em' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: SP_C.navy, marginTop: 3 }}>{value}</div>
    </div>);

}

function DetailRow({ k, v, mono, bold, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px',
      borderBottom: last ? 'none' : '1px solid ' + SP_C.slate100
    }}>
      <span style={{ color: SP_C.slate500, fontSize: 13, fontWeight: 500 }}>{k}</span>
      <span style={{
        color: SP_C.navy, fontWeight: bold ? 800 : 600, fontSize: bold ? 15 : 13,
        fontFamily: mono ? SP_MONO : SP_FONT
      }}>{v}</span>
    </div>);

}

function Gear({ size = 80, color = SP_C.cyan, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <circle cx="50" cy="50" r="14" fill="none" stroke={color} strokeWidth="6" />
      {[...Array(8)].map((_, i) => {
        const a = i / 8 * Math.PI * 2;
        const x1 = 50 + Math.cos(a) * 26;
        const y1 = 50 + Math.sin(a) * 26;
        const x2 = 50 + Math.cos(a) * 42;
        const y2 = 50 + Math.sin(a) * 42;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="9" strokeLinecap="round" />;
      })}
    </svg>);

}

// ─────────────────────────────────────────────────────────
// 6) SCANNER (organizer)
// ─────────────────────────────────────────────────────────
function ScannerScreen({ event, onBack, accent }) {
  const [lastScan, setLastScan] = React.useState({
    kind: 'ok', name: 'Elena Dumitrescu', id: 'SP-2611-ED', t: '19:45'
  });
  const [pulse, setPulse] = React.useState(0);

  const fakeScan = (kind) => {
    setPulse((p) => p + 1);
    if (kind === 'ok') {
      setLastScan({ kind: 'ok', name: 'Maria Stoica', id: 'SP-2611-MS', t: 'acum' });
    } else if (kind === 'used') {
      setLastScan({ kind: 'used', name: 'Andrei Lupu', id: 'SP-2611-AL', t: 'folosit · 19:01' });
    } else {
      setLastScan({ kind: 'err', name: 'Bilet necunoscut', id: '—', t: 'acum' });
    }
  };

  const ringColor = lastScan.kind === 'ok' ? SP_C.success : lastScan.kind === 'used' ? SP_C.warning : SP_C.danger;

  return (
    <div style={{ height: '100%', background: '#0B1220', color: 'white', position: 'relative', overflow: 'hidden' }}>
      {/* Top header */}
      <div style={{ paddingTop: 56, padding: '56px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: 999, border: 0, background: 'rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}>
          <Icon name="chevron-left" size={20} color="white" />
        </button>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.55, letterSpacing: '0.14em', textAlign: 'center' }}>ORGANIZATOR</div>
          <div style={{ fontWeight: 700, fontSize: 15, textAlign: 'center', marginTop: 2 }}>Scanare intrare</div>
        </div>
        <button style={{
          width: 38, height: 38, borderRadius: 999, border: 0, background: 'rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}>
          <Icon name="zap-off" size={18} color="white" />
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 20px 0' }}>
        <ScanStat label="SCANATE" value={`${event.checkedIn + 27}`} total={`/ ${event.sold}`} />
        <ScanStat label="VÂNDUTE" value={`${event.sold}`} />
        <ScanStat label="CAPACITATE" value={`${event.capacity}`} />
      </div>

      {/* Viewfinder */}
      <div style={{ padding: '24px 32px 0' }}>
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 28, overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 50%, #0F1A30 0%, #050912 100%)'
        }}>
          {/* simulated camera grain */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '3px 3px', opacity: 0.5
          }} />
          {/* faux QR target in middle */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            opacity: 0.25
          }}>
            <QR size={160} seed={'scanner-' + pulse} />
          </div>
          {/* corner brackets */}
          {['tl', 'tr', 'bl', 'br'].map((c) =>
          <Corner key={c} c={c} color={accent} pulse={pulse} />
          )}
          {/* scanning line */}
          <div style={{
            position: 'absolute', left: '12%', right: '12%', height: 2,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            top: '50%', boxShadow: `0 0 12px ${accent}`,
            animation: 'sp-scan 2s ease-in-out infinite'
          }} />
          {/* ring on successful scan */}
          {pulse > 0 &&
          <div key={pulse} style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 80, height: 80, borderRadius: 999,
            border: `3px solid ${ringColor}`,
            animation: 'sp-ring 380ms cubic-bezier(.22,1,.36,1)'
          }} />
          }
        </div>
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, opacity: 0.7 }}>
          Aliniază codul QR în cadru
        </div>
      </div>

      {/* Last scan card */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 96 }}>
        <LastScanCard scan={lastScan} accent={accent} />
      </div>

      {/* Demo buttons (in real app these are camera-driven) */}
      <div style={{
        position: 'absolute', left: 20, right: 20, bottom: 26, display: 'flex', gap: 8
      }}>
        <DemoBtn label="✓ Valid" onClick={() => fakeScan('ok')} bg={SP_C.success} />
        <DemoBtn label="↻ Folosit" onClick={() => fakeScan('used')} bg={SP_C.warning} />
        <DemoBtn label="✕ Eroare" onClick={() => fakeScan('err')} bg={SP_C.danger} />
      </div>
    </div>);

}

function DemoBtn({ label, onClick, bg }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '10px 8px', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: SP_FONT,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: bg }} />
      {label}
    </button>);

}

function Corner({ c, color, pulse }) {
  const base = { position: 'absolute', width: 36, height: 36, borderColor: color, borderStyle: 'solid' };
  const map = {
    tl: { top: '10%', left: '10%', borderWidth: '3px 0 0 3px', borderTopLeftRadius: 14 },
    tr: { top: '10%', right: '10%', borderWidth: '3px 3px 0 0', borderTopRightRadius: 14 },
    bl: { bottom: '10%', left: '10%', borderWidth: '0 0 3px 3px', borderBottomLeftRadius: 14 },
    br: { bottom: '10%', right: '10%', borderWidth: '0 3px 3px 0', borderBottomRightRadius: 14 }
  };
  return <div style={{ ...base, ...map[c], transition: 'all 200ms cubic-bezier(.22,1,.36,1)', filter: pulse ? `drop-shadow(0 0 8px ${color})` : 'none' }} />;
}

function ScanStat({ label, value, total }) {
  return (
    <div style={{
      flex: 1, padding: '10px 12px', borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.55 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
        <span style={{ fontWeight: 800, fontSize: 22, fontFamily: SP_FONT }}>{value}</span>
        {total && <span style={{ fontSize: 12, opacity: 0.5 }}>{total}</span>}
      </div>
    </div>);

}

function LastScanCard({ scan, accent }) {
  const config = {
    ok: { bg: 'rgba(22,163,74,0.16)', border: 'rgba(22,163,74,0.4)', icon: 'check-circle-2', dot: SP_C.success, label: 'INTRARE CONFIRMATĂ' },
    used: { bg: 'rgba(245,158,11,0.16)', border: 'rgba(245,158,11,0.4)', icon: 'alert-triangle', dot: SP_C.warning, label: 'BILET DEJA FOLOSIT' },
    err: { bg: 'rgba(220,38,38,0.16)', border: 'rgba(220,38,38,0.4)', icon: 'x-circle', dot: SP_C.danger, label: 'EROARE — BILET INVALID' }
  }[scan.kind];
  return (
    <div style={{
      padding: 14, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 12,
      background: config.bg, border: `1px solid ${config.border}`,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)'
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 999, background: config.dot,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon name={config.icon} size={22} color="white" stroke={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: config.dot }}>{config.label}</div>
        <div style={{ fontWeight: 700, color: 'white', fontSize: 15, marginTop: 2 }}>{scan.name}</div>
        <div style={{ fontFamily: SP_MONO, fontSize: 11, opacity: 0.7, marginTop: 2 }}>{scan.id} · {scan.t}</div>
      </div>
    </div>);

}

Object.assign(window, {
  PhoneShell, PhoneStatusBar, Gear, Notch,
  HomeScreen, EventScreen, CheckoutScreen, SuccessScreen, TicketScreen, ScannerScreen
});