// components.jsx — SavaPass shared atoms
// Manrope · cyan/navy · iOS-like ergonomics

const SP_C = {
  cyan: '#009FE3',
  cyan600: '#0089C4',
  cyan700: '#006FA1',
  cyan100: '#E0F4FC',
  cyan50: '#F1FAFE',
  blue: '#2563EB',
  navy: '#0F172A',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  white: '#FFFFFF',
  success: '#16A34A',
  successBg: '#DCFCE7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  gradBrand: 'linear-gradient(135deg,#00B8F0 0%,#2563EB 100%)',
  gradNight: 'linear-gradient(160deg,#0F172A 0%,#1E3A8A 100%)',
};

const SP_FONT = `'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif`;
const SP_SERIF = `'Instrument Serif', 'Times New Roman', Georgia, serif`;
const SP_MONO = `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace`;

// ─────────────────────────────────────────────────────────
// Icon — Lucide via global
// ─────────────────────────────────────────────────────────
function Icon({ name, size = 22, color = 'currentColor', stroke = 1.75, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = '';
      const i = document.createElement('i');
      i.setAttribute('data-lucide', name);
      ref.current.appendChild(i);
      window.lucide.createIcons({
        attrs: { width: size, height: size, 'stroke-width': stroke, color },
      });
    }
  }, [name, size, color, stroke]);
  return <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, color, ...style }} />;
}

