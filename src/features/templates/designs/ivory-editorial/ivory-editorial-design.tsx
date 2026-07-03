'use client';

import { useState, useEffect } from 'react';
import type { DishOption } from '../kululu-confetti/kululu-confetti-design';

export type { DishOption };

export interface IvoryEditorialSubmitValues {
  rsvpStatus: 'confirmed' | 'declined';
  guestCount: number;
  mealChoice: string;
  notes: string;
}

export interface IvoryEditorialDesignProps {
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
  onSubmit?: (values: IvoryEditorialSubmitValues) => Promise<{ success: boolean; message: string }>;
}

const STYLE_ID = 'ivory-editorial-styles';
const FONT_ID  = 'ivory-editorial-fonts';

function ensureAssets() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById(FONT_ID)) {
    const link = document.createElement('link');
    link.id = FONT_ID;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Frank+Ruhl+Libre:wght@300;400;500;700&family=Heebo:wght@200;300;400;500;600&display=swap';
    document.head.appendChild(link);
  }
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes ie-fade-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes ie-seal{0%{transform:scale(0.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
    @keyframes ie-shimmer{from{right:-80%}to{right:120%}}
    @keyframes ie-bump{0%{transform:scale(1)}40%{transform:scale(1.15)}100%{transform:scale(1)}}
    .ie-anim-brand{animation:ie-fade-up .9s cubic-bezier(.16,1,.3,1) .1s both}
    .ie-anim-eyebrow{animation:ie-fade-up .9s cubic-bezier(.16,1,.3,1) .25s both}
    .ie-anim-names{animation:ie-fade-up 1.1s cubic-bezier(.16,1,.3,1) .35s both}
    .ie-anim-divider{animation:ie-fade-up .9s cubic-bezier(.16,1,.3,1) .5s both}
    .ie-anim-meta{animation:ie-fade-up .9s cubic-bezier(.16,1,.3,1) .6s both}
    .ie-anim-card{animation:ie-fade-up 1s cubic-bezier(.16,1,.3,1) .75s both}
    .ie-anim-footer{animation:ie-fade-up .9s cubic-bezier(.16,1,.3,1) 1.4s both}
    .ie-seal-pop{animation:ie-seal .7s cubic-bezier(.16,1,.3,1)}
    .ie-bump{animation:ie-bump .35s cubic-bezier(.16,1,.3,1)}
    .ie-cta:hover .ie-shimmer{animation:ie-shimmer 1.1s ease forwards}
    @media(prefers-reduced-motion:reduce){
      .ie-anim-brand,.ie-anim-eyebrow,.ie-anim-names,.ie-anim-divider,.ie-anim-meta,
      .ie-anim-card,.ie-anim-footer,.ie-seal-pop,.ie-bump{
        animation:none!important;opacity:1!important;transform:none!important
      }
    }
  `;
  document.head.appendChild(el);
}

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  ivory:   '#FAF6EE',
  ivory2:  '#F3ECDE',
  paper:   '#FFFDF8',
  gold:    '#C9A96E',
  gold2:   '#B8954E',
  gold3:   '#E6D4A6',
  ink:     '#1A1614',
  ink2:    '#3B342D',
  muted:   '#8A7E6E',
  line:    '#D9CDB4',
  line2:   '#EDE3D0',
} as const;

const EASE         = 'cubic-bezier(.16,1,.3,1)';
const FONT_DISPLAY = "'Frank Ruhl Libre', 'Cormorant Garamond', Georgia, serif";
const FONT_ACCENT  = "'Cormorant Garamond', Georgia, serif";
const FONT_SANS    = "'Heebo', ui-sans-serif, system-ui, sans-serif";
const FONT_SANS_EN = "'Jost', 'Heebo', ui-sans-serif, system-ui, sans-serif";

// ── SVG pieces ────────────────────────────────────────────────────────────────

function FireworksIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5.8 11.3 2 22l10.7-3.79" />
      <path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01" />
      <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
      <path d="m22 13-1.65-.78a2.73 2.73 0 0 0-3.13.55L17 13.55c-.16.16-.34.3-.55.41A2.73 2.73 0 0 1 13 13" />
      <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2" />
    </svg>
  );
}

function CheckIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 16l6 6 12-14" />
    </svg>
  );
}

function BotanicalDivider() {
  return (
    <svg viewBox="0 0 32 32" width={18} height={18} fill="none"
      stroke={C.gold2} strokeWidth="0.9" strokeLinecap="round" aria-hidden="true">
      <path d="M16 4 L16 28" />
      <path d="M16 10 C 10 11, 8 14, 8 18" />
      <path d="M16 10 C 22 11, 24 14, 24 18" />
      <path d="M16 16 C 11 17, 10 19, 10 22" />
      <path d="M16 16 C 21 17, 22 19, 22 22" />
      <circle cx="16" cy="4" r="1.2" fill={C.gold2} stroke="none" />
    </svg>
  );
}

// ── Layout pieces ─────────────────────────────────────────────────────────────

function CoupleName({ name }: { name: string }) {
  const parts = name.split(' & ');
  if (parts.length >= 2) {
    return (
      <>
        <span>{parts[0]}</span>
        <span style={{ fontFamily: FONT_ACCENT, fontStyle: 'italic', fontWeight: 400, color: C.gold2, margin: '0 0.12em', fontSize: '0.82em', verticalAlign: '0.04em' }}>
          &amp;
        </span>
        <span>{parts.slice(1).join(' & ')}</span>
      </>
    );
  }
  return <span>{name}</span>;
}

function Divider() {
  return (
    <div className="ie-anim-divider" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '36px auto 28px', maxWidth: 280 }}>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${C.gold} 40%, ${C.gold} 60%, transparent)` }} />
      <BotanicalDivider />
      <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${C.gold} 40%, ${C.gold} 60%, transparent)` }} />
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
  onSubmit?: (values: IvoryEditorialSubmitValues) => Promise<{ success: boolean; message: string }>;
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
  const [count, setCount]   = useState(initialAmount);
  const [dish, setDish]     = useState(initialMealChoice);
  const [notes, setNotes]   = useState(initialNotes);
  const [bumpKey, setBumpKey] = useState(0);
  const [ctaHovered, setCtaHovered] = useState(false);
  const [isPending, setIsPending]   = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');

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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: FONT_SANS,
    fontSize: 11,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color: C.ink2,
    marginBottom: 14,
    fontWeight: 500,
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="ie-anim-card"
      style={{
        background: C.paper,
        border: `1px solid ${C.line2}`,
        borderRadius: 2,
        padding: '48px 44px 40px',
        position: 'relative',
        boxShadow: `0 1px 0 rgba(201,169,110,0.15), 0 30px 60px -30px rgba(58,45,25,0.18), 0 8px 24px -12px rgba(58,45,25,0.08)`,
      }}
    >
      {/* Inner hairline — letterpress feel */}
      <div style={{ position: 'absolute', inset: 6, border: `1px solid ${C.line2}`, borderRadius: 1, pointerEvents: 'none' }} />

      <p style={{ textAlign: 'center', fontFamily: FONT_SANS_EN, fontSize: 10, letterSpacing: '0.5em', textTransform: 'uppercase', color: C.gold2, margin: '0 0 6px', fontWeight: 400 }}>
        RSVP
      </p>
      <h2 style={{ textAlign: 'center', fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 400, color: C.ink, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
        נשמח לדעת אם תגיעו
      </h2>
      <p style={{ textAlign: 'center', fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontSize: 15, color: C.muted, margin: '0 0 36px', fontWeight: 300 }}>
        אישור הגעה
      </p>

      {/* Attendance pills */}
      <div style={{ marginBottom: 32 }}>
        <label style={labelStyle}>האם תגיעו לאירוע</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {(['confirmed', 'declined'] as const).map(type => {
            const isActive = attending === type;
            const isDecline = type === 'declined';
            return (
              <button
                key={type}
                type="button"
                onClick={() => interactive && setAttending(type)}
                style={{
                  appearance: 'none',
                  background: isActive && !isDecline ? C.ink : isActive && isDecline ? 'transparent' : 'transparent',
                  border: `1px solid ${isActive ? (isDecline ? C.ink2 : C.ink) : C.line}`,
                  borderRadius: 999,
                  padding: '16px 20px',
                  fontFamily: FONT_DISPLAY,
                  fontSize: 16,
                  fontWeight: 400,
                  color: isActive && !isDecline ? C.paper : isActive && isDecline ? C.ink2 : C.ink2,
                  cursor: interactive ? 'pointer' : 'default',
                  transition: `all .35s ${EASE}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  letterSpacing: '0.02em',
                }}
              >
                <span>{type === 'confirmed' ? 'אגיע בשמחה' : 'לא אוכל להגיע'}</span>
                <span style={{ fontFamily: FONT_ACCENT, fontSize: 14, color: isActive && !isDecline ? C.gold : isActive && isDecline ? C.ink2 : C.gold2, transition: `color .35s ease` }}>
                  {type === 'confirmed' ? '✓' : '✗'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional: confirmed */}
      <div style={{
        overflow: 'hidden',
        maxHeight: attending === 'confirmed' ? 700 : 0,
        opacity: attending === 'confirmed' ? 1 : 0,
        transition: `max-height .55s ${EASE}, opacity .45s ${EASE}`,
      }}>
        {/* Guest stepper */}
        <div style={{ marginBottom: 32 }}>
          <label style={labelStyle}>מספר אורחים</label>
          <div dir="ltr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}`, paddingBottom: 10, maxWidth: 260 }}>
            {[{ delta: -1, label: '−', disabled: count <= 1 || lockGuestCount }, { delta: 1, label: '+', disabled: count >= 10 || lockGuestCount }].map((btn, i) => (
              i === 0 ? (
                <button
                  key="minus"
                  type="button"
                  onClick={() => interactive && !btn.disabled && changeCount(btn.delta)}
                  disabled={btn.disabled}
                  aria-label="הפחת"
                  style={{
                    appearance: 'none',
                    background: 'transparent',
                    border: `1px solid ${C.line}`,
                    width: 36, height: 36,
                    borderRadius: '50%',
                    fontSize: 18,
                    color: C.ink2,
                    cursor: btn.disabled ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: `all .25s ease`,
                    fontFamily: FONT_ACCENT,
                    fontWeight: 300,
                    opacity: btn.disabled ? 0.3 : 1,
                  }}
                >{btn.label}</button>
              ) : null
            ))}
            <span
              key={bumpKey}
              className="ie-bump"
              style={{ fontFamily: FONT_DISPLAY, fontSize: 40, fontWeight: 300, color: C.ink, minWidth: 80, textAlign: 'center', lineHeight: 1 }}
            >
              {count}
            </span>
            <button
              type="button"
              onClick={() => interactive && count < 10 && !lockGuestCount && changeCount(1)}
              disabled={count >= 10 || lockGuestCount}
              aria-label="הוסף"
              style={{
                appearance: 'none',
                background: 'transparent',
                border: `1px solid ${C.line}`,
                width: 36, height: 36,
                borderRadius: '50%',
                fontSize: 18,
                color: C.ink2,
                cursor: count >= 10 || lockGuestCount ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: `all .25s ease`,
                fontFamily: FONT_ACCENT,
                fontWeight: 300,
                opacity: count >= 10 || lockGuestCount ? 0.3 : 1,
              }}
            >+</button>
          </div>
          <p style={{ fontFamily: FONT_SANS, fontSize: 12, color: C.muted, marginTop: 10, fontWeight: 300 }}>
            {count === 1 ? 'אורח אחד' : `${count} אורחים, כולל אתכם`}
          </p>
        </div>

        {/* Dish chips */}
        {dishOptions.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <label style={labelStyle}>
              בחירת מנה{' '}
              <span style={{ fontFamily: FONT_ACCENT, fontStyle: 'italic', fontSize: 12, letterSpacing: '0.02em', textTransform: 'none', color: C.muted, fontWeight: 400, marginRight: 6 }}>
                אופציונלי
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(dishOptions.length, 3)}, 1fr)`, gap: 10 }}>
              {dishOptions.map(d => {
                const isActive = dish === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => interactive && setDish(dish === d.id ? '' : d.id)}
                    style={{
                      appearance: 'none',
                      background: isActive ? C.paper : C.ivory,
                      border: `1px solid ${isActive ? C.gold2 : C.line2}`,
                      borderRadius: 4,
                      padding: '18px 12px 14px',
                      textAlign: 'center',
                      cursor: interactive ? 'pointer' : 'default',
                      transition: `all .3s ease`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      fontFamily: FONT_SANS,
                      fontSize: 13,
                      color: C.ink2,
                      fontWeight: 400,
                      position: 'relative',
                      boxShadow: isActive ? `0 0 0 1px ${C.gold2} inset` : 'none',
                    }}
                  >
                    {isActive && (
                      <span style={{
                        position: 'absolute', top: 6, left: 6,
                        width: 14, height: 14, borderRadius: '50%',
                        background: C.gold2, color: C.paper,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9,
                      }}>✓</span>
                    )}
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{d.emoji}</span>
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Decline note */}
      {attending === 'declined' && (
        <div style={{
          background: C.ivory,
          borderRight: `2px solid ${C.gold}`,
          padding: '18px 22px',
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          fontSize: 15,
          color: C.ink2,
          marginBottom: 28,
          lineHeight: 1.7,
        }}>
          נתגעגע אליכם בערב הזה. אם רוצים להשאיר ברכה לזוג — אנחנו מבטיחים להעביר אותה.
        </div>
      )}

      {/* Notes */}
      {attending && (
        <div style={{ marginBottom: 32 }}>
          <label style={labelStyle}>
            ברכה לזוג{' '}
            <span style={{ fontFamily: FONT_ACCENT, fontStyle: 'italic', fontSize: 12, letterSpacing: '0.02em', textTransform: 'none', color: C.muted, fontWeight: 400, marginRight: 6 }}>
              אופציונלי
            </span>
          </label>
          <div style={{
            background: C.paper,
            border: `1px solid ${C.line}`,
            borderRadius: 3,
            padding: '16px 18px',
            transition: `border-color .3s ease`,
          }}>
            <textarea
              rows={3}
              placeholder="כותבים מהלב…"
              value={notes}
              onChange={e => interactive && setNotes(e.target.value)}
              readOnly={!interactive}
              style={{
                width: '100%',
                background: 'transparent',
                border: 0,
                outline: 0,
                resize: 'none',
                fontFamily: FONT_DISPLAY,
                fontSize: 16,
                fontWeight: 300,
                lineHeight: '32px',
                color: C.ink,
                cursor: interactive ? 'text' : 'default',
              }}
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <p style={{ textAlign: 'center', color: '#e63946', fontSize: 14, marginBottom: 12 }}>{errorMsg}</p>
      )}

      {/* CTA */}
      {interactive && (
        <>
          <button
            type="submit"
            disabled={!canSubmit}
            className="ie-cta"
            onMouseEnter={() => setCtaHovered(true)}
            onMouseLeave={() => setCtaHovered(false)}
            style={{
              position: 'relative',
              width: '100%',
              appearance: 'none',
              border: 0,
              background: C.gold,
              color: C.ink,
              padding: '22px 24px',
              fontFamily: FONT_DISPLAY,
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: '0.08em',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              overflow: 'hidden',
              marginTop: 8,
              transition: `background .3s ease, transform .3s ease`,
              borderRadius: 2,
              boxShadow: `0 1px 0 ${C.gold2} inset, 0 12px 28px -16px rgba(184,149,78,0.6)`,
              opacity: canSubmit ? 1 : 0.5,
              transform: ctaHovered && canSubmit ? 'translateY(-1px)' : 'none',
            }}
          >
            <span
              className="ie-shimmer"
              style={{
                position: 'absolute', top: 0, bottom: 0,
                width: '60%',
                background: 'linear-gradient(120deg, transparent, rgba(255,253,248,0.5), transparent)',
                right: '-80%',
                pointerEvents: 'none',
              }}
            />
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <span>{isPending ? '...' : 'שליחת אישור הגעה'}</span>
              {!isPending && <span style={{ fontFamily: FONT_ACCENT, fontWeight: 400, transition: `transform .3s ease`, transform: ctaHovered ? 'translateX(-4px)' : 'none' }}>←</span>}
            </span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 22, fontFamily: FONT_SANS, fontSize: 11, letterSpacing: '0.2em', color: C.muted, fontWeight: 400, textTransform: 'uppercase' }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
            <span>נשמח לאישור הגעה</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
          </div>
        </>
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
  const isYes = attending === 'confirmed';

  return (
    <div
      className="ie-anim-card"
      style={{
        background: C.paper,
        border: `1px solid ${C.line2}`,
        borderRadius: 2,
        padding: '48px 44px 40px',
        position: 'relative',
        boxShadow: `0 1px 0 rgba(201,169,110,0.15), 0 30px 60px -30px rgba(58,45,25,0.18), 0 8px 24px -12px rgba(58,45,25,0.08)`,
        textAlign: 'center',
      }}
    >
      <div style={{ position: 'absolute', inset: 6, border: `1px solid ${C.line2}`, borderRadius: 1, pointerEvents: 'none' }} />

      {/* Seal */}
      <div
        className="ie-seal-pop"
        style={{
          width: 78, height: 78,
          border: `1px solid ${C.gold}`,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          position: 'relative',
          color: C.gold2,
        }}
      >
        <div style={{ position: 'absolute', inset: 4, border: `1px solid ${C.gold3}`, borderRadius: '50%' }} />
        {isYes
          ? <CheckIcon size={30} />
          : <span style={{ fontFamily: FONT_ACCENT, fontStyle: 'italic', fontSize: 18, color: C.gold2 }}>✦</span>
        }
      </div>

      <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 400, color: C.ink, margin: '0 0 10px', letterSpacing: '-0.01em' }}>
        {isYes ? 'תודה — נתראה בקרוב' : 'תודה ששיתפתם אותנו'}
      </h2>
      <p style={{ fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontSize: 17, color: C.ink2, fontWeight: 300, lineHeight: 1.6, maxWidth: 380, margin: '0 auto 28px' }}>
        {isYes
          ? `שמרנו לכם ${count === 1 ? 'מקום אחד' : `${count} מקומות`}. נשלח אליכם תזכורת ופרטים נוספים יום לפני האירוע.`
          : 'מצטערים שלא תוכלו להגיע — תקבלו תמונות ועדכונים אחרי החתונה.'
        }
      </p>

      {isYes && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: '14px 26px', borderTop: `1px solid ${C.line2}`, borderBottom: `1px solid ${C.line2}`, fontFamily: FONT_SANS, fontSize: 12, color: C.muted, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          <div>
            <div style={{ fontSize: 9, marginBottom: 2 }}>תאריך</div>
            <strong style={{ fontFamily: FONT_DISPLAY, fontStyle: 'normal', color: C.ink, fontWeight: 500, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>
              {(venue ?? formattedDate ?? '').split('·')[0]?.trim() || formattedDate}
            </strong>
          </div>
          {venue && (
            <>
              <span style={{ width: 1, height: 14, background: C.line, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 9, marginBottom: 2 }}>מקום</div>
                <strong style={{ fontFamily: FONT_DISPLAY, fontStyle: 'normal', color: C.ink, fontWeight: 500, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>{venue}</strong>
              </div>
            </>
          )}
          <span style={{ width: 1, height: 14, background: C.line, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 9, marginBottom: 2 }}>אורחים</div>
            <strong style={{ fontFamily: FONT_DISPLAY, fontStyle: 'normal', color: C.ink, fontWeight: 500, fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>{count}</strong>
          </div>
        </div>
      )}

      {interactive && (
        <button
          type="button"
          onClick={onReset}
          style={{
            background: 'transparent',
            border: 0,
            marginTop: 28,
            fontFamily: FONT_ACCENT,
            fontStyle: 'italic',
            fontSize: 13,
            color: C.muted,
            cursor: 'pointer',
            letterSpacing: '0.02em',
            textDecoration: 'underline',
            textDecorationColor: C.gold,
            textUnderlineOffset: 4,
          }}
        >
          ערוך את האישור
        </button>
      )}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function IvoryEditorialDesign({
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
}: IvoryEditorialDesignProps) {
  const [submitted, setSubmitted]         = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<'confirmed' | 'declined' | null>(null);
  const [submittedCount, setSubmittedCount]   = useState(initialAmount);
  const [submittedDish, setSubmittedDish]     = useState(initialMealChoice);

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

  return (
    <div
      dir="rtl"
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: C.ivory,
        fontFamily: FONT_SANS,
        fontWeight: 300,
        color: C.ink,
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'hidden',
      }}
    >
      {/* Soft radial wash */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 60% 40% at 50% 0%, rgba(201,169,110,0.06), transparent 70%),
          radial-gradient(ellipse 50% 30% at 50% 100%, rgba(201,169,110,0.04), transparent 70%)
        `,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '56px 32px 80px' }}>

        {/* Brand */}
        <div className="ie-anim-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.muted, marginBottom: 64 }}>
          <span style={{ color: C.gold2, display: 'flex' }}><FireworksIcon size={14} /></span>
          <span style={{ fontFamily: FONT_SANS_EN, fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 400 }}>
            Kululu
          </span>
        </div>

        {/* Hero */}
        {!submitted && (
          <header style={{ textAlign: 'center', marginBottom: 56 }}>
            <p className="ie-anim-eyebrow" style={{ fontFamily: FONT_SANS_EN, fontSize: 10, letterSpacing: '0.5em', textTransform: 'uppercase', color: C.gold2, margin: '0 0 28px', fontWeight: 400 }}>
              Save the Date · 2026
            </p>
            {coupleName && (
              <h1 className="ie-anim-names" style={{ fontFamily: FONT_DISPLAY, fontWeight: 300, fontSize: 'clamp(56px, 10vw, 92px)', lineHeight: 1, color: C.ink, margin: 0, letterSpacing: '-0.01em' }}>
                <CoupleName name={coupleName} />
              </h1>
            )}

            <Divider />

            <div className="ie-anim-meta">
              {formattedDate && (
                <p style={{ fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: '0.04em', margin: '0 0 8px', fontWeight: 400, color: C.ink2 }}>
                  {formattedDate}
                </p>
              )}
              {time && (
                <p style={{ fontFamily: FONT_SANS_EN, fontSize: 12, letterSpacing: '0.4em', color: C.muted, textTransform: 'uppercase', margin: '0 0 22px', fontWeight: 300 }}>
                  {time}
                </p>
              )}
              {venue && (
                <>
                  <p style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 400, color: C.ink, margin: '0 0 4px', letterSpacing: '0.02em' }}>
                    {venue}
                  </p>
                </>
              )}
            </div>
          </header>
        )}

        {submitted && (
          <header style={{ textAlign: 'center', marginBottom: 40 }}>
            <p className="ie-anim-eyebrow" style={{ fontFamily: FONT_SANS_EN, fontSize: 10, letterSpacing: '0.5em', textTransform: 'uppercase', color: C.gold2, margin: '0 0 10px', fontWeight: 400 }}>
              {submittedStatus === 'declined' ? 'תודה ששיתפתם' : 'אישור התקבל'}
            </p>
          </header>
        )}

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

        <div className="ie-anim-footer" style={{ textAlign: 'center', marginTop: 56, fontFamily: FONT_SANS_EN, fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: C.muted, opacity: 0.7 }}>
          מופעל על ידי <span style={{ color: C.gold2 }}>◆</span> Kululu
        </div>
      </div>
    </div>
  );
}
