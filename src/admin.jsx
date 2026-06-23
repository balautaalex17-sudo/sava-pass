// admin.jsx — SavaPass admin desktop dashboard
// 1200×820, sidebar + main, stats + chart + attendees table + scan log

function AdminDashboard({ event, accent }) {
  const [tab, setTab] = React.useState('overview');
  const [filter, setFilter] = React.useState('toate');
  const attendees = window.SP_ATTENDEES;
  const revenue = window.SP_REVENUE;
  const scans = window.SP_SCANS;

  const totalRev = event.sold * event.price;
  const conv = Math.round((event.sold / event.capacity) * 100);
  const checkedIn = scans.filter(s => s.ok).length;

  return (
    <div style={{
      width: 1280, height: 860, background: '#FAFBFC',
      display: 'flex', fontFamily: SP_FONT, color: SP_C.navy,
      borderRadius: 18, overflow: 'hidden',
      boxShadow: '0 24px 60px -20px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.06)',
    }}>
      {/* Sidebar */}
      <div style={{
        width: 252, background: 'white', borderRight: '1px solid ' + SP_C.slate100,
        display: 'flex', flexDirection: 'column', padding: '22px 16px',
      }}>
        <div style={{ padding: '0 8px 18px' }}>
          <Logo size={24} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 8 }}>
          <NavItem icon="layout-dashboard" label="Tablou de bord"     active={tab === 'overview'} accent={accent} onClick={() => setTab('overview')} />
          <NavItem icon="calendar"         label="Evenimente"          badge="1" accent={accent} />
          <NavItem icon="users"            label="Participanți"        badge={event.sold} accent={accent} />
          <NavItem icon="qr-code"          label="Scanări"             accent={accent} />
          <NavItem icon="bar-chart-3"      label="Rapoarte"            accent={accent} />
        </div>

        <div style={{
          marginTop: 'auto', padding: 14, background: SP_C.cyan50, borderRadius: 14,
          border: '1px solid ' + SP_C.cyan100,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: '0.14em' }}>EVENIMENT ACTIV</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: SP_C.navy, marginTop: 4, lineHeight: 1.25 }}>{event.title}</div>
          <div style={{ fontSize: 11, color: SP_C.slate500, marginTop: 2 }}>{event.dateLabel}</div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: SP_C.slate600, fontWeight: 600 }}>
            <span>{event.sold}/{event.capacity} bilete</span>
            <span style={{ color: accent }}>{conv}%</span>
          </div>
          <div style={{ marginTop: 6, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.7)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${conv}%`, background: accent, borderRadius: 999 }} />
          </div>
        </div>

        <div style={{ marginTop: 14, padding: 10, display: 'flex', gap: 10, alignItems: 'center', borderRadius: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 999,
            background: `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`,
            color: 'white', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>MA</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: SP_C.navy }}>Maria Anton</div>
            <div style={{ fontSize: 10, color: SP_C.slate500 }}>Admin · Interact</div>
          </div>
          <Icon name="settings" size={16} color={SP_C.slate400} />
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid ' + SP_C.slate100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white',
        }}>
          <div>
            <div style={{ fontSize: 11, color: SP_C.slate500, fontWeight: 700, letterSpacing: '0.14em' }}>TABLOUL DE BORD</div>
            <div style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 22, color: SP_C.navy, letterSpacing: '-0.02em', marginTop: 2 }}>{event.title}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ToolBtn icon="download" label="Export CSV" />
            <ToolBtn icon="mail" label="Trimite update" />
            <button style={{
              padding: '9px 14px', borderRadius: 12, border: 0, fontFamily: SP_FONT, fontWeight: 700, fontSize: 13,
              background: `linear-gradient(135deg, ${accent} 0%, #2563EB 100%)`, color: 'white', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 8px 20px rgba(0,159,227,0.30)',
            }}>
              <Icon name="plus" size={15} color="white" />
              Eveniment nou
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <StatCard accent={accent} icon="ticket"   label="Bilete vândute"  value={event.sold}      delta="+12 azi"   total={`/ ${event.capacity}`} />
            <StatCard accent={SP_C.success} icon="banknote"  label="Venit"  value={`${totalRev.toLocaleString('ro')} RON`} delta="+540 RON azi" />
            <StatCard accent="#2563EB" icon="user-check" label="Check-in" value={checkedIn}      delta={`${Math.round((checkedIn / event.sold) * 100)}% sosiți`} total={`/ ${event.sold}`} />
            <StatCard accent="#F59E0B" icon="trending-up" label="Conversie" value={`${conv}%`} delta="locuri ocupate" />
          </div>

          {/* Chart + side stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 16 }}>
            <RevenueChart data={revenue} accent={accent} totalRev={totalRev} />
            <CheckInDial checkedIn={checkedIn} sold={event.sold} accent={accent} />
          </div>

          {/* Attendees + scan log */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginTop: 16 }}>
            <AttendeesTable attendees={attendees} accent={accent} filter={filter} setFilter={setFilter} />
            <ScanLog scans={scans} accent={accent} />
          </div>

          {/* Past events */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: SP_C.navy, marginBottom: 12, letterSpacing: '-0.01em' }}>Evenimente trecute</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <PastEventCard event={SP_EVENTS.easter} />
              <PastEventCard event={SP_EVENTS.cupids} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, badge, accent, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 10,
      background: active ? SP_C.cyan50 : 'transparent', border: 0, cursor: 'pointer',
      color: active ? accent : SP_C.slate600, fontWeight: active ? 700 : 500, fontSize: 13,
      fontFamily: SP_FONT, textAlign: 'left', width: '100%',
    }}>
      <Icon name={icon} size={17} color={active ? accent : SP_C.slate500} stroke={active ? 2 : 1.75} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700,
          background: active ? 'white' : SP_C.slate100,
          color: active ? accent : SP_C.slate600,
        }}>{badge}</span>
      )}
    </button>
  );
}

