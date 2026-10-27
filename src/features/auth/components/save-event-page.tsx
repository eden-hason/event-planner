'use client';

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleAlert, Smartphone, Trash2, TriangleAlert } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { toE164 } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { GoogleIcon, WhatsAppIcon } from '@/components/icons';
import {
  TakeoverBackButton,
  TakeoverButton,
  TakeoverDivider,
  TakeoverError,
  TakeoverInput,
} from '@/features/events/components/onboarding/takeover-shell';
import {
  signInWithGoogleDiscarding,
  startGoogleSave,
  startPhoneSave,
  verifyPhoneSave,
  type SaveState,
} from '../actions';
import { isExistingAccountError, type SaveReason } from '../utils/visitor';
import { isRedirectError } from '../utils/redirect';
import type { SignInMethod } from '../utils/sign-in-method';
import { LastUsedBadge } from './last-used-badge';
import { OtpCodeInput } from './otp-code-input';

type Step = 'details' | 'phone' | 'otp' | 'phoneExists' | 'googleExists';

const INITIAL: SaveState = { success: false, message: '' };

const RESEND_SECONDS = 60;

const PLACEHOLDER = 'placeholder:text-[var(--kt-ink-ghost)]';

/**
 * Saving the Event: a Visitor creating an account (ADR 0028), on a page of its
 * own. It used to be a drawer, and a stray tap on the backdrop threw away the
 * name, the number, or the code they had just gone to fetch - so leaving is
 * now only ever the back button. The steps change in place, which keeps
 * "back" meaning "leave", never "previous step".
 *
 * A phone or Google account that is new saves the Event where it is. One that
 * already has an account is never given the Event - the page stops and says
 * so, and the Visitor picks: sign in and discard, or use a different one.
 */
