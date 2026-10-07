'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toE164 } from '@/lib/phone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  signInWithGoogleDiscarding,
  startGoogleSave,
  startPhoneSave,
  verifyPhoneSave,
  type SaveState,
} from '../actions';
import { GoogleIcon } from '@/components/icons';
import { OtpCodeInput } from './otp-code-input';

type Step = 'details' | 'phoneExists' | 'googleExists' | 'otp';

const INITIAL: SaveState = { success: false, message: '' };

/**
 * Saving the Event: a Visitor creating an account (ADR 0028). Name, then phone
 * or Google.
 *
 * A phone or Google account that is new saves the Event where it is. One that
 * already has an account is never given the Event - the form stops and says
 * so, and the Visitor picks: use a different one, or sign in and discard.
 */
export function SaveEventForm({
  returnTo,
  startAt = 'details',
  onSaved,
}: {
  /** Where Google brings them back to - the page the dialog was opened on. */
  returnTo: string;
  /** `googleExists` when Google just reported an existing account. */
  startAt?: Step;
  onSaved: () => void;
}) {
  const t = useTranslations('saveEvent');
  const tAuth = useTranslations('auth');
  const [step, setStep] = useState<Step>(startAt);
  const [fullName, setFullName] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isLeaving, startLeaving] = useTransition();
  const otpInputRef = useRef<HTMLInputElement>(null);

  const [sendState, sendAction, isSending] = useActionState(startPhoneSave, INITIAL);
  const [verifyState, verifyAction, isVerifying] = useActionState(verifyPhoneSave, INITIAL);

  const named = !!fullName.trim();
  const e164Phone = toE164(localPhone) ?? '';
  const phoneReady = !!e164Phone;

  useEffect(() => {
    if (sendState.success) setStep('otp');
    else if (sendState.existingAccount) setStep('phoneExists');
  }, [sendState]);

  useEffect(() => {
    if (step === 'otp') otpInputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!verifyState.success) return;
    if (verifyState.outcome === 'saved') onSaved();
    // A full load: the session changed hands, and the app should render as
    // the account they signed in to, not the Visitor they were.
    else if (verifyState.outcome === 'signedIn') window.location.assign('/app');
    // onSaved belongs to the dialog and is stable for this form's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyState]);

  const sendCode = (discard: boolean) => {
    if (!e164Phone) return;
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
          : await startGoogleSave(fullName, returnTo);
        if (result && !result.success) {
          setGoogleError(result.message || tAuth('googleLoginFailed'));
        }
      } catch (error) {
        // Leaving for Google surfaces here as a thrown NEXT_REDIRECT.
        if (error instanceof Error && error.message?.includes('NEXT_REDIRECT')) return;
        setGoogleError(tAuth('googleLoginFailed'));
      }
    });
  };

  if (step === 'phoneExists' || step === 'googleExists') {
    const isPhone = step === 'phoneExists';
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-semibold">
            {isPhone ? t('phoneExistsTitle') : t('googleExistsTitle')}
          </h3>
          <p className="text-muted-foreground text-sm">{t('existsBody')}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={() => setStep('details')} disabled={isLeaving || isSending}>
            {isPhone ? t('useDifferentNumber') : t('useDifferentAccount')}
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => (isPhone ? sendCode(true) : goGoogle(true))}
            disabled={isLeaving || isSending}
          >
            {t('signInAndDiscard')}
          </Button>
          {googleError && <p className="text-destructive text-sm">{googleError}</p>}
          {sendState.message && !sendState.success && (
            <p className="text-destructive text-sm">{sendState.message}</p>
          )}
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <form action={verifyAction} className="flex flex-col gap-2">
        <input type="hidden" name="phone" value={e164Phone} />
        <input type="hidden" name="full_name" value={fullName} />
        <p className="text-muted-foreground text-sm">
          {tAuth('sentCodeTo')}{' '}
          <span dir="ltr" className="text-foreground font-semibold">
            {e164Phone}
          </span>{' '}
          <button
            type="button"
            onClick={() => setStep('details')}
            className="text-primary font-medium"
          >
            {tAuth('editPhone')}
          </button>
        </p>
        <OtpCodeInput
          value={otp}
          onChange={setOtp}
          label={tAuth('verificationCode')}
          inputRef={otpInputRef}
        />
        {verifyState.message && !verifyState.success && (
          <p className="text-destructive text-sm">{verifyState.message}</p>
        )}
        <Button type="submit" disabled={isVerifying || otp.length < 6}>
          {isVerifying ? tAuth('verifying') : tAuth('verify')}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="saveFullName">{t('nameLabel')}</Label>
        <Input
          id="saveFullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t('namePlaceholder')}
          autoComplete="name"
        />
      </div>

      <div className="flex flex-col gap-2">
        {/* `dir="ltr"` keeps the digits in dialling order; the right alignment
            keeps the placeholder on the side the page reads from. */}
        <div dir="ltr">
          <Input
            id="savePhone"
            type="tel"
            inputMode="numeric"
            placeholder={tAuth('phoneNumber')}
            aria-label={tAuth('phoneNumber')}
            value={localPhone}
            onChange={(e) => setLocalPhone(e.target.value)}
            autoComplete="tel"
            className="text-right rtl:text-right"
          />
        </div>
        {sendState.message && !sendState.success && (
          <p className="text-destructive text-sm">{sendState.message}</p>
        )}
        <Button
          onClick={() => sendCode(false)}
          disabled={!named || !phoneReady || isSending || isLeaving}
        >
          {isSending ? tAuth('sendingCode') : t('savePhone')}
        </Button>
      </div>

      <div className="text-muted-foreground flex items-center gap-3 text-xs">
        <div className="bg-border h-px flex-1" />
        {tAuth('or')}
        <div className="bg-border h-px flex-1" />
      </div>

      <Button
        variant="outline"
        onClick={() => goGoogle(false)}
        disabled={!named || isLeaving}
      >
        <GoogleIcon />
        {t('saveGoogle')}
      </Button>
      {googleError && <p className="text-destructive text-sm">{googleError}</p>}
    </div>
  );
}
