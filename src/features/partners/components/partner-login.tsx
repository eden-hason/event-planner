'use client';

import { useActionState, useCallback, useEffect, useRef, useState } from 'react';
import { sendOtp, signInWithGoogle, verifyOtp } from '@/features/auth';
import { toE164 } from '@/lib/phone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

/**
 * Sign-in for the Partners host.
 *
 * It reuses the main app's auth actions verbatim - same Supabase project, same
 * phone-OTP and Google flows, same users table - and only the surface is its
 * own. What makes it a separate page at all is cookie scope: Supabase session
 * cookies are host-scoped, so signing in on kulu-lu.com leaves
 * partners.kulu-lu.com anonymous. A Partner has to establish the session on
 * the host they will use it on.
 *
 * `next` is "/" rather than "/app": on this host the proxy rewrites "/" to
 * "/partners", so "/" is how a Partner spells their own home.
 */
export function PartnerLogin() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [localPhone, setLocalPhone] = useState('');
  const [e164Phone, setE164Phone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

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
    if (sendState.success && !prevSendSuccess.current) setStep('otp');
    prevSendSuccess.current = sendState.success;
  }, [sendState.success]);

  const handleSend = useCallback(
    (formData: FormData) => {
      // Supabase OTP wants E.164. A number that will not parse cannot be sent
      // to, so stop here rather than handing Supabase a guessed-at string.
      const phone = toE164(localPhone);
      if (!phone) {
        setPhoneError('מספר טלפון לא תקין');
        return;
      }
      setPhoneError(null);
      setE164Phone(phone);
      formData.set('phone', phone);
      sendAction(formData);
    },
    [localPhone, sendAction],
  );

  const handleGoogle = async () => {
    setGoogleError(null);
    try {
      const result = await signInWithGoogle('/');
      if (result && !result.success) {
        setGoogleError(result.message || 'ההתחברות עם Google נכשלה');
      }
    } catch (error) {
      // A successful sign-in redirects, which surfaces here as a thrown
      // NEXT_REDIRECT - not an error worth showing.
      if (error instanceof Error && error.message?.includes('NEXT_REDIRECT')) return;
      setGoogleError('ההתחברות עם Google נכשלה');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-bold">Kululu לשותפים</h1>
        <p className="text-muted-foreground text-sm">
          {step === 'phone'
            ? 'התחברו כדי לעקוב אחרי ההפניות והזיכויים שלכם'
            : 'הזינו את הקוד שנשלח אליכם'}
        </p>
      </div>

      {step === 'phone' ? (
        <div className="flex flex-col gap-3">
          <form action={handleSend} className="flex flex-col gap-3">
            {/* dir="ltr" keeps the digits in dialling order - a phone number is
                never mirrored - inside the RTL shell around it. */}
            <Input
              dir="ltr"
              name="phone_local"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="מספר טלפון"
              aria-label="מספר טלפון"
              value={localPhone}
              onChange={(e) => setLocalPhone(e.target.value)}
              required
            />
            {(phoneError || (sendState.message && !sendState.success)) && (
              <p className="text-destructive text-sm">{phoneError || sendState.message}</p>
            )}
            <Button type="submit" disabled={isSending}>
              {isSending ? 'שולח קוד' : 'שליחת קוד'}
            </Button>
          </form>

          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <div className="bg-border h-px flex-1" />
            או
            <div className="bg-border h-px flex-1" />
          </div>

          <Button type="button" variant="outline" onClick={handleGoogle}>
            <GoogleGlyph />
            התחברות עם Google
          </Button>
          {googleError && <p className="text-destructive text-sm">{googleError}</p>}
        </div>
      ) : (
        <form action={verifyAction} className="flex flex-col gap-3">
          <input type="hidden" name="phone" value={e164Phone} />
          <input type="hidden" name="next" value="/" />
          <p className="text-muted-foreground text-sm">
            נשלח קוד אל{' '}
            <span dir="ltr" className="font-medium">
              {e164Phone}
            </span>
          </p>
          <Input
            dir="ltr"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            aria-label="קוד אימות"
            required
            autoFocus
            className="text-center tracking-[0.4em]"
          />
          {verifyState.message && !verifyState.success && (
            <p className="text-destructive text-sm">{verifyState.message}</p>
          )}
          <Button type="submit" disabled={isVerifying}>
            {isVerifying ? 'מאמת' : 'אימות והתחברות'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStep('phone');
              prevSendSuccess.current = false;
            }}
          >
            שינוי מספר
          </Button>
        </form>
      )}
    </div>
  );
}