function ToolBtn({ icon, label }) {
  return (
    <button style={{
      padding: '9px 12px', borderRadius: 12, border: '1px solid ' + SP_C.slate200,
      background: 'white', cursor: 'pointer', fontFamily: SP_FONT, fontWeight: 600, fontSize: 12,
      color: SP_C.slate700, display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      <Icon name={icon} size={14} color={SP_C.slate600} />
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, delta, total, accent }) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 18, border: '1px solid ' + SP_C.slate100,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: accent + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={16} color={accent} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
        <span style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 28, color: SP_C.navy, letterSpacing: '-0.025em' }}>{value}</span>
        {total && <span style={{ fontSize: 13, color: SP_C.slate400, fontWeight: 600 }}>{total}</span>}
      </div>
      <div style={{ fontSize: 12, color: SP_C.slate500, marginTop: 2 }}>
        <span style={{ color: accent, fontWeight: 600 }}>↗</span> {delta}
      </div>
    </div>
  );
}

function RevenueChart({ data, accent, totalRev }) {
  const max = Math.max(...data.map(d => d.v));
  const w = 660, h = 180, pad = { l: 36, r: 16, t: 18, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const x = (i) => pad.l + (i / (data.length - 1)) * innerW;
  const y = (v) => pad.t + innerH - (v / max) * innerH;

  // Build smooth line path
  const points = data.map((d, i) => [x(i), y(d.v)]);
  const linePath = points.reduce((acc, [px, py], i) => i === 0 ? `M${px},${py}` : `${acc} L${px},${py}`, '');
  const areaPath = `${linePath} L${x(data.length - 1)},${pad.t + innerH} L${x(0)},${pad.t + innerH} Z`;

  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 20, border: '1px solid ' + SP_C.slate100,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.06em' }}>VENITUL ULTIMELOR 14 ZILE</div>
          <div style={{ fontFamily: SP_FONT, fontWeight: 800, fontSize: 26, color: SP_C.navy, letterSpacing: '-0.025em', marginTop: 4 }}>
            {totalRev.toLocaleString('ro')} RON
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['7z', '14z', '30z'].map((t, i) => (
            <button key={t} style={{
              padding: '5px 10px', borderRadius: 7, border: 0, fontFamily: SP_FONT, fontWeight: 600, fontSize: 11,
              background: i === 1 ? SP_C.slate100 : 'transparent',
              color: i === 1 ? SP_C.navy : SP_C.slate500, cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block', marginTop: 8 }}>
        <defs>
          <linearGradient id="rev-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <g key={i}>
            <line x1={pad.l} y1={pad.t + p * innerH} x2={w - pad.r} y2={pad.t + p * innerH}
                  stroke={SP_C.slate100} strokeWidth={1} />
            <text x={pad.l - 8} y={pad.t + p * innerH + 4} textAnchor="end"
                  fill={SP_C.slate400} fontSize="10" fontFamily={SP_FONT} fontWeight="600">
              {Math.round(max * (1 - p)).toLocaleString('ro')}
            </text>
          </g>
        ))}
        {/* area */}
        <path d={areaPath} fill="url(#rev-area)" />
        {/* line */}
        <path d={linePath} fill="none" stroke={accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {/* points */}
        {points.map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r={i === data.length - 2 ? 4 : 2.5} fill={i === data.length - 2 ? accent : 'white'} stroke={accent} strokeWidth={1.5} />
        ))}
        {/* x labels every 2 */}
        {data.map((d, i) => i % 2 === 0 ? (
          <text key={i} x={x(i)} y={h - 8} textAnchor="middle" fill={SP_C.slate400} fontSize="10" fontFamily={SP_FONT} fontWeight="600">
            {d.d}
          </text>
        ) : null)}
      </svg>
    </div>
  );
}

