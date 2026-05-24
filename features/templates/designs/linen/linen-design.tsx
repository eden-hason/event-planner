'use client';

import { useState } from 'react';

export interface DishOption {
  id: string;
  emoji: string;
  label: string;
}

export interface LinenSubmitValues {
  rsvpStatus: 'confirmed' | 'declined';
  guestCount: number;
  mealChoice: string;
  notes: string;
}

export interface LinenDesignProps {
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
  palette?: [string, string];
  interactive?: boolean;
  onSubmit?: (values: LinenSubmitValues) => Promise<{ success: boolean; message: string }>;
}

const C = {
  bg: '#FFFFFF',
  surface: '#FAFAFA',
  text: '#18181B',
  muted: '#71717A',
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',
};

function Header({
  coupleName,
  formattedDate,
  time,
  venue,
  mapsLink,
  primary,
}: {
  coupleName?: string;
  formattedDate?: string;
  time?: string;
  venue?: string;
  mapsLink?: string;
  primary: string;
}) {
  const parts = coupleName?.split(' & ') ?? [];
  const p1 = parts[0];
  const p2 = parts[1];

  return (
    <header
      style={{
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        padding: '32px 24px 28px',
        textAlign: 'center',
      }}
    >
      {p1 && (
        <div style={{ marginBottom: 20, animation: 'linenFadeUp 0.55s ease 0.1s both' }}>
          <div
            style={{
              fontSize: 'clamp(28px, 7vw, 38px)',
              fontWeight: 700,
              color: C.text,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            }}
          >
            {p1}
          </div>
          {p2 && (
            <>
              <div
                style={{
                  fontSize: 13,
                  color: primary,
                  fontWeight: 600,
                  margin: '6px 0',
                  letterSpacing: '0.12em',
                }}
              >
                &amp;
              </div>
              <div
                style={{
                  fontSize: 'clamp(28px, 7vw, 38px)',
                  fontWeight: 700,
                  color: C.text,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                }}
              >
                {p2}
              </div>
            </>
          )}
        </div>
      )}

      <div
        style={{
          width: 28,
          height: 2,
          background: primary,
          margin: '0 auto 28px',
          borderRadius: 1,
          animation: 'linenGrow 0.4s ease 0.28s both',
          transformOrigin: 'center',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animation: 'linenFadeUp 0.5s ease 0.35s both' }}>
        {formattedDate && <span style={{ fontSize: 15, fontWeight: 500, color: C.text }}>{formattedDate}</span>}
        {time && <span style={{ fontSize: 14, color: C.muted }}>{time}</span>}
        {venue && (
          mapsLink ? (
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 14, color: primary, textDecoration: 'none', fontWeight: 500 }}
            >
              📍 {venue}
            </a>
          ) : (
            <span style={{ fontSize: 14, color: C.muted }}>📍 {venue}</span>
          )
        )}
      </div>
    </header>
  );
}

