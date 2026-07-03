'use client';

import { useState, useRef, useCallback, useEffect, CSSProperties } from 'react';

export interface DishOption {
  id: string;
  emoji: string;
  label: string;
}

export interface KululuConfettiSubmitValues {
  rsvpStatus: 'confirmed' | 'declined';
  guestCount: number;
  mealChoice: string;
  notes: string;
}

export interface KululuConfettiDesignProps {
  // Event display data
  coupleName?: string;
  formattedDate?: string;
  time?: string;
  venue?: string;
  mapsLink?: string;
  // Dish chips (only shown when dietaryOptions is on)
  dishOptions?: DishOption[];
  lockGuestCount?: boolean;
  // Guest initial state
  guestName?: string;
  initialRsvpStatus?: 'pending' | 'confirmed' | 'declined';
  initialAmount?: number;
  initialMealChoice?: string;
  initialNotes?: string;
  // Palette [coral, teal]
  palette?: [string, string];
  // Behaviour
  interactive?: boolean;
  showConfetti?: boolean;
  onSubmit?: (values: KululuConfettiSubmitValues) => Promise<{ success: boolean; message: string }>;
}

// ── CSS vars and keyframes injected once ─────────────────────────────────────
const STYLE_ID = 'kululu-confetti-styles';

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes kc-floaty {
      0%,100% { transform: translateY(0) rotate(0deg); }
      50%     { transform: translateY(-14px) rotate(2deg); }
    }
    @keyframes kc-floaty-slow {
      0%,100% { transform: translateY(0) rotate(0deg); }
      50%     { transform: translateY(-22px) rotate(-3deg); }
    }
    @keyframes kc-spin-slow {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes kc-pop-in {
      0%   { transform: scale(0.86); opacity: 0; }
      60%  { transform: scale(1.05); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes kc-confetti-fly {
      0%   { transform: translate3d(0,0,0) rotate(0deg); opacity: 1; }
      70%  { opacity: 1; }
      100% { transform: translate3d(var(--kc-dx), calc(var(--kc-dy) + 100vh), 0) rotate(var(--kc-rot)); opacity: 0; }
    }
    .kc-floaty      { animation: kc-floaty 6s ease-in-out infinite; }
    .kc-floaty-slow { animation: kc-floaty-slow 9s ease-in-out infinite; }
    .kc-spin-slow   { animation: kc-spin-slow 32s linear infinite; transform-origin: 50% 50%; }
    .kc-pop         { animation: kc-pop-in 360ms cubic-bezier(.34,1.56,.64,1) both; }
    .kc-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
    .kc-no-scrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
  `;
  document.head.appendChild(el);
}

// ── Confetti burst ────────────────────────────────────────────────────────────
interface Particle {
  i: number; dx: number; dy: number; rot: number;
  size: number; color: string; shape: 'sq' | 'rect' | 'circ' | 'tri';
  delay: number;
}

interface Burst { id: number; particles: Particle[] }

function ConfettiBurst({ trigger, palette }: { trigger: number; palette: [string, string] }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (!trigger) return;
    const id = ++idRef.current;
    const particles: Particle[] = Array.from({ length: 80 }, (_, i) => {
      const angle = Math.random() * Math.PI - Math.PI / 2;
      const speed = 380 + Math.random() * 420;
      const dx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
      const dy = -Math.abs(Math.sin(angle)) * speed - 200 - Math.random() * 200;
      const rot = (Math.random() - 0.5) * 1080;
      const colorPool = [palette[0], palette[1], '#FFD93D', '#1A1A1A', '#FFFFFF', '#9B5DE5'];
      return {
        i, dx, dy, rot,
        size: 8 + Math.random() * 10,
        color: colorPool[i % colorPool.length],
        shape: (['sq', 'rect', 'circ', 'tri'] as const)[i % 4],
        delay: Math.random() * 80,
      };
    });
    setBursts(b => [...b, { id, particles }]);
    const t = setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 2200);
    return () => clearTimeout(t);
  }, [trigger, palette]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {bursts.map(b => (
        <div key={b.id} style={{ position: 'absolute', left: '50%', top: '62%', width: 0, height: 0 }}>
          {b.particles.map(p => {
            const base: CSSProperties = {
              position: 'absolute', left: 0, top: 0,
              ['--kc-dx' as string]: `${p.dx}px`,
              ['--kc-dy' as string]: `${p.dy}px`,
              ['--kc-rot' as string]: `${p.rot}deg`,
              animation: `kc-confetti-fly 1800ms cubic-bezier(.15,.7,.4,1) ${p.delay}ms forwards`,
              willChange: 'transform, opacity',
            };
            if (p.shape === 'circ') return <span key={p.i} style={{ ...base, width: p.size, height: p.size, background: p.color, borderRadius: '50%' }} />;
            if (p.shape === 'rect') return <span key={p.i} style={{ ...base, width: p.size * 1.6, height: p.size * 0.45, background: p.color, borderRadius: 2 }} />;
            if (p.shape === 'tri') return <span key={p.i} style={{ ...base, width: 0, height: 0, borderLeft: `${p.size / 2}px solid transparent`, borderRight: `${p.size / 2}px solid transparent`, borderBottom: `${p.size}px solid ${p.color}`, background: 'transparent' }} />;
            return <span key={p.i} style={{ ...base, width: p.size, height: p.size, background: p.color, borderRadius: 2 }} />;
          })}
        </div>
      ))}
    </div>
  );
}

// ── Hero illustration (confetti variant) ─────────────────────────────────────
function HeroIllustration({ palette }: { palette: [string, string] }) {
  const [coral, teal] = palette;
  const yellow = '#FFD93D';
  const purple = '#9B5DE5';
  const C = [coral, teal, yellow, '#1A1A1A', purple];
  return (
    <svg viewBox="0 0 520 520" width="100%" height="100%" aria-hidden="true">
      <g className="kc-floaty">
        <circle cx="220" cy="260" r="130" fill="none" stroke={coral} strokeWidth="22" />
        <circle cx="320" cy="260" r="130" fill="none" stroke={teal} strokeWidth="22" />
      </g>
      <g className="kc-floaty-slow">
        <rect x="60" y="80" width="46" height="14" rx="3" fill={coral} transform="rotate(28 83 87)" />
        <rect x="430" y="60" width="38" height="14" rx="3" fill={teal} transform="rotate(-22 449 67)" />
        <rect x="70" y="420" width="50" height="14" rx="3" fill={yellow} transform="rotate(-12 95 427)" />
        <rect x="410" y="430" width="40" height="14" rx="3" fill={purple} transform="rotate(34 430 437)" />
      </g>
      <g className="kc-floaty">
        <circle cx="40" cy="240" r="10" fill={yellow} />
        <circle cx="490" cy="280" r="14" fill={coral} />
        <circle cx="260" cy="40" r="12" fill={teal} />
        <circle cx="260" cy="490" r="10" fill="#1A1A1A" />
      </g>
      <g>
        {[[120, 140], [400, 160], [110, 360], [410, 380], [260, 200]].map(([x, y], i) => (
          <g key={i} className={i % 2 ? 'kc-floaty' : 'kc-floaty-slow'}>
            <path d={`M${x} ${y - 14} L${x + 4} ${y - 4} L${x + 14} ${y} L${x + 4} ${y + 4} L${x} ${y + 14} L${x - 4} ${y + 4} L${x - 14} ${y} L${x - 4} ${y - 4} Z`} fill={C[i % C.length]} />
          </g>
        ))}
      </g>
    </svg>
  );
}

// ── Tag pill ──────────────────────────────────────────────────────────────────
function TagPill({ children, bg, fg, border, icon }: { children: React.ReactNode; bg: string; fg: string; border?: string; icon: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: bg, color: fg,
      border: border ? `1.5px solid ${border}` : '1.5px solid transparent',
      padding: '9px 16px', borderRadius: 999,
      fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      {children}
    </span>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ coupleName, formattedDate, time, venue, mapsLink, palette }: {
  coupleName?: string; formattedDate?: string; time?: string; venue?: string; mapsLink?: string; palette: [string, string];
}) {
  const [coral, teal] = palette;
  const parts = coupleName?.split(' & ') ?? [];
  const person1 = parts[0];
  const person2 = parts[1];

  return (
    <section style={{ maxWidth: 540, margin: '0 auto', padding: '40px 24px 24px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 24, left: 16, width: 'min(200px, 42vw)', aspectRatio: '1/1', pointerEvents: 'none', zIndex: 0 }}>
        <HeroIllustration palette={palette} />
      </div>

      {coupleName && (
        <h1 style={{
          position: 'relative', zIndex: 1, margin: 0,
          fontFamily: 'var(--font-rubik), system-ui, sans-serif',
          fontWeight: 900,
          fontSize: 'clamp(56px, 17vw, 96px)',
          lineHeight: 0.9, letterSpacing: '-0.04em', color: '#1A1A1A',
        }}>
          <span style={{ display: 'block' }}>
            {person1}{' '}
            <span style={{ color: coral, fontStyle: 'italic', fontWeight: 800 }}>&amp;</span>
          </span>
          {person2 && <span style={{ display: 'block' }}>{person2}</span>}
          <span style={{
            display: 'block', fontSize: '0.3em', fontWeight: 300,
            letterSpacing: '0', color: '#3A3A3A', marginTop: 14, lineHeight: 1.3,
          }}>
            מתחתנים.{' '}
            <span style={{ color: teal, fontWeight: 600 }}>ואתם מוזמנים.</span>
          </span>
        </h1>
      )}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 28 }}>
        {formattedDate && <TagPill bg={coral} fg="#fff" icon="📅">{formattedDate}</TagPill>}
        {venue && (
          mapsLink
            ? <a href={mapsLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <TagPill bg="#fff" fg="#1A1A1A" border={teal} icon="📍">{venue}</TagPill>
              </a>
            : <TagPill bg="#fff" fg="#1A1A1A" border={teal} icon="📍">{venue}</TagPill>
        )}
        {time && <TagPill bg="#FFF8F3" fg="#3A3A3A" icon="🥂">{time}</TagPill>}
      </div>

      <p style={{ position: 'relative', zIndex: 1, marginTop: 24, marginBottom: 0, fontSize: 16, fontWeight: 300, color: '#3A3A3A', lineHeight: 1.55 }}>
        אנחנו מתרגשים לחגוג איתכם את היום הכי מיוחד שלנו.
        מלאו את הטופס למטה כדי שנדע שאתם איתנו 💛
      </p>
    </section>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
function SectionDivider({ palette }: { palette: [string, string] }) {
  const [coral, teal] = palette;
  return (
    <div style={{ maxWidth: 540, margin: '24px auto 0', padding: '0 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderTop: '1px solid #ECECEC', paddingTop: 28 }}>
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--font-rubik), system-ui, sans-serif',
          fontWeight: 200,
          fontSize: 'clamp(48px, 13vw, 80px)',
          lineHeight: 1, letterSpacing: '-0.03em', color: '#1A1A1A',
        }}>
          אישור הגעה
        </h2>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: coral }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: teal }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFD93D' }} />
        </div>
      </div>
    </div>
  );
}

// ── Dish scroller ─────────────────────────────────────────────────────────────
function ChevronBtn({ side, direction, disabled, onClick }: {
  side: 'right' | 'left'; direction: 'back' | 'forward'; disabled: boolean; onClick: () => void;
}) {
  const pointsRight = direction === 'back';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 'back' ? 'אחורה' : 'קדימה'}
      style={{
        position: 'absolute', top: '50%', [side]: 0,
        transform: `translateY(-50%) scale(${disabled ? 0.85 : 1})`,
        width: 32, height: 32, borderRadius: '50%',
        background: '#fff', border: '1px solid #ECECEC',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        color: disabled ? '#ECECEC' : '#1A1A1A',
        opacity: disabled ? 0 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'opacity 200ms, transform 200ms cubic-bezier(.34,1.56,.64,1)', zIndex: 2,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d={pointsRight ? 'M6 3L11 8L6 13' : 'M10 3L5 8L10 13'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function DishScroller({ dishes, selected, onSelect, coral }: {
  dishes: DishOption[]; selected: string; onSelect: (id: string) => void; coral: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const abs = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ atStart: abs < 4, atEnd: abs >= max - 4 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const scrollBack = () => ref.current?.scrollBy({ left: 200, behavior: 'smooth' });
  const scrollForward = () => ref.current?.scrollBy({ left: -200, behavior: 'smooth' });

  return (
    <div style={{ position: 'relative', margin: '0 -6px' }}>
      <ChevronBtn side="right" direction="back" disabled={edges.atStart} onClick={scrollBack} />
      <ChevronBtn side="left" direction="forward" disabled={edges.atEnd} onClick={scrollForward} />
      <div
        ref={ref}
        className="kc-no-scrollbar"
        style={{
          display: 'flex', gap: 10, overflowX: 'auto',
          padding: '4px 36px 8px',
          scrollSnapType: 'x proximity',
          scrollPadding: '0 36px',
        }}
      >
        {dishes.map(d => {
          const active = selected === d.id;
          return (
            <button key={d.id} type="button" onClick={() => onSelect(active ? '' : d.id)}
              style={{
                flex: '0 0 auto',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '11px 18px', borderRadius: 999,
                border: `1.5px solid ${active ? coral : '#ECECEC'}`,
                background: active ? coral : '#fff',
                color: active ? '#fff' : '#1A1A1A',
                fontSize: 15, fontWeight: active ? 600 : 500,
                cursor: 'pointer', scrollSnapAlign: 'start',
                transition: 'transform 150ms cubic-bezier(.34,1.56,.64,1), background 150ms, color 150ms, border 150ms',
                transform: active ? 'scale(1.03)' : 'scale(1)',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}>
              <span style={{ fontSize: 17 }}>{d.emoji}</span>
              {d.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Field group ───────────────────────────────────────────────────────────────
function FieldGroup({ label, step, hint, children }: { label: string; step: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-rubik), system-ui, sans-serif', fontWeight: 800, fontSize: 13, color: '#6B6B6B', letterSpacing: '.05em', fontVariantNumeric: 'tabular-nums' }}>{step}</span>
          <label style={{ fontFamily: 'var(--font-rubik), system-ui, sans-serif', fontWeight: 700, fontSize: 22, color: '#1A1A1A', letterSpacing: '-0.01em' }}>{label}</label>
        </div>
        {hint && <span style={{ fontSize: 13, color: '#6B6B6B' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Attendance button ─────────────────────────────────────────────────────────
function AttendanceButton({ selected, onClick, fillColor, label, emoji, interactive }: {
  selected: boolean; onClick: () => void; fillColor: string; label: string; emoji?: string; interactive: boolean;
}) {
  return (
    <button type="button" onClick={interactive ? onClick : undefined}
      style={{
        background: selected ? fillColor : '#fff',
        color: selected ? '#fff' : '#1A1A1A',
        border: `1.5px solid ${selected ? fillColor : '#ECECEC'}`,
        borderRadius: 18, padding: '22px 18px',
        fontSize: 22, fontWeight: 700,
        fontFamily: 'var(--font-rubik), system-ui, sans-serif',
        letterSpacing: '-0.01em', cursor: interactive ? 'pointer' : 'default',
        transition: 'transform 180ms cubic-bezier(.34,1.56,.64,1), background 150ms, color 150ms, border-color 150ms',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
      {emoji && <span style={{ fontSize: 22 }}>{emoji}</span>}
      {label}
    </button>
  );
}

// ── RSVP form ─────────────────────────────────────────────────────────────────
function RSVPForm({
  palette, dishOptions, lockGuestCount,
  initialRsvpStatus, initialAmount, initialMealChoice, initialNotes,
  interactive, showConfetti, onSubmit, onBurst,
}: {
  palette: [string, string]; dishOptions: DishOption[]; lockGuestCount: boolean;
  initialRsvpStatus: 'pending' | 'confirmed' | 'declined';
  initialAmount: number; initialMealChoice: string; initialNotes: string;
  interactive: boolean; showConfetti: boolean;
  onSubmit?: (values: KululuConfettiSubmitValues) => Promise<{ success: boolean; message: string }>;
  onBurst: () => void;
}) {
  const [coral] = palette;
  const [attendance, setAttendance] = useState<'confirmed' | 'declined' | null>(
    initialRsvpStatus === 'pending' ? null : initialRsvpStatus,
  );
  const [guests, setGuests] = useState(initialAmount);
  const [mealChoice, setMealChoice] = useState(initialMealChoice);
  const [notes, setNotes] = useState(initialNotes);
  const [submitted, setSubmitted] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<'confirmed' | 'declined' | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canSubmit = attendance !== null && !isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !interactive) return;
    setIsPending(true);
    setErrorMsg('');
    try {
      if (onSubmit) {
        const result = await onSubmit({ rsvpStatus: attendance!, guestCount: guests, mealChoice, notes });
        if (!result.success) {
          setErrorMsg(result.message);
          return;
        }
      }
      if (showConfetti) onBurst();
      setSubmittedStatus(attendance);
      setSubmitted(true);
    } finally {
      setIsPending(false);
    }
  };

  if (submitted && submittedStatus) {
    return (
      <div style={cardOuter()}>
        <div className="kc-pop" style={{ padding: '44px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>{submittedStatus === 'confirmed' ? '🎉' : '💛'}</div>
          <h3 style={{ fontFamily: 'var(--font-rubik), system-ui, sans-serif', fontWeight: 800, fontSize: 36, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
            {submittedStatus === 'confirmed' ? 'תודה! נשמח לראותכם' : 'תודה שעדכנתם'}
          </h3>
          <p style={{ color: '#6B6B6B', fontSize: 17, margin: '0 0 28px' }}>
            {submittedStatus === 'confirmed'
              ? `שמרנו לכם ${guests} ${guests === 1 ? 'מקום' : 'מקומות'} ליד שולחן יפה במיוחד`
              : 'נחמיץ אתכם — שולחים אהבה גדולה מרחוק'}
          </p>
          {interactive && (
            <button onClick={() => setSubmitted(false)}
              style={{ background: 'transparent', border: '1.5px solid #ECECEC', color: '#3A3A3A', padding: '12px 22px', borderRadius: 999, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              עריכת התשובה
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={cardOuter()}>
      <div style={{ padding: '32px 24px 28px' }}>

        <FieldGroup label="האם תגיעו?" step="01">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <AttendanceButton selected={attendance === 'confirmed'} onClick={() => setAttendance('confirmed')} fillColor={coral} emoji="🎉" label="אגיע" interactive={interactive} />
            <AttendanceButton selected={attendance === 'declined'} onClick={() => setAttendance('declined')} fillColor="#1A1A1A" label="לא אגיע" interactive={interactive} />
          </div>
        </FieldGroup>

        {attendance === 'confirmed' && (
          <div className="kc-pop">
            <FieldGroup label="כמה אתם?" step="02">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFF8F3', border: '1.5px solid #ECECEC', borderRadius: 18, padding: '10px 14px' }}>
                <button type="button" onClick={() => interactive && setGuests(g => Math.max(1, g - 1))}
                  style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', border: '1.5px solid #ECECEC', fontSize: 26, fontWeight: 600, color: '#1A1A1A', cursor: interactive ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
                  disabled={lockGuestCount} aria-label="מינוס">−</button>
                <div style={{ textAlign: 'center', lineHeight: 1 }}>
                  <div style={{ fontFamily: 'var(--font-rubik), system-ui, sans-serif', fontWeight: 800, fontSize: 64, letterSpacing: '-0.04em', color: '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>{guests}</div>
                  <div style={{ fontSize: 13, color: '#6B6B6B', marginTop: 4 }}>{guests === 1 ? 'אורח אחד' : `${guests} אורחים`}</div>
                </div>
                <button type="button" onClick={() => interactive && setGuests(g => Math.min(12, g + 1))}
                  style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', border: '1.5px solid #ECECEC', fontSize: 26, fontWeight: 600, color: '#1A1A1A', cursor: interactive ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
                  disabled={lockGuestCount} aria-label="פלוס">+</button>
              </div>
            </FieldGroup>

            {dishOptions.length > 0 && (
              <FieldGroup label="העדפת מנה" step="03" hint="בחירה אחת">
                <DishScroller dishes={dishOptions} selected={mealChoice} onSelect={interactive ? setMealChoice : () => {}} coral={coral} />
              </FieldGroup>
            )}
          </div>
        )}

        <FieldGroup label="הערות" step={attendance === 'confirmed' ? (dishOptions.length > 0 ? '04' : '03') : '02'} hint="לא חובה">
          <textarea
            value={notes}
            onChange={e => interactive && setNotes(e.target.value)}
            onFocus={() => setFocused('notes')}
            onBlur={() => setFocused(null)}
            placeholder=""
            rows={3}
            readOnly={!interactive}
            style={{
              width: '100%', border: 'none',
              borderBottom: `2px solid ${focused === 'notes' ? coral : '#ECECEC'}`,
              padding: '12px 2px', fontSize: 16, fontWeight: 300,
              fontFamily: 'var(--font-assistant), system-ui, sans-serif',
              background: 'transparent', color: '#1A1A1A',
              resize: 'none', outline: 'none', transition: 'border-color 200ms',
              cursor: interactive ? 'text' : 'default',
            }}
          />
        </FieldGroup>

        {errorMsg && <p style={{ textAlign: 'center', color: '#e63946', fontSize: 14, marginBottom: 12 }}>{errorMsg}</p>}

        {interactive && (
          <button type="submit" disabled={!canSubmit}
            style={{
              width: '100%',
              background: canSubmit ? coral : '#ECECEC',
              color: canSubmit ? '#fff' : '#6B6B6B',
              border: 'none', padding: '20px 24px', borderRadius: 999,
              fontSize: 19, fontWeight: 700,
              fontFamily: 'var(--font-assistant), system-ui, sans-serif',
              letterSpacing: '-0.01em',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              marginTop: 12,
              transition: 'transform 150ms cubic-bezier(.34,1.56,.64,1), background 150ms, box-shadow 200ms',
              boxShadow: canSubmit ? `0 8px 28px ${coral}44` : 'none',
            }}>
            {isPending ? '...' : 'שליחת תשובה'}
          </button>
        )}

        {interactive && !canSubmit && !attendance && (
          <p style={{ textAlign: 'center', color: '#6B6B6B', fontSize: 13, marginTop: 14, marginBottom: 0 }}>בחרו תחילה אם תגיעו</p>
        )}
      </div>
    </form>
  );
}

function cardOuter(): CSSProperties {
  return {
    background: '#fff', border: '1px solid #ECECEC',
    borderRadius: 28,
    boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 30px 60px -30px rgba(0,0,0,0.12)',
    overflow: 'hidden', transition: 'border 200ms',
  };
}

// ── Root component ────────────────────────────────────────────────────────────
export function KululuConfettiDesign({
  coupleName,
  formattedDate,
  time,
  venue,
  mapsLink,
  dishOptions = [],
  lockGuestCount = false,
  initialRsvpStatus = 'pending',
  initialAmount = 1,
  initialMealChoice = '',
  initialNotes = '',
  palette = ['#FF6B6B', '#4ECDC4'],
  interactive = true,
  showConfetti = true,
  onSubmit,
}: KululuConfettiDesignProps) {
  const [burstTrigger, setBurstTrigger] = useState(0);

  useEffect(() => { ensureStyles(); }, []);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        fontFamily: 'var(--font-assistant), system-ui, sans-serif',
        fontWeight: 300, fontSize: 17, lineHeight: 1.55,
        color: '#1A1A1A',
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'hidden',
      }}
    >
      <Hero coupleName={coupleName} formattedDate={formattedDate} time={time} venue={venue} mapsLink={mapsLink} palette={palette} />
      <SectionDivider palette={palette} />
      <section style={{ maxWidth: 540, margin: '28px auto 0', padding: '0 24px 56px' }}>
        <RSVPForm
          palette={palette}
          dishOptions={dishOptions}
          lockGuestCount={lockGuestCount}
          initialRsvpStatus={initialRsvpStatus}
          initialAmount={initialAmount}
          initialMealChoice={initialMealChoice}
          initialNotes={initialNotes}
          interactive={interactive}
          showConfetti={showConfetti}
          onSubmit={onSubmit}
          onBurst={() => setBurstTrigger(x => x + 1)}
        />
      </section>
      {showConfetti && <ConfettiBurst trigger={burstTrigger} palette={palette} />}
    </div>
  );
}