export function SaveEventPage({
  from,
  reason,
  startAt = 'details',
  inAppBrowser = false,
  lastMethod,
}: {
  /** Where they opened it from: where back goes, and where saving returns. */
  from: string;
  reason?: SaveReason;
  /** `googleExists` when Google just reported an existing account. */
  startAt?: 'details' | 'googleExists';
  /**
   * Opened inside an app's own browser. Google refuses to sign in there, and
   * leaving for the real browser would leave the Event behind in this app's
   * cookies - so phone is the only way to save, and Google is not offered.
   */
  inAppBrowser?: boolean;
  /** The method this device last signed in with, marked on its button. */
  lastMethod?: SignInMethod;
}) {
  const t = useTranslations('saveEvent');
  const tAuth = useTranslations('auth');
  const tNav = useTranslations('navigation');
  const router = useRouter();
  const [step, setStep] = useState<Step>(startAt);
  const [fullName, setFullName] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [codeRefused, setCodeRefused] = useState(false);
  // Bumped on every code sent, to restart the resend countdown.
  const [codesSent, setCodesSent] = useState(0);
  // Whether the code on its way is for signing in to the existing account,
  // so a resend asks for the same kind of code.
  const [discarding, setDiscarding] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isLeaving, startLeaving] = useTransition();
  const otpInputRef = useRef<HTMLInputElement>(null);

  const [sendState, sendAction, isSending] = useActionState(startPhoneSave, INITIAL);
  const [verifyState, verifyAction, isVerifying] = useActionState(verifyPhoneSave, INITIAL);

  const named = !!fullName.trim();
  const e164Phone = toE164(localPhone) ?? '';
  const busy = isLeaving || isSending;
  const isPhoneExists = step === 'phoneExists';

  // Google reports a failed link in the fragment (`#error_code=`), which never
  // reaches the server - the callback passes it through to here untouched.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const code = hash.get('error_code') || hash.get('error');
    if (!code) return;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    if (isExistingAccountError(hash.get('error_code'))) setStep('googleExists');
    else setGoogleError(tAuth('googleLoginFailed'));
    // tAuth is stable; this reads the URL once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sendState.success) {
      setStep('otp');
      setCodesSent((n) => n + 1);
    } else if (sendState.existingAccount) {
      setStep('phoneExists');
    }
  }, [sendState]);

  useEffect(() => {
    if (step === 'otp') otpInputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (verifyState.success) {
      if (verifyState.outcome === 'saved') {
        toast.success(t('saved'));
        router.replace(from);
      }
      // A full load: the session changed hands, and the app should render as
      // the account they signed in to, not the Visitor they were.
      else if (verifyState.outcome === 'signedIn') window.location.assign('/app');
    } else if (verifyState.message) {
      setCodeRefused(true);
    }
    // t, router and from are stable for this page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyState]);

  const sendCode = (discard: boolean) => {
    if (!e164Phone) return;
    setDiscarding(discard);
    const formData = new FormData();
    formData.set('phone', e164Phone);
    if (discard) formData.set('discard', '1');
    startLeaving(() => sendAction(formData));
  };

  const goGoogle = (discard: boolean) => {
    setGoogleError(null);
    startLeaving(async () => {
      try {
        const result = discard
          ? await signInWithGoogleDiscarding()
          : await startGoogleSave(fullName, from);
        if (result && !result.success) {
          setGoogleError(result.message || tAuth('googleLoginFailed'));
        }
      } catch (error) {
        // Leaving for Google surfaces here as a thrown NEXT_REDIRECT.
        if (isRedirectError(error)) return;
        setGoogleError(tAuth('googleLoginFailed'));
      }
    });
  };

  const backTo = (to: 'details' | 'phone') => {
    setStep(to);
    setOtp('');
    setCodeRefused(false);
  };

  const sendError =
    sendState.message && !sendState.success ? (
      <TakeoverError>{sendState.message}</TakeoverError>
    ) : null;
  const googleErrorLine = googleError ? <TakeoverError>{googleError}</TakeoverError> : null;

  return (
    <div
      data-save-page=""
      data-takeover=""
      className="relative flex min-h-svh flex-col bg-[var(--kt-surface)] font-heebo text-[var(--kt-ink)]"
    >
      {/* A row of its own on the phone; on desktop it floats in the corner so
          the form can sit in the middle of the page. */}
      <header className="flex h-14 shrink-0 items-center gap-3 px-5 md:absolute md:inset-x-10 md:top-5 md:z-10 md:h-10 md:px-0">
        <TakeoverBackButton onClick={() => router.replace(from)} label={tNav('back')} />
        <h1 className="text-xl leading-tight font-bold">{t('title')}</h1>
      </header>

      <main className="flex flex-1 justify-center px-6 pt-7 pb-10 md:items-center md:py-24">
        {/* Keyed by step so each one arrives with the same rise. */}
        <div
          key={step}
          className="flex w-full max-w-[400px] animate-[kt-fade-up_0.4s_cubic-bezier(0.16,1,0.3,1)_both] flex-col"
        >
          {step === 'details' && (
            <>
              {/* The reason line replaces the default subtitle rather than
                  stacking with it: one line saying why they are here. */}
              <p className="mb-7 text-[15px] leading-relaxed text-pretty text-[var(--kt-ink-muted)]">
                {reason ? t(`reason.${reason}`) : t('subtitle')}
              </p>

              <label
                htmlFor="saveFullName"
                className="mb-2 block text-sm font-semibold text-[var(--kt-ink-muted)]"
              >
                {t('nameLabel')}
              </label>
              <TakeoverInput
                id="saveFullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('namePlaceholder')}
                autoComplete="name"
                className={PLACEHOLDER}
              />

              {/* The choice of Sign-in Method, as on /login: two buttons, the
                  device's Last-used Method marked, the number on its own step. */}
              <TakeoverButton
                onClick={() => setStep('phone')}
                disabled={!named || busy}
                className="relative mt-5 flex items-center justify-center gap-2"
              >
                <Smartphone className="size-5" aria-hidden />
                {t('savePhone')}
                {lastMethod === 'phone' && <LastUsedBadge />}
              </TakeoverButton>

              {!inAppBrowser && (
                <>
                  <TakeoverDivider className="my-4">{tAuth('or')}</TakeoverDivider>

                  <OutlineButton onClick={() => goGoogle(false)} disabled={!named || busy}>
                    <span className={cn('flex', (!named || busy) && 'opacity-35 grayscale')}>
                      <GoogleIcon />
                    </span>
                    {t('saveGoogle')}
                    {lastMethod === 'google' && <LastUsedBadge />}
                  </OutlineButton>
                  {googleErrorLine && <div className="mt-3">{googleErrorLine}</div>}
                </>
              )}
            </>
          )}

          {step === 'phone' && (
            <>
              <h2 className="text-[26px] leading-tight font-bold">{tAuth('phoneTitle')}</h2>
              <p className="mt-2 mb-6 text-[15px] text-[var(--kt-ink-muted)]">
                {tAuth('phoneSubtitle')}
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendCode(false);
                }}
                className="flex flex-col gap-3"
              >
                {/* `dir="ltr"` keeps the digits in dialling order; the end
                    alignment keeps the placeholder on the side the page reads
                    from. */}
                <div dir="ltr">
                  <TakeoverInput
                    id="savePhone"
                    type="tel"
                    inputMode="numeric"
                    placeholder={tAuth('phoneNumber')}
                    aria-label={tAuth('phoneNumber')}
                    value={localPhone}
                    onChange={(e) => setLocalPhone(e.target.value)}
                    autoFocus
                    autoComplete="tel"
                    className={cn('px-4 text-right font-rubik placeholder:font-heebo', PLACEHOLDER)}
                  />
                </div>
                {sendError}
                <TakeoverButton
                  type="submit"
                  disabled={!e164Phone || isLeaving}
                  pending={isSending}
                  className="flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <Spinner />
                      {tAuth('sendingCode')}
                    </>
                  ) : (
                    <>
                      <WhatsAppIcon size={20} />
                      {tAuth('sendCode')}
                    </>
                  )}
                </TakeoverButton>
              </form>

              <button
                type="button"
                onClick={() => backTo('details')}
                disabled={busy}
                className="mt-4 self-center text-[14px] font-semibold text-[var(--kt-brand-text)] transition-colors hover:text-[var(--kt-brand)]"
              >
                {t('otherWay')}
              </button>
            </>
          )}

          {step === 'otp' && (
            <form action={verifyAction} className="flex flex-col">
              <input type="hidden" name="phone" value={e164Phone} />
              <input type="hidden" name="full_name" value={fullName} />
              <h2 className="text-[26px] leading-tight font-bold">{tAuth('enterCode')}</h2>
              <p className="mt-2 flex flex-wrap items-baseline gap-1.5 text-[15px] text-[var(--kt-ink-muted)]">
                <span>{tAuth('sentCodeTo')}</span>
                <span dir="ltr" className="font-rubik font-semibold text-[var(--kt-ink)]">
                  {e164Phone}
                </span>
                <button
                  type="button"
                  onClick={() => backTo('phone')}
                  className="font-semibold text-[var(--kt-brand-text)] transition-colors hover:text-[var(--kt-brand)]"
                >
                  {tAuth('editPhone')}
                </button>
              </p>

              <OtpCodeInput
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  setCodeRefused(false);
                }}
                label={tAuth('verificationCode')}
                inputRef={otpInputRef}
                invalid={codeRefused}
              />
              {codeRefused && (
                <div className="-mt-2 mb-4">
                  <TakeoverError>
                    <CircleAlert className="me-1.5 inline size-[15px] align-[-3px]" aria-hidden />
                    {t('wrongCode')}
                  </TakeoverError>
                </div>
              )}

              <TakeoverButton type="submit" disabled={otp.length < 6} pending={isVerifying}>
                {isVerifying ? tAuth('verifying') : tAuth('verify')}
              </TakeoverButton>

              <div className="mt-3.5 text-center text-[13px] text-[var(--kt-ink-faint)]">
                <ResendCountdown key={codesSent}>
                  {tAuth('notReceived')}{' '}
                  <button
                    type="button"
                    onClick={() => sendCode(discarding)}
                    disabled={busy}
                    className="font-semibold text-[var(--kt-brand-text)] transition-colors hover:text-[var(--kt-brand)]"
                  >
                    {isSending ? tAuth('sendingCode') : tAuth('resendCode')}
                  </button>
                </ResendCountdown>
              </div>
            </form>
          )}

          {(isPhoneExists || step === 'googleExists') && (
            <>
              <div className="flex items-start gap-3.5 rounded-[14px] border border-[var(--kt-danger-border)] bg-[var(--kt-danger-soft)] p-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <h2 className="text-[17px] leading-snug font-bold text-balance">
                    {isPhoneExists ? t('phoneExistsTitle') : t('googleExistsTitle')}
                  </h2>
                  <p className="text-[14.5px] leading-relaxed text-pretty text-[var(--kt-ink-muted)]">
                    {t('existsBody')}
                  </p>
                </div>
                <TriangleAlert className="size-6 shrink-0 text-[var(--kt-danger)]" aria-hidden />
              </div>

              {/* The number they typed, so "a different number" or signing in
                  is an informed choice. Google's return carries no account to
                  echo, so that variant goes without. */}
              {isPhoneExists && (
                <div className="mt-4 flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-[var(--kt-border)] bg-[var(--kt-field)] px-3.5">
                  <Smartphone className="size-[18px] text-[var(--kt-ink-faint)]" aria-hidden />
                  <span dir="ltr" className="font-rubik text-[15px] font-semibold">
                    {e164Phone}
                  </span>
                </div>
              )}

              <div className="mt-7 flex flex-col gap-3">
                <TakeoverButton
                  onClick={() => (isPhoneExists ? sendCode(true) : goGoogle(true))}
                  pending={busy}
                  className="flex items-center justify-center gap-2"
                >
                  {busy ? <Spinner /> : <Trash2 className="size-4" aria-hidden />}
                  {t('signInAndDiscard')}
                </TakeoverButton>
                <OutlineButton
                  onClick={() => backTo(isPhoneExists ? 'phone' : 'details')}
                  disabled={busy}
                >
                  {isPhoneExists ? t('useDifferentNumber') : t('useDifferentAccount')}
                </OutlineButton>
                {sendError}
                {googleErrorLine}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/** The quieter of two paths: Google beside the phone, the way back beside signing in. */
function OutlineButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex h-[54px] items-center justify-center gap-2.5 rounded-2xl border-[1.5px] text-[15px] font-semibold transition-colors',
        // Disabled drops to an outline-only ghost, so neither save path looks
        // tappable before there is a name.
        disabled
          ? 'cursor-default border-[var(--kt-border-soft)] bg-transparent text-[var(--kt-on-disabled-outline)]'
          : 'cursor-pointer border-[var(--kt-border)] bg-[var(--kt-field)] text-[var(--kt-ink)] hover:border-[var(--kt-border-hover)]',
      )}
    >
      {children}
    </button>
  );
}

/**
 * "Resend in Ns", then `children` (the way to resend). Its own component, so
 * the tick re-renders this line rather than the whole page; keyed by the send
 * to restart it.
 */
function ResendCountdown({ children }: { children: ReactNode }) {
  const tAuth = useTranslations('auth');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return seconds > 0 ? tAuth('resendIn', { seconds }) : children;
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-[18px] animate-spin rounded-full border-2 border-white/35 border-t-white"
    />
  );
}