// ─────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────
function Button({ children, variant = 'primary', icon, onClick, full, disabled, style }) {
  const [pressed, setPressed] = React.useState(false);
  const base = {
    fontFamily: SP_FONT,
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: -0.005,
    padding: '14px 22px',
    borderRadius: 14,
    border: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: full ? '100%' : undefined,
    transition: 'transform 140ms cubic-bezier(.22,1,.36,1), background 140ms ease, box-shadow 140ms ease',
    transform: pressed ? 'scale(0.97)' : 'scale(1)',
    opacity: disabled ? 0.4 : 1,
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  };
  const variants = {
    primary: {
      background: pressed ? SP_C.cyan600 : SP_C.cyan,
      color: 'white',
      boxShadow: pressed ? '0 6px 16px rgba(0,159,227,0.25)' : '0 12px 30px rgba(0,159,227,0.30)',
    },
    secondary: {
      background: SP_C.slate100,
      color: SP_C.navy,
    },
    ghost: {
      background: 'transparent',
      color: SP_C.cyan700,
      boxShadow: 'inset 0 0 0 1px ' + SP_C.slate200,
    },
    dark: {
      background: SP_C.navy,
      color: 'white',
    },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {icon && <Icon name={icon} size={18} color="currentColor" />}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Field
// ─────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', placeholder, error, prefix }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div>
      <div style={{
        background: 'white',
        border: '1px solid ' + (error ? SP_C.danger : focus ? SP_C.cyan : SP_C.slate200),
        boxShadow: focus ? `0 0 0 3px ${SP_C.cyan100}` : error ? `0 0 0 3px ${SP_C.dangerBg}` : 'none',
        borderRadius: 14,
        padding: '10px 14px',
        transition: 'all 140ms ease',
        fontFamily: SP_FONT,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: error ? SP_C.danger : focus ? SP_C.cyan700 : SP_C.slate500,
        }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {prefix && <span style={{ color: SP_C.slate400, fontSize: 16 }}>{prefix}</span>}
          <input
            type={type}
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
            placeholder={placeholder}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            style={{
              flex: 1, border: 0, outline: 0, background: 'transparent',
              fontFamily: SP_FONT, fontSize: 16, fontWeight: 500,
              color: SP_C.navy, padding: 0, width: '100%',
            }}
          />
        </div>
      </div>
      {error && <div style={{ fontSize: 12, color: SP_C.danger, marginTop: 6, paddingLeft: 4 }}>{error}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Chip — status
// ─────────────────────────────────────────────────────────
function Chip({ tone = 'brand', children, dot = true }) {
  const tones = {
    success: { bg: SP_C.successBg, fg: '#0F5132', dot: SP_C.success },
    danger:  { bg: SP_C.dangerBg,  fg: '#7F1D1D', dot: SP_C.danger },
    warning: { bg: SP_C.warningBg, fg: '#78350F', dot: SP_C.warning },
    used:    { bg: SP_C.slate100,  fg: SP_C.slate600, dot: SP_C.slate500 },
    brand:   { bg: SP_C.cyan100,   fg: SP_C.cyan700,  dot: SP_C.cyan },
    dark:    { bg: 'rgba(255,255,255,0.18)', fg: 'white', dot: 'white' },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 11px', borderRadius: 999,
      background: t.bg, color: t.fg,
      fontFamily: SP_FONT, fontSize: 12, fontWeight: 600,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dot }} />}
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Eyebrow
// ─────────────────────────────────────────────────────────
function Eyebrow({ children, color }) {
  return <div style={{
    fontFamily: SP_FONT, fontSize: 11, fontWeight: 700,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    color: color || SP_C.cyan700,
  }}>{children}</div>;
}

// ─────────────────────────────────────────────────────────
// QR — stylized
// ─────────────────────────────────────────────────────────
function QR({ size = 180, seed = 'SP-2026-1147' }) {
  // Deterministic pseudo-random pattern from seed
  const cells = 21;
  const cellSize = size / cells;
  const grid = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const rng = () => {
      h = (h * 1664525 + 1013904223) >>> 0;
      return (h & 0xffff) / 0xffff;
    };
    const g = [];
    for (let y = 0; y < cells; y++) {
      const row = [];
      for (let x = 0; x < cells; x++) row.push(rng() > 0.5 ? 1 : 0);
      g.push(row);
    }
    // finder squares — three corners
    const finder = (cx, cy) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const onBorder = x === 0 || x === 6 || y === 0 || y === 6;
        const center = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        g[cy + y][cx + x] = onBorder || center ? 1 : 0;
      }
    };
    finder(0, 0); finder(cells - 7, 0); finder(0, cells - 7);
    return g;
  }, [seed]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${cells} ${cells}`} style={{ display: 'block' }}>
      <rect width={cells} height={cells} fill="white" />
      {grid.map((row, y) => row.map((v, x) =>
        v ? <rect key={x + ',' + y} x={x} y={y} width="1" height="1" fill={SP_C.navy} /> : null
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Logo (small wordmark for app header)
// ─────────────────────────────────────────────────────────
function Logo({ size = 22, dark = false }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        {/* simplified rotary gear */}
        <circle cx="12" cy="12" r="3.2" stroke={dark ? 'white' : SP_C.cyan} strokeWidth="1.6" />
        {[...Array(8)].map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const x1 = 12 + Math.cos(a) * 6;
          const y1 = 12 + Math.sin(a) * 6;
          const x2 = 12 + Math.cos(a) * 9.5;
          const y2 = 12 + Math.sin(a) * 9.5;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={dark ? 'white' : SP_C.cyan} strokeWidth="2.2" strokeLinecap="round" />;
        })}
      </svg>
      <span style={{
        fontFamily: SP_FONT, fontWeight: 800, fontSize: size * 0.78,
        letterSpacing: '-0.02em', color: dark ? 'white' : SP_C.navy,
      }}>SavaPass</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Bottom nav (for screens that have one)
// ─────────────────────────────────────────────────────────
function BottomNav({ active, onChange }) {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'ticket', icon: 'ticket', label: 'Pass' },
    { id: 'profile', icon: 'user', label: 'Profile' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '10px 20px 28px',
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid ' + SP_C.slate200,
      display: 'flex',
      gap: 8,
      zIndex: 30,
    }}>
      {tabs.map(t => (
        <button key={t.id}
          onClick={() => onChange && onChange(t.id)}
          style={{
            flex: 1, border: 0, background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            cursor: 'pointer', padding: '6px 0',
            color: active === t.id ? SP_C.cyan : SP_C.slate400,
            fontFamily: SP_FONT, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.02em',
          }}>
          <Icon name={t.icon} size={22} color="currentColor" stroke={active === t.id ? 2.2 : 1.75} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TopBar (back / title / action)
// ─────────────────────────────────────────────────────────
function TopBar({ title, onBack, action, transparent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', height: 52,
      background: transparent ? 'transparent' : 'white',
      borderBottom: transparent ? 'none' : '1px solid ' + SP_C.slate100,
      position: 'relative',
      zIndex: 5,
    }}>
      <button onClick={onBack} style={{
        width: 38, height: 38, border: 0, borderRadius: 999,
        background: transparent ? 'rgba(255,255,255,0.18)' : SP_C.slate100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: transparent ? 'white' : SP_C.navy,
      }}>
        <Icon name="chevron-left" size={20} color="currentColor" />
      </button>
      <div style={{
        fontFamily: SP_FONT, fontWeight: 700, fontSize: 16,
        color: transparent ? 'white' : SP_C.navy,
        letterSpacing: '-0.01em',
      }}>{title}</div>
      <div style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {action}
      </div>
    </div>
  );
}

// Expose all to global
Object.assign(window, {
  SP_C, SP_FONT, SP_SERIF, SP_MONO,
  Icon, Button, Field, Chip, Eyebrow, QR, Logo, BottomNav, TopBar,
});
