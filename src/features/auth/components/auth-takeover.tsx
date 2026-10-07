'use client';

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { toE164 } from '@/lib/phone';
import { sendOtp, signInWithGoogle, verifyOtp } from '@/features/auth';
import { GoogleIcon } from '@/components/icons';
import { OtpCodeInput } from './otp-code-input';
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

export function AuthTakeover({
  next,
  holdsUnsavedEvent = false,
}: {
  next?: string;
  /**
   * A Visitor (ADR 0028): signing in to an account here discards the Event
   * they have been planning, so the screen says so before they start.
   */
  holdsUnsavedEvent?: boolean;
}) {
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
            className="px-4 text-right font-rubik"
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
        <GoogleIcon />
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
        <span dir="ltr" className="font-rubik font-semibold">
          {e164Phone}
        </span>
      </p>

      <form action={verifyAction} className="flex flex-col gap-2.5">
        <input type="hidden" name="phone" value={e164Phone} />
        {next && <input type="hidden" name="next" value={next} />}

        <OtpCodeInput
          value={otp}
          onChange={setOtp}
          label={t('verificationCode')}
          inputRef={otpInputRef}
        />

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
              {holdsUnsavedEvent && (
                <div className="mb-5 max-w-[400px] rounded-2xl border-[1.5px] border-[var(--kt-border)] bg-white px-4 py-3 text-[14px] leading-relaxed text-[var(--kt-ink-muted)]">
                  {t('unsavedEventWarning')}{' '}
                  <Link
                    href="/app"
                    className="font-semibold text-[var(--kt-brand)] hover:text-[var(--kt-brand-deep)]"
                  >
                    {t('backToMyEvent')}
                  </Link>
                </div>
              )}
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