function CheckInDial({ checkedIn, sold, accent }) {
  const pct = sold ? checkedIn / sold : 0;
  const r = 56, c = 2 * Math.PI * r;
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 20, border: '1px solid ' + SP_C.slate100,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.06em' }}>CHECK-IN LIVE</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 12 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke={SP_C.slate100} strokeWidth={12} />
          <circle cx="70" cy="70" r={r} fill="none" stroke={accent} strokeWidth={12}
                  strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
                  transform="rotate(-90 70 70)" />
          <text x="70" y="68" textAnchor="middle" fontFamily={SP_FONT} fontWeight="800" fontSize="26" fill={SP_C.navy} letterSpacing="-0.025em">
            {Math.round(pct * 100)}%
          </text>
          <text x="70" y="86" textAnchor="middle" fontFamily={SP_FONT} fontWeight="600" fontSize="10" fill={SP_C.slate500} letterSpacing="0.06em">
            SOSIȚI
          </text>
        </svg>
        <div style={{ flex: 1 }}>
          <DialRow color={SP_C.success} label="Sosiți"  value={checkedIn} />
          <DialRow color={SP_C.slate300} label="Așteptați" value={sold - checkedIn} />
          <div style={{ height: 1, background: SP_C.slate100, margin: '10px 0' }} />
          <DialRow color={accent} label="Vândute" value={sold} bold />
        </div>
      </div>
    </div>
  );
}

function DialRow({ color, label, value, bold }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      <span style={{ flex: 1, fontSize: 12, color: SP_C.slate600, fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: SP_FONT, fontWeight: bold ? 800 : 700, fontSize: 14, color: SP_C.navy }}>{value}</span>
    </div>
  );
}