function RSVPCard({
  primary,
  dishOptions,
  lockGuestCount,
  initialRsvpStatus,
  initialAmount,
  initialMealChoice,
  initialNotes,
  interactive,
  onSubmit,
}: {
  primary: string;
  dishOptions: DishOption[];
  lockGuestCount: boolean;
  initialRsvpStatus: 'pending' | 'confirmed' | 'declined';
  initialAmount: number;
  initialMealChoice: string;
  initialNotes: string;
  interactive: boolean;
  onSubmit?: (values: LinenSubmitValues) => Promise<{ success: boolean; message: string }>;
}) {
  const [attendance, setAttendance] = useState<'confirmed' | 'declined' | null>(
    initialRsvpStatus === 'pending' ? null : initialRsvpStatus,
  );
  const [guests, setGuests] = useState(initialAmount);
  const [mealChoice, setMealChoice] = useState(initialMealChoice);
  const [notes, setNotes] = useState(initialNotes);
  const [submitted, setSubmitted] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<'confirmed' | 'declined' | null>(null);
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
        const result = await onSubmit({
          rsvpStatus: attendance!,
          guestCount: guests,
          mealChoice,
          notes,
        });
        if (!result.success) {
          setErrorMsg(result.message);
          return;
        }
      }
      setSubmittedStatus(attendance);
      setSubmitted(true);
    } finally {
      setIsPending(false);
    }
  };

  if (submitted && submittedStatus) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', animation: 'linenScaleIn 0.4s ease both' }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>
          {submittedStatus === 'confirmed' ? '🎉' : '💛'}
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: C.text, marginBottom: 8 }}>
          {submittedStatus === 'confirmed' ? 'תודה! נשמח לראותכם' : 'תודה שעדכנתם'}
        </h3>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
          {submittedStatus === 'confirmed'
            ? `שמרנו לכם ${guests} ${guests === 1 ? 'מקום' : 'מקומות'}`
            : 'נחמיץ אתכם — שולחים אהבה גדולה'}
        </p>
        {interactive && (
          <button
            onClick={() => setSubmitted(false)}
            style={{
              background: 'transparent',
              border: `1px solid ${C.border}`,
              color: C.muted,
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            עריכת התשובה
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Attendance */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: C.muted, marginBottom: 10 }}>
          האם תגיעו?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(
            [
              { value: 'confirmed' as const, label: 'אגיע 🎉' },
              { value: 'declined' as const, label: 'לא אגיע' },
            ] as const
          ).map(({ value, label }) => {
            const active = attendance === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => interactive && setAttendance(value)}
                style={{
                  padding: '13px 16px',
                  borderRadius: 10,
                  border: `1.5px solid ${active ? primary : C.border}`,
                  background: active ? `${primary}0D` : C.bg,
                  color: active ? primary : C.text,
                  fontSize: 15,
                  fontWeight: active ? 600 : 400,
                  cursor: interactive ? 'pointer' : 'default',
                  transition: 'border-color 120ms, color 120ms, background 120ms',
                  fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Guest count */}
      {attendance === 'confirmed' && (
        <div style={{ animation: 'linenFadeUp 0.3s ease both' }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: C.muted, marginBottom: 10 }}>
            כמה אתם?
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              overflow: 'hidden',
              background: C.bg,
            }}
          >
            <button
              type="button"
              onClick={() => interactive && !lockGuestCount && setGuests((g) => Math.max(1, g - 1))}
              style={{
                width: 48,
                height: 48,
                background: 'transparent',
                border: 'none',
                fontSize: 20,
                cursor: interactive && !lockGuestCount ? 'pointer' : 'default',
                color: C.muted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'inherit',
                flexShrink: 0,
              }}
              aria-label="מינוס"
            >
              −
            </button>
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 17,
                fontWeight: 600,
                color: C.text,
                borderRight: `1px solid ${C.border}`,
                borderLeft: `1px solid ${C.border}`,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {guests}
              <span style={{ fontSize: 13, fontWeight: 400, color: C.muted }}>
                {guests === 1 ? 'אורח' : 'אורחים'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => interactive && !lockGuestCount && setGuests((g) => Math.min(12, g + 1))}
              style={{
                width: 48,
                height: 48,
                background: 'transparent',
                border: 'none',
                fontSize: 20,
                cursor: interactive && !lockGuestCount ? 'pointer' : 'default',
                color: C.muted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'inherit',
                flexShrink: 0,
              }}
              aria-label="פלוס"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Meal preference */}
      {attendance === 'confirmed' && dishOptions.length > 0 && (
        <div style={{ animation: 'linenFadeUp 0.3s ease both' }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: C.muted, marginBottom: 10 }}>
            העדפת מנה{' '}
            <span style={{ fontWeight: 400 }}>— בחירה אחת</span>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {dishOptions.map((d) => {
              const active = mealChoice === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => interactive && setMealChoice(active ? '' : d.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: `1.5px solid ${active ? primary : C.border}`,
                    background: active ? `${primary}0D` : C.bg,
                    color: active ? primary : C.text,
                    fontSize: 14,
                    fontWeight: active ? 500 : 400,
                    cursor: interactive ? 'pointer' : 'default',
                    transition: 'border-color 120ms, color 120ms, background 120ms',
                    fontFamily: 'inherit',
                  }}
                >
                  <span>{d.emoji}</span>
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: C.muted, marginBottom: 8 }}>
          הערות <span style={{ fontWeight: 400 }}>— לא חובה</span>
        </p>
        <textarea
          value={notes}
          onChange={(e) => interactive && setNotes(e.target.value)}
          placeholder="כל הערה שתרצו לשתף..."
          rows={3}
          readOnly={!interactive}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 14,
            color: C.text,
            background: C.bg,
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            lineHeight: 1.5,
          }}
        />
      </div>

      {errorMsg && (
        <p style={{ textAlign: 'center', color: '#E63946', fontSize: 13, margin: 0 }}>
          {errorMsg}
        </p>
      )}

      {/* Submit */}
      {interactive && (
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 10,
            border: 'none',
            background: canSubmit ? primary : C.border,
            color: canSubmit ? '#FFFFFF' : C.muted,
            fontSize: 15,
            fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            transition: 'background 150ms',
          }}
        >
          {isPending ? '...' : 'שליחת תשובה'}
        </button>
      )}
    </form>
  );
}

export function LinenDesign({
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
  palette = ['#D4427A', '#F082A8'],
  interactive = true,
  onSubmit,
}: LinenDesignProps) {
  const [primary] = palette;

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: C.surface,
        fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        fontSize: 15,
        lineHeight: 1.6,
        color: C.text,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <style>{`
        @keyframes linenFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes linenFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes linenScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes linenGrow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
      <Header
        coupleName={coupleName}
        formattedDate={formattedDate}
        time={time}
        venue={venue}
        mapsLink={mapsLink}
        primary={primary}
      />

      <section style={{ maxWidth: 390, margin: '0 auto', padding: '28px 20px 16px' }}>
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '24px 20px',
            animation: 'linenFadeUp 0.55s ease 0.62s both',
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: C.text,
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            אישור הגעה
          </h2>
          <RSVPCard
            primary={primary}
            dishOptions={dishOptions}
            lockGuestCount={lockGuestCount}
            initialRsvpStatus={initialRsvpStatus}
            initialAmount={initialAmount}
            initialMealChoice={initialMealChoice}
            initialNotes={initialNotes}
            interactive={interactive}
            onSubmit={onSubmit}
          />
        </div>
      </section>

      <footer
        style={{
          padding: '16px 24px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          animation: 'linenFadeIn 0.5s ease 0.8s both',
        }}
      >
        <span style={{ fontSize: 12, color: C.muted, letterSpacing: '0.03em' }}>נוצר עם</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-navbar.png"
          alt="Kululu"
          style={{ height: 18, opacity: 0.7, display: 'block' }}
        />
      </footer>
    </div>
  );
}
