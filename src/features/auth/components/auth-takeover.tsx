'use client';

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { toE164 } from '@/lib/phone';
import { sendOtp, signInWithGoogle, verifyOtp } from '@/features/auth';
import {
  TakeoverBackButton,
  TakeoverButton,
  TakeoverError,
  TakeoverInput,
  TakeoverLogo,
  TakeoverShell,
} from '@/features/events/components/onboarding/takeover-shell';

/**
 * Sign-in, as the opening beat of the onboarding takeover.
 *
 * These are the first screens anyone sees, so they speak the same visual
 * language as the flow they lead into rather than reading as a generic auth
 * page. A first-time user and a returning one use the identical form - there is
 * no separate sign-up, and no email/password.
 */

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export function AuthTakeover({ next }: { next?: string }) {
  const t = useTranslations('auth');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [localPhone, setLocalPhone] = useState('');
  const [e164Phone, setE164Phone] = useState('');
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const [sendState, sendAction, isSending] = useActionState(sendOtp, {
    success: false,
    message: '',
  });
  const [verifyState, verifyAction, isVerifying] = useActionState(verifyOtp, {
    success: false,
    message: '',
  });

  const prevSendSuccess = useRef(false);
  useEffect(() => {
    if (sendState.success && !prevSendSuccess.current) {
      setStep('otp');
      setResendCooldown(60);
    }
    prevSendSuccess.current = sendState.success;
  }, [sendState.success]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === 'otp') otpInputRef.current?.focus();
  }, [step]);

  const handleSend = useCallback(
    (formData: FormData) => {
      // Supabase OTP wants E.164. A number that will not parse cannot be sent
      // to, so stop here rather than handing Supabase a guessed-at string.
      const phone = toE164(localPhone);
      if (!phone) return;
      setE164Phone(phone);
      formData.set('phone', phone);
      sendAction(formData);
    },
    [localPhone, sendAction],
  );

  const handleResend = useCallback(() => {
    if (resendCooldown > 0) return;
    const formData = new FormData();
    formData.set('phone', e164Phone);
    prevSendSuccess.current = false;
    sendAction(formData);
    setResendCooldown(60);
  }, [resendCooldown, e164Phone, sendAction]);

  const handleGoogle = async () => {
    setGoogleError(null);
    try {
      const result = await signInWithGoogle(next);
      if (result && !result.success) {
        setGoogleError(result.message || t('googleLoginFailed'));
      }
    } catch (error) {
      // A successful sign-in redirects, which surfaces here as a thrown
      // NEXT_REDIRECT - not an error worth showing.
      if (error instanceof Error && error.message?.includes('NEXT_REDIRECT')) {
        return;
      }
      setGoogleError(t('googleLoginFailed'));
    }
  };

  const phonePane = (
    <div className="flex w-full max-w-[400px] flex-col gap-3">
      <form action={handleSend} className="flex flex-col gap-3">
        {/* `dir="ltr"` keeps the digits in dialling order - a phone number is
            never mirrored - while the right alignment keeps the field reading
            with the RTL shell around it, so the placeholder and the typing
            both start on the side the page reads from.

            The placeholder carries the naming now that the label is gone, so
            `aria-label` says it too: a placeholder disappears on first
            keystroke and is not an accessible name on its own. */}
        <div dir="ltr">
          <TakeoverInput
            id="phone"
            name="phone_local"
            type="tel"
            inputMode="numeric"
            placeholder={t('phoneNumber')}
            aria-label={t('phoneNumber')}
            value={localPhone}
            onChange={(e) => setLocalPhone(e.target.value)}
            required
            autoComplete="tel"
            className="px-4 text-right font-[family-name:var(--font-rubik)]"
          />
        </div>
        {sendState.message && !sendState.success && (
          <TakeoverError>{sendState.message}</TakeoverError>
        )}
        <TakeoverButton type="submit" disabled={isSending}>
          {isSending ? t('sendingCode') : t('sendCode')}
        </TakeoverButton>
      </form>

      <div className="my-1 flex items-center gap-3 text-xs text-[var(--kt-ink-faint)]">
        <div className="h-px flex-1 bg-[var(--kt-border-soft)]" />
        {t('or')}
        <div className="h-px flex-1 bg-[var(--kt-border-soft)]" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="flex h-[54px] cursor-pointer items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-[var(--kt-border)] bg-white text-[15px] font-semibold text-[var(--kt-ink)] transition-colors hover:border-[rgba(26,11,46,0.22)]"
      >
        <GoogleGlyph />
        {t('signInWithGoogle')}
      </button>
      {googleError && <TakeoverError>{googleError}</TakeoverError>}
    </div>
  );

  const otpPane = (
    <div className="flex w-full max-w-[400px] animate-[kt-enter-fwd_0.4s_cubic-bezier(0.16,1,0.3,1)_both] flex-col gap-2.5">
      <TakeoverBackButton
        onClick={() => {
          setStep('phone');
          prevSendSuccess.current = false;
        }}
        label={t('editPhone')}
      />
      <h1 className="mt-2 text-[26px] leading-tight font-bold md:text-[28px]">
        {t('enterCode')}
      </h1>
      <p className="text-[15px] text-[var(--kt-ink-muted)]">
        {t('sentCodeTo')}{' '}
        <span dir="ltr" className="font-[family-name:var(--font-rubik)] font-semibold">
          {e164Phone}
        </span>
      </p>

      <form action={verifyAction} className="flex flex-col gap-2.5">
        <input type="hidden" name="phone" value={e164Phone} />
        {next && <input type="hidden" name="next" value={next} />}

        {/* The boxes are presentation; one real input sits invisibly over them
            so paste, autofill and the OS one-time-code hint all keep working. */}
        <div className="relative my-5">
          <div dir="ltr" className="flex justify-center gap-2.5">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'flex h-14 w-[46px] items-center justify-center rounded-[14px] bg-white font-[family-name:var(--font-rubik)] text-2xl font-bold text-[var(--kt-ink)] transition-colors',
                  i === otp.length
                    ? 'border-2 border-[var(--kt-brand)]'
                    : 'border-[1.5px] border-[var(--kt-border)]',
                )}
              >
                {otp[i] ?? ''}
              </div>
            ))}
          </div>
          <input
            ref={otpInputRef}
            name="token"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            required
            aria-label={t('verificationCode')}
            className="absolute inset-0 h-full w-full opacity-[0.01]"
          />
        </div>

        {verifyState.message && !verifyState.success && (
          <TakeoverError>{verifyState.message}</TakeoverError>
        )}
        <TakeoverButton type="submit" disabled={isVerifying || otp.length < 6}>
          {isVerifying ? t('verifying') : t('verify')}
        </TakeoverButton>

        <div className="text-center text-[13px] text-[var(--kt-ink-faint)]">
          {resendCooldown > 0 ? (
            t('resendIn', { seconds: resendCooldown })
          ) : (
            <>
              {t('notReceived')}{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={isSending}
                className="font-semibold text-[var(--kt-brand)] hover:text-[var(--kt-brand-deep)]"
              >
                {isSending ? t('sendingCode') : t('resendCode')}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );

  return (
    <TakeoverShell>
      {/* The corner mark, landing where /start puts it so the two screens are
          stamped the same way. Absolute rather than a header row: the
          illustration panel runs the full height of the split, and a header
          above the grid would push it down off the top edge. Physical `left`
          because the corner is the corner in either direction, and `h-10` is
          /start's back-button row, which is what centres the mark there. */}
      <header className="absolute top-5 left-6 z-10 flex h-10 items-center lg:left-10">
        <TakeoverLogo />
      </header>

      {/* Split on desktop, single column on the phone - the illustration panel
          is the first thing to go when there is no room for it. */}
      <div className="grid flex-1 md:grid-cols-2">
        <div className="flex animate-[kt-fade-up_0.5s_cubic-bezier(0.16,1,0.3,1)_both] flex-col justify-center gap-2 px-7 py-16 md:px-[88px]">
          {step === 'phone' ? (
            <>
              <h1 className="text-[26px] leading-tight font-bold text-balance md:text-[32px]">
                {t('takeoverTitle')}
              </h1>
              <p className="mb-7 text-[15px] leading-relaxed text-[var(--kt-ink-muted)] md:text-base">
                {t('takeoverSubtitle')}
              </p>
              {phonePane}
            </>
          ) : (
            otpPane
          )}
        </div>

        <div className="relative hidden flex-col items-center justify-center gap-6 overflow-hidden bg-[linear-gradient(150deg,#FFE7F8_0%,#F1E8FF_50%,#FFE6DC_100%)] p-12 md:flex">
          <img
            src="/hero-wedding.svg"
            alt=""
            aria-hidden="true"
            className="w-[280px] animate-[kt-fade-up_0.6s_cubic-bezier(0.16,1,0.3,1)_0.15s_both]"
          />
          <div className="animate-[kt-fade-up_0.6s_cubic-bezier(0.16,1,0.3,1)_0.3s_both] text-center">
            <div className="text-xl font-bold text-[var(--kt-ink)]">
              {t('heroTitle')}
            </div>
            <div className="mt-1.5 text-sm text-[var(--kt-ink-muted)]">
              {t('heroSubtitle')}
            </div>
          </div>
        </div>
      </div>
    </TakeoverShell>
  );
}