function AttendeesTable({ attendees, accent, filter, setFilter }) {
  const filtered = filter === 'toate' ? attendees : attendees.filter(a => a.status === filter);
  const STATUSES = {
    in:    { tone: 'success', label: 'Sosit' },
    valid: { tone: 'brand',   label: 'Valid' },
    used:  { tone: 'used',    label: 'Folosit' },
  };
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid ' + SP_C.slate100, boxShadow: '0 1px 2px rgba(15,23,42,0.04)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid ' + SP_C.slate100 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: SP_C.navy }}>Participanți</div>
          <div style={{ fontSize: 11, color: SP_C.slate500, marginTop: 2 }}>{filtered.length} din {attendees.length}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'toate', l: 'Toate' },
            { id: 'in', l: 'Sosiți' },
            { id: 'valid', l: 'Așteptați' },
            { id: 'used', l: 'Folosite' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '5px 10px', borderRadius: 7, border: 0, fontFamily: SP_FONT, fontWeight: 600, fontSize: 11,
              background: filter === f.id ? SP_C.slate100 : 'transparent',
              color: filter === f.id ? SP_C.navy : SP_C.slate500, cursor: 'pointer',
            }}>{f.l}</button>
          ))}
        </div>
      </div>
      <div style={{ maxHeight: 340, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: SP_C.slate50 }}>
              <Th>Nume</Th>
              <Th>Email</Th>
              <Th>Bilet</Th>
              <Th>Status</Th>
              <Th>Scanat</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => {
              const cfg = STATUSES[a.status];
              return (
                <tr key={a.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid ' + SP_C.slate100 : 'none' }}>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 999, fontWeight: 700, fontSize: 11,
                        background: SP_C.slate100, color: SP_C.slate700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{a.n.split(' ').map(s => s[0]).join('').slice(0, 2)}</div>
                      <span style={{ fontWeight: 600, color: SP_C.navy }}>{a.n}</span>
                    </div>
                  </td>
                  <td style={{ ...td, color: SP_C.slate500 }}>{a.e}</td>
                  <td style={{ ...td, fontFamily: SP_MONO, fontSize: 12, color: SP_C.slate600 }}>{a.id}</td>
                  <td style={td}><Chip tone={cfg.tone}>{cfg.label}</Chip></td>
                  <td style={{ ...td, fontFamily: SP_MONO, fontSize: 12, color: a.t ? SP_C.navy : SP_C.slate400 }}>{a.t || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const td = { padding: '11px 14px', textAlign: 'left' };
function Th({ children }) {
  return <th style={{ ...td, fontSize: 10, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{children}</th>;
}

function ScanLog({ scans, accent }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid ' + SP_C.slate100, boxShadow: '0 1px 2px rgba(15,23,42,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid ' + SP_C.slate100 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: SP_C.navy }}>Jurnal scanări</div>
          <div style={{ fontSize: 11, color: SP_C.slate500, marginTop: 2 }}>Live · ultimul minut</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: SP_C.success }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: SP_C.success, boxShadow: '0 0 0 3px rgba(22,163,74,0.18)' }} />
          LIVE
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', maxHeight: 340 }}>
        {scans.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 11, padding: '11px 16px',
            borderBottom: i < scans.length - 1 ? '1px solid ' + SP_C.slate100 : 'none',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 999, flexShrink: 0,
              background: s.ok ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={s.ok ? 'check' : 'x'} size={16} color={s.ok ? SP_C.success : SP_C.danger} stroke={2.2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: SP_C.navy }}>{s.n}</div>
              <div style={{ fontFamily: SP_MONO, fontSize: 11, color: SP_C.slate500, marginTop: 1 }}>{s.id}</div>
            </div>
            <div style={{ fontFamily: SP_MONO, fontSize: 12, color: SP_C.slate500, fontWeight: 500 }}>{s.t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PastEventCard({ event }) {
  const conv = Math.round((event.checkedIn / event.sold) * 100);
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 16, border: '1px solid ' + SP_C.slate100,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)', display: 'flex', gap: 14, alignItems: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
        background: `linear-gradient(135deg, ${event.accent} 0%, #2563EB 100%)`,
      }}>
        <img src={event.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: SP_C.slate500, letterSpacing: '0.06em' }}>{event.eyebrow}</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: SP_C.navy, marginTop: 3, letterSpacing: '-0.01em' }}>{event.title}</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 11, color: SP_C.slate500 }}>
          <span><b style={{ color: SP_C.navy }}>{event.sold}</b> bilete</span>
          <span><b style={{ color: SP_C.navy }}>{(event.sold * event.price).toLocaleString('ro')}</b> RON</span>
          <span><b style={{ color: SP_C.success }}>{conv}%</b> sosiți</span>
        </div>
      </div>
      <button style={{
        padding: '7px 12px', borderRadius: 10, border: '1px solid ' + SP_C.slate200,
        background: 'white', fontWeight: 600, fontSize: 12, color: SP_C.slate700, cursor: 'pointer', fontFamily: SP_FONT,
      }}>Raport →</button>
    </div>
  );
}

Object.assign(window, { AdminDashboard });
