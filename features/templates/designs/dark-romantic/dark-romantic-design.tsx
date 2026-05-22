'use client';

import { useState, useEffect } from 'react';
import type { DishOption } from '../kululu-confetti/kululu-confetti-design';

export type { DishOption };

export interface DarkRomanticSubmitValues {
  rsvpStatus: 'confirmed' | 'declined';
  guestCount: number;
  mealChoice: string;
  notes: string;
}

export interface DarkRomanticDesignProps {
  coupleName?: string;
  formattedDate?: string;
  time?: string;
  venue?: string;
  mapsLink?: string;
  dishOptions?: DishOption[];
  lockGuestCount?: boolean;
  guestName?: string;
  initialRsvpStatus?: 'pending' | 'confirmed' | 'declined';
  initialAmount?: number;
  initialMealChoice?: string;
  initialNotes?: string;
  interactive?: boolean;
  onSubmit?: (values: DarkRomanticSubmitValues) => Promise<{ success: boolean; message: string }>;
}

const STYLE_ID = 'dark-romantic-styles';
const FONT_ID = 'dark-romantic-fonts';

function ensureAssets() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById(FONT_ID)) {
    const link = document.createElement('link');
    link.id = FONT_ID;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700;900&family=Heebo:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
  }
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes dr-fade-in{from{opacity:0}to{opacity:1}}
    @keyframes dr-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes dr-bump{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}
    @keyframes dr-glow-pulse{
      0%,100%{box-shadow:0 0 0 1px rgba(232,165,152,0.4),0 0 40px -8px rgba(232,165,152,0.35),0 0 80px -20px rgba(232,165,152,0.35)}
      50%{box-shadow:0 0 0 1px rgba(232,165,152,0.55),0 0 56px -6px rgba(232,165,152,0.5),0 0 110px -16px rgba(232,165,152,0.5)}
    }
    @keyframes dr-drift{0%,100%{transform:translate(0,0) rotate(0deg)}50%{transform:translate(0,-6px) rotate(0.5deg)}}
    .dr-anim-brand{animation:dr-fade-in .9s cubic-bezier(.16,1,.3,1) .1s both}
    .dr-anim-eyebrow{animation:dr-rise .9s cubic-bezier(.16,1,.3,1) .25s both}
    .dr-anim-couple{animation:dr-rise 1s cubic-bezier(.16,1,.3,1) .35s both}
    .dr-anim-sub{animation:dr-rise 1s cubic-bezier(.16,1,.3,1) .5s both}
    .dr-anim-info{animation:dr-rise 1s cubic-bezier(.16,1,.3,1) .65s both}
    .dr-anim-divider{animation:dr-rise 1s cubic-bezier(.16,1,.3,1) .8s both}
    .dr-anim-card{animation:dr-rise 1.1s cubic-bezier(.16,1,.3,1) .9s both}
    .dr-anim-footer{animation:dr-fade-in 1s cubic-bezier(.16,1,.3,1) 1.4s both}
    .dr-drift-fast{animation:dr-drift 14s ease-in-out infinite}
    .dr-drift-slow{animation:dr-drift 18s ease-in-out infinite reverse}
    .dr-glow-yes{animation:dr-glow-pulse 2.6s cubic-bezier(.16,1,.3,1) infinite}
    .dr-glow-icon{animation:dr-glow-pulse 2.6s cubic-bezier(.16,1,.3,1) infinite}
    .dr-bump{animation:dr-bump .35s cubic-bezier(.16,1,.3,1)}
    @media(prefers-reduced-motion:reduce){
      .dr-anim-brand,.dr-anim-eyebrow,.dr-anim-couple,.dr-anim-sub,
      .dr-anim-info,.dr-anim-divider,.dr-anim-card,.dr-anim-footer,
      .dr-drift-fast,.dr-drift-slow,.dr-glow-yes,.dr-glow-icon,.dr-bump{
        animation:none!important;opacity:1!important;transform:none!important
      }
    }
  `;
  document.head.appendChild(el);
}

// ── Colours ───────────────────────────────────────────────────────────────────

const C = {
  bgNight:    '#0D1B2A',
  bgElev:     '#142435',
  rose:       '#E8A598',
  roseStrong: '#F2B6A9',
  roseSoft:   'rgba(232,165,152,0.12)',
  roseGlow:   'rgba(232,165,152,0.35)',
  lilac:      '#B8A9C9',
  lilacGlow:  'rgba(184,169,201,0.30)',
  cream:      '#F4E8DC',
  creamDim:   '#DCC9B6',
  muted:      '#8A8295',
  lineSoft:   'rgba(244,232,220,0.10)',
  lineStrong: 'rgba(244,232,220,0.18)',
} as const;

const FONT_DISPLAY = "'Frank Ruhl Libre', Georgia, serif";
const FONT_SANS    = "'Heebo', ui-sans-serif, system-ui, sans-serif";
const EASE         = 'cubic-bezier(.16,1,.3,1)';

// ── SVG icons ─────────────────────────────────────────────────────────────────

function KululuMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="dr-kk-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F2B6A9" />
          <stop offset="55%" stopColor="#E8A598" />
          <stop offset="100%" stopColor="#B8A9C9" />
        </linearGradient>
      </defs>
      <g stroke="url(#dr-kk-g)" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 3.2V8.4" /><path d="M12 15.6V20.8" />
        <path d="M3.2 12H8.4" /><path d="M15.6 12H20.8" />
        <path d="M5.6 5.6L8.6 8.6" /><path d="M15.4 15.4L18.4 18.4" />
        <path d="M18.4 5.6L15.4 8.6" /><path d="M8.6 15.4L5.6 18.4" />
      </g>
      <circle cx="12" cy="12" r="2" fill="url(#dr-kk-g)" />
      <circle cx="3" cy="3" r="0.9" fill="#B8A9C9" opacity="0.85" />
      <circle cx="21" cy="4" r="0.7" fill="#E8A598" opacity="0.85" />
      <circle cx="4" cy="21" r="0.7" fill="#E8A598" opacity="0.7" />
      <circle cx="21" cy="20" r="0.9" fill="#B8A9C9" opacity="0.85" />
    </svg>
  );
}

function Sparkle({ size = 18, color = '#E8A598' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L13.6 9.2L20.8 10.8L13.6 12.4L12 19.6L10.4 12.4L3.2 10.8L10.4 9.2Z" fill={color} />
      <circle cx="20" cy="4" r="1.1" fill={color} opacity="0.7" />
      <circle cx="4" cy="20" r="0.8" fill={color} opacity="0.55" />
    </svg>
  );
}

function IconCalendar({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconClock({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconMapPin({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconCheck({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function BotanicalBranch() {
  return (
    <svg viewBox="0 0 400 400" width="100%" fill="none" aria-hidden="true">
      <g stroke="rgba(232,165,152,0.55)" strokeWidth="1.1" strokeLinecap="round" fill="none">
        <path d="M20 60 Q90 90 140 150 T260 260 Q310 300 380 320" />
        <path d="M80 80 Q105 60 130 80 Q105 90 80 80 Z" />
        <path d="M125 130 Q150 110 175 132 Q150 142 125 130 Z" />
        <path d="M170 175 Q200 158 222 182 Q198 192 170 175 Z" />
        <path d="M215 220 Q245 200 270 224 Q244 234 215 220 Z" />
        <path d="M265 265 Q295 248 318 270 Q294 280 265 265 Z" />
        <path d="M315 305 Q340 290 360 310 Q340 320 315 305 Z" />
        <path d="M105 105 Q100 130 122 145 Q112 122 105 105 Z" />
        <path d="M150 152 Q145 180 165 195 Q158 170 150 152 Z" />
        <path d="M198 198 Q193 226 213 240 Q208 218 198 198 Z" />
        <path d="M245 244 Q240 270 260 284 Q255 264 245 244 Z" />
        <path d="M295 286 Q290 310 308 322 Q302 304 295 286 Z" />
        <path d="M40 130 Q70 110 100 130" />
        <path d="M55 120 Q60 105 75 110 Q65 122 55 120 Z" />
        <path d="M80 122 Q90 108 100 118 Q92 128 80 122 Z" />
      </g>
      <g fill="rgba(184,169,201,0.55)">
        <circle cx="32" cy="65" r="2.2" />
        <circle cx="380" cy="320" r="2.6" />
        <circle cx="225" cy="222" r="1.6" opacity="0.75" />
        <circle cx="160" cy="138" r="1.6" opacity="0.75" />
        <circle cx="305" cy="296" r="1.8" opacity="0.85" />
      </g>
    </svg>
  );
}

// ── Layout pieces ─────────────────────────────────────────────────────────────

function BotanicalLayer() {
  return (
    <>
      <div className="dr-drift-fast" style={{ position: 'absolute', top: -40, right: -60, width: 360, pointerEvents: 'none', zIndex: 1, opacity: 0.45, transform: 'scaleX(-1)' }}>
        <BotanicalBranch />
      </div>
      <div className="dr-drift-fast" style={{ position: 'absolute', top: -40, left: -60, width: 360, pointerEvents: 'none', zIndex: 1, opacity: 0.45 }}>
        <BotanicalBranch />
      </div>
      <div className="dr-drift-slow" style={{ position: 'absolute', bottom: -60, right: -80, width: 420, pointerEvents: 'none', zIndex: 1, opacity: 0.38, transform: 'scaleX(-1) scaleY(-1)' }}>
        <BotanicalBranch />
      </div>
      <div className="dr-drift-slow" style={{ position: 'absolute', bottom: -60, left: -80, width: 420, pointerEvents: 'none', zIndex: 1, opacity: 0.38, transform: 'scaleY(-1)' }}>
        <BotanicalBranch />
      </div>
    </>
  );
}

function CoupleName({ name }: { name: string }) {
  const parts = name.split(' & ');
  if (parts.length >= 2) {
    return (
      <>
        <span>{parts[0]}</span>
        <span style={{ fontStyle: 'italic', color: C.rose, margin: '0 0.08em', fontWeight: 400 }}>&amp;</span>
        <span>{parts.slice(1).join(' & ')}</span>
      </>
    );
  }
  return <span>{name}</span>;
}

function InfoPill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '10px 16px',
      background: C.roseSoft,
      border: `1px solid rgba(232,165,152,0.22)`,
      color: C.cream,
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: '0.02em',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      fontFamily: FONT_SANS,
    }}>
      <span style={{ color: C.roseStrong, display: 'flex', flexShrink: 0 }}>{icon}</span>
      {children}
    </span>
  );
}

function DecorativeDivider() {
  return (
    <div className="dr-anim-divider" style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '56px auto 28px', maxWidth: 520 }}>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${C.lineStrong}, transparent)` }} />
      <span style={{ color: C.rose, filter: `drop-shadow(0 0 8px ${C.roseGlow})`, display: 'flex' }}>
        <Sparkle size={20} color={C.rose} />
      </span>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${C.lineStrong}, transparent)` }} />
    </div>
  );
}

// ── RSVP form ─────────────────────────────────────────────────────────────────

interface RSVPFormProps {
  dishOptions: DishOption[];
  lockGuestCount: boolean;
  initialRsvpStatus: 'pending' | 'confirmed' | 'declined';
  initialAmount: number;
  initialMealChoice: string;
  initialNotes: string;
  interactive: boolean;
  onSubmit?: (values: DarkRomanticSubmitValues) => Promise<{ success: boolean; message: string }>;
  onSuccess: (status: 'confirmed' | 'declined', count: number, dish: string) => void;
}

function RSVPForm({
  dishOptions, lockGuestCount,
  initialRsvpStatus, initialAmount, initialMealChoice, initialNotes,
  interactive, onSubmit, onSuccess,
}: RSVPFormProps) {
  const [attending, setAttending] = useState<'confirmed' | 'declined' | null>(
    initialRsvpStatus === 'pending' ? null : initialRsvpStatus,
  );
  const [count, setCount] = useState(initialAmount);
  const [dish, setDish] = useState(initialMealChoice);
  const [notes, setNotes] = useState(initialNotes);
  const [bumpKey, setBumpKey] = useState(0);
  const [ctaHovered, setCtaHovered] = useState(false);
  const [attHovered, setAttHovered] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const changeCount = (delta: number) => {
    setCount(c => Math.max(1, Math.min(10, c + delta)));
    setBumpKey(k => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attending || !interactive) return;
    setIsPending(true);
    setErrorMsg('');
    try {
      if (onSubmit) {
        const result = await onSubmit({ rsvpStatus: attending, guestCount: count, mealChoice: dish, notes });
        if (!result.success) { setErrorMsg(result.message); return; }
      }
      onSuccess(attending, count, dish);
    } finally {
      setIsPending(false);
    }
  };

  const canSubmit = attending !== null && !isPending;

  const attCard = (type: 'confirmed' | 'declined') => {
    const isSelected = attending === type;
    const isHovered  = attHovered === type && !isSelected;
    let bg: string = 'rgba(244,232,220,0.025)';
    let border: string = C.lineSoft;
    let extraClass = '';
    if (isSelected && type === 'confirmed') {
      bg = 'linear-gradient(180deg, rgba(232,165,152,0.18), rgba(232,165,152,0.08))';
      border = C.rose;
      extraClass = 'dr-glow-yes';
    } else if (isSelected && type === 'declined') {
      bg = 'rgba(184,169,201,0.10)';
      border = C.lilac;
    } else if (isHovered) {
      bg = 'rgba(232,165,152,0.04)';
      border = 'rgba(232,165,152,0.32)';
    }
    const textColor = isSelected ? (type === 'confirmed' ? C.roseStrong : C.lilac) : C.cream;
    return { bg, border, extraClass, textColor };
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="dr-anim-card"
      style={{
        position: 'relative',
        background: `linear-gradient(180deg, rgba(244,232,220,0.03), rgba(244,232,220,0.015)), ${C.bgElev}`,
        border: `1px solid ${C.lineStrong}`,
        borderRadius: 24,
        padding: 36,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: `0 1px 0 rgba(244,232,220,0.06) inset, 0 30px 60px -20px rgba(0,0,0,0.6), 0 0 80px -40px rgba(232,165,152,0.15)`,
      }}
    >
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 24, color: C.cream, margin: '0 0 6px', letterSpacing: '-0.005em' }}>
        נשמח לדעת אם תגיעו
      </h2>
      <p style={{ color: C.creamDim, fontSize: 14, margin: '0 0 28px', lineHeight: 1.6, fontFamily: FONT_SANS }}>
        אתם יכולים לעדכן את התשובה בכל עת
      </p>

      {/* Attendance toggles */}
      <div>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.creamDim, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12, fontFamily: FONT_SANS }}>
          האם תגיעו?
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {(['confirmed', 'declined'] as const).map(type => {
            const { bg, border, extraClass, textColor } = attCard(type);
            return (
              <button
                key={type}
                type="button"
                className={extraClass}
                onClick={() => interactive && setAttending(type)}
                onMouseEnter={() => setAttHovered(type)}
                onMouseLeave={() => setAttHovered(null)}
                style={{
                  appearance: 'none',
                  background: bg,
                  border: `1px solid ${border}`,
                  color: C.cream,
                  borderRadius: 18,
                  padding: '22px 16px',
                  cursor: interactive ? 'pointer' : 'default',
                  textAlign: 'center',
                  fontFamily: FONT_SANS,
                  transition: `all .35s ${EASE}`,
                  overflow: 'hidden',
                  transform: attHovered === type && attending !== type ? 'translateY(-1px)' : 'none',
                }}
              >
                <span style={{ fontSize: 28, lineHeight: 1, display: 'block', marginBottom: 10, transition: `transform .4s ${EASE}`, transform: attHovered === type && attending !== type ? 'scale(1.08)' : 'scale(1)' }}>
                  {type === 'confirmed' ? '🎉' : '💌'}
                </span>
                <span style={{ display: 'block', fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 22, color: textColor, letterSpacing: '-0.01em' }}>
                  {type === 'confirmed' ? 'אגיע' : 'לא אגיע'}
                </span>
                <span style={{ display: 'block', marginTop: 6, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, fontFamily: FONT_SANS }}>
                  {type === 'confirmed' ? 'נשמח לראותכם' : 'חבל, אבל מבינים'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional: count + dish */}
      <div style={{
        overflow: 'hidden',
        maxHeight: attending === 'confirmed' ? 800 : 0,
        opacity: attending === 'confirmed' ? 1 : 0,
        transition: `max-height .55s ${EASE}, opacity .45s ${EASE}`,
      }}>
        {/* Guest count */}
        <div style={{ marginTop: 28 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.creamDim, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12, fontFamily: FONT_SANS }}>
            כמה תהיו?
            <span style={{ color: C.rose, fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: 0, marginInlineStart: 6, fontStyle: 'italic' }}>
              {count} {count === 1 ? 'אורח' : 'אורחים'}
            </span>
          </span>
          <div dir="ltr" style={{ display: 'inline-flex', alignItems: 'center', gap: 18, background: 'rgba(244,232,220,0.03)', border: `1px solid ${C.lineSoft}`, borderRadius: 999, padding: 8 }}>
            <button
              type="button"
              onClick={() => interactive && !lockGuestCount && changeCount(-1)}
              disabled={count <= 1 || lockGuestCount}
              aria-label="הפחת"
              style={{
                appearance: 'none', border: `1px solid ${C.lineStrong}`,
                background: 'rgba(244,232,220,0.04)', color: C.cream,
                width: 40, height: 40, borderRadius: 999, fontSize: 20,
                cursor: count <= 1 || lockGuestCount ? 'not-allowed' : 'pointer',
                display: 'grid', placeItems: 'center',
                opacity: count <= 1 || lockGuestCount ? 0.35 : 1,
                transition: `all .25s ${EASE}`,
                fontFamily: FONT_SANS,
              }}
            >−</button>
            <span
              key={bumpKey}
              className="dr-bump"
              style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 32, minWidth: 56, textAlign: 'center', color: C.cream, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
            >
              {count}
            </span>
            <button
              type="button"
              onClick={() => interactive && !lockGuestCount && changeCount(1)}
              disabled={count >= 10 || lockGuestCount}
              aria-label="הוסף"
              style={{
                appearance: 'none', border: `1px solid ${C.lineStrong}`,
                background: 'rgba(244,232,220,0.04)', color: C.cream,
                width: 40, height: 40, borderRadius: 999, fontSize: 20,
                cursor: count >= 10 || lockGuestCount ? 'not-allowed' : 'pointer',
                display: 'grid', placeItems: 'center',
                opacity: count >= 10 || lockGuestCount ? 0.35 : 1,
                transition: `all .25s ${EASE}`,
                fontFamily: FONT_SANS,
              }}
            >+</button>
          </div>
        </div>

        {/* Dish chips */}
        {dishOptions.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.creamDim, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12, fontFamily: FONT_SANS }}>
              העדפת מנה
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
              {dishOptions.map(d => {
                const isSelected = dish === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => interactive && setDish(dish === d.id ? '' : d.id)}
                    style={{
                      appearance: 'none',
                      background: isSelected ? 'rgba(232,165,152,0.10)' : 'rgba(244,232,220,0.025)',
                      border: `1px solid ${isSelected ? C.rose : C.lineSoft}`,
                      color: isSelected ? C.roseStrong : C.cream,
                      borderRadius: 14,
                      padding: '14px 12px',
                      cursor: interactive ? 'pointer' : 'default',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      fontFamily: FONT_SANS, fontSize: 13,
                      boxShadow: isSelected ? `0 0 0 1px rgba(232,165,152,0.4), 0 0 32px -10px ${C.roseGlow}` : 'none',
                      transition: `all .3s ${EASE}`,
                    }}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1, filter: 'saturate(0.8)' }}>{d.emoji}</span>
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={{ marginTop: 28 }}>
        <label htmlFor="dr-notes" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.creamDim, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12, fontFamily: FONT_SANS }}>
          הערות לזוג
        </label>
        <textarea
          id="dr-notes"
          rows={3}
          placeholder="נסיעה משותפת? צרכים מיוחדים? משהו שתרצו לספר…"
          value={notes}
          onChange={e => interactive && setNotes(e.target.value)}
          readOnly={!interactive}
          style={{
            width: '100%',
            background: 'rgba(244,232,220,0.03)',
            border: `1px solid ${C.lineSoft}`,
            color: C.cream,
            borderRadius: 14,
            padding: '14px 16px',
            minHeight: 96,
            resize: 'vertical',
            fontFamily: FONT_SANS,
            fontSize: 14,
            lineHeight: 1.55,
            outline: 'none',
            cursor: interactive ? 'text' : 'default',
          }}
        />
      </div>

      {errorMsg && (
        <p style={{ textAlign: 'center', color: '#e63946', fontSize: 14, marginTop: 12, marginBottom: 0 }}>{errorMsg}</p>
      )}

      {/* CTA */}
      {interactive && (
        <div style={{ marginTop: 32 }}>
          <button
            type="submit"
            disabled={!canSubmit}
            onMouseEnter={() => setCtaHovered(true)}
            onMouseLeave={() => setCtaHovered(false)}
            style={{
              position: 'relative',
              width: '100%',
              appearance: 'none',
              border: 0,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: 'linear-gradient(180deg, #EFB4A6 0%, #E8A598 50%, #D9907E 100%)',
              color: '#1A0D0A',
              fontFamily: FONT_SANS,
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              padding: '18px 24px',
              borderRadius: 14,
              overflow: 'hidden',
              opacity: canSubmit ? 1 : 0.45,
              transform: ctaHovered && canSubmit ? 'translateY(-1px)' : 'none',
              transition: `transform .25s ${EASE}, box-shadow .35s ${EASE}, opacity .2s`,
              boxShadow: `0 1px 0 rgba(255,255,255,0.4) inset, 0 0 0 1px rgba(232,165,152,0.45), 0 12px 40px -10px ${C.roseGlow}`,
            }}
          >
            <span style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)',
              transform: ctaHovered && canSubmit ? 'translateX(120%)' : 'translateX(-120%)',
              transition: `transform .9s ${EASE}`,
              pointerEvents: 'none',
              zIndex: 1,
            }} />
            <span style={{ position: 'relative', zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              {isPending ? '...' : 'שליחת אישור'}
              {!isPending && <Sparkle size={16} color="#1A0D0A" />}
            </span>
          </button>
        </div>
      )}
    </form>
  );
}

// ── Success view ──────────────────────────────────────────────────────────────

function SuccessView({ attending, count, dish, onReset, dishOptions, formattedDate, venue, interactive }: {
  attending: 'confirmed' | 'declined';
  count: number;
  dish: string;
  onReset: () => void;
  dishOptions: DishOption[];
  formattedDate?: string;
  venue?: string;
  interactive: boolean;
}) {
  const dishLabel = dishOptions.find(d => d.id === dish)?.label;

  return (
    <div
      className="dr-anim-card"
      style={{
        position: 'relative',
        background: `linear-gradient(180deg, rgba(244,232,220,0.03), rgba(244,232,220,0.015)), ${C.bgElev}`,
        border: `1px solid ${C.lineStrong}`,
        borderRadius: 24,
        padding: 36,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: `0 1px 0 rgba(244,232,220,0.06) inset, 0 30px 60px -20px rgba(0,0,0,0.6), 0 0 80px -40px rgba(232,165,152,0.15)`,
        textAlign: 'center',
      }}
    >
      <div
        className="dr-glow-icon"
        style={{
          width: 72, height: 72,
          margin: '0 auto 18px',
          borderRadius: 999,
          background: `radial-gradient(circle at 50% 45%, rgba(232,165,152,0.35), rgba(232,165,152,0.05) 70%)`,
          display: 'grid', placeItems: 'center',
          color: C.roseStrong,
        }}
      >
        {attending === 'declined'
          ? <Sparkle size={32} color={C.lilac} />
          : <IconCheck size={36} />}
      </div>

      <h2 style={{ fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: 500, fontSize: 36, color: C.cream, margin: '8px 0 10px' }}>
        {attending === 'declined' ? 'נחמיץ אתכם' : 'נתראה בשמחות'}
      </h2>

      <p style={{ color: C.creamDim, fontSize: 15, lineHeight: 1.7, maxWidth: 420, margin: '0 auto', fontFamily: FONT_SANS }}>
        {attending === 'declined'
          ? 'תודה שעדכנתם אותנו. אם משהו ישתנה — תמיד אפשר לחזור לדף הזה ולעדכן'
          : <>שמרנו את האישור שלכם. ניפגש ב־<strong style={{ color: C.cream }}>{venue ?? formattedDate ?? ''}</strong></>
        }
      </p>

      {attending === 'confirmed' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 22 }}>
          <InfoPill icon={<Sparkle size={12} color={C.rose} />}>
            {count} {count === 1 ? 'אורח' : 'אורחים'}
          </InfoPill>
          {dishLabel && (
            <InfoPill icon={<Sparkle size={12} color={C.rose} />}>{dishLabel}</InfoPill>
          )}
          <InfoPill icon={<IconCalendar size={14} />}>הוספה ליומן</InfoPill>
        </div>
      )}

      {interactive && (
        <button
          type="button"
          onClick={onReset}
          style={{
            marginTop: 22,
            appearance: 'none',
            background: 'transparent',
            color: C.creamDim,
            border: `1px solid ${C.lineStrong}`,
            borderRadius: 999,
            padding: '10px 18px',
            fontSize: 12,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: FONT_SANS,
            transition: `all .25s ${EASE}`,
          }}
        >
          עריכת התשובה
        </button>
      )}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function DarkRomanticDesign({
  coupleName,
  formattedDate,
  time,
  venue,
  dishOptions = [],
  lockGuestCount = false,
  initialRsvpStatus = 'pending',
  initialAmount = 1,
  initialMealChoice = '',
  initialNotes = '',
  interactive = true,
  onSubmit,
}: DarkRomanticDesignProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<'confirmed' | 'declined' | null>(null);
  const [submittedCount, setSubmittedCount] = useState(initialAmount);
  const [submittedDish, setSubmittedDish] = useState(initialMealChoice);

  useEffect(() => { ensureAssets(); }, []);

  const handleSuccess = (status: 'confirmed' | 'declined', count: number, dish: string) => {
    setSubmittedStatus(status);
    setSubmittedCount(count);
    setSubmittedDish(dish);
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubmittedStatus(null);
  };

  const grainSvg = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.91  0 0 0 0 0.86  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

  return (
    <div
      dir="rtl"
      style={{
        position: 'relative',
        minHeight: '100vh',
        isolation: 'isolate',
        background: `
          radial-gradient(ellipse 80% 50% at 18% 8%, rgba(232,165,152,0.10), transparent 70%),
          radial-gradient(ellipse 70% 60% at 88% 22%, rgba(184,169,201,0.09), transparent 65%),
          radial-gradient(ellipse 90% 60% at 50% 110%, rgba(232,165,152,0.06), transparent 70%),
          linear-gradient(180deg, #0A1622 0%, #0D1B2A 35%, #0F1F30 70%, #0B1825 100%)
        `,
        fontFamily: FONT_SANS,
        fontWeight: 400,
        color: C.cream,
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'hidden',
      }}
    >
      {/* Grain overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: grainSvg, opacity: 0.55, mixBlendMode: 'overlay' }} />

      <BotanicalLayer />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Brand */}
        <div className="dr-anim-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: C.cream, fontFamily: FONT_SANS, fontWeight: 500, letterSpacing: '0.16em', fontSize: 13, textTransform: 'uppercase' }}>
          <span style={{ display: 'inline-grid', placeItems: 'center', width: 22, height: 22 }}>
            <KululuMark size={20} />
          </span>
          <span>Kululu</span>
        </div>

        {/* Hero */}
        {!submitted && (
          <header style={{ textAlign: 'center', padding: '56px 12px 16px' }}>
            <div className="dr-anim-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: C.creamDim, fontFamily: FONT_SANS, fontSize: 12, letterSpacing: '0.32em', textTransform: 'uppercase', marginBottom: 22 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.rose, boxShadow: `0 0 12px ${C.roseGlow}`, flexShrink: 0 }} />
              <span>הזמנה לחתונה</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.rose, boxShadow: `0 0 12px ${C.roseGlow}`, flexShrink: 0 }} />
            </div>

            {coupleName && (
              <h1 className="dr-anim-couple" style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(48px, 9vw, 96px)', lineHeight: 1.02, letterSpacing: '-0.01em', color: C.cream, margin: '0 0 6px' }}>
                <CoupleName name={coupleName} />
              </h1>
            )}

            <div className="dr-anim-sub" style={{ fontFamily: FONT_SANS, fontSize: 14, color: C.creamDim, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 18 }}>
              מתחתנים
            </div>

            <div className="dr-anim-info" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 28 }}>
              {formattedDate && <InfoPill icon={<IconCalendar size={14} />}>{formattedDate}</InfoPill>}
              {time && <InfoPill icon={<IconClock size={14} />}>{time}</InfoPill>}
              {venue && <InfoPill icon={<IconMapPin size={14} />}>{venue}</InfoPill>}
            </div>
          </header>
        )}

        {submitted && (
          <header style={{ textAlign: 'center', padding: '56px 12px 16px' }}>
            <div className="dr-anim-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: C.creamDim, fontFamily: FONT_SANS, fontSize: 12, letterSpacing: '0.32em', textTransform: 'uppercase', marginBottom: 22 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.rose, flexShrink: 0 }} />
              <span>{submittedStatus === 'declined' ? 'תודה שעדכנתם' : 'אישור התקבל'}</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.rose, flexShrink: 0 }} />
            </div>
          </header>
        )}

        <DecorativeDivider />

        {submitted && submittedStatus ? (
          <SuccessView
            attending={submittedStatus}
            count={submittedCount}
            dish={submittedDish}
            onReset={handleReset}
            dishOptions={dishOptions}
            formattedDate={formattedDate}
            venue={venue}
            interactive={interactive}
          />
        ) : (
          <RSVPForm
            dishOptions={dishOptions}
            lockGuestCount={lockGuestCount}
            initialRsvpStatus={initialRsvpStatus}
            initialAmount={initialAmount}
            initialMealChoice={initialMealChoice}
            initialNotes={initialNotes}
            interactive={interactive}
            onSubmit={onSubmit}
            onSuccess={handleSuccess}
          />
        )}

        <div className="dr-anim-footer" style={{ textAlign: 'center', marginTop: 40, color: C.lilac, fontSize: 11, letterSpacing: '0.4em', textTransform: 'uppercase', opacity: 0.55, fontFamily: FONT_SANS }}>
          מופעל באהבה על־ידי <strong>Kululu</strong>
        </div>
      </div>
    </div>
  );
}
