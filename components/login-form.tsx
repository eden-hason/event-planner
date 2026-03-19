'use client';

import { useActionState, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleLoginButton } from '@/components/google-login-button';
import { sendOtp, verifyOtp } from '@/features/auth';

function normalizePhone(local: string): string {
  const cleaned = local.replace(/\D/g, '');
  const withoutLeadingZero = cleaned.startsWith('0')
    ? cleaned.slice(1)
    : cleaned;
  return `+972${withoutLeadingZero}`;
}

export function LoginForm({
  className,
  next,
  ...props
}: React.ComponentProps<'div'> & { next?: string }) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [localPhone, setLocalPhone] = useState('');
  const [e164Phone, setE164Phone] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [sendState, sendAction, isSending] = useActionState(sendOtp, {
    success: false,
    message: '',
  });

  const [verifyState, verifyAction, isVerifying] = useActionState(verifyOtp, {
    success: false,
    message: '',
  });

  // Transition to OTP step on successful send
  const prevSendSuccess = useRef(false);
  useEffect(() => {
    if (sendState.success && !prevSendSuccess.current) {
      setStep('otp');
      setResendCooldown(60);
    }
    prevSendSuccess.current = sendState.success;
  }, [sendState.success]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = useCallback(
    (formData: FormData) => {
      const phone = normalizePhone(localPhone);
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

  const handleEditPhone = useCallback(() => {
    setStep('phone');
    prevSendSuccess.current = false;
  }, []);

  if (step === 'otp') {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Enter verification code</CardTitle>
            <CardDescription>
              We sent a code to{' '}
              <span className="font-medium text-foreground" dir="ltr">
                {e164Phone}
              </span>
              {' '}
              <button
                type="button"
                onClick={handleEditPhone}
                className="text-primary underline underline-offset-4"
              >
                Edit
              </button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={verifyAction}>
              <input type="hidden" name="phone" value={e164Phone} />
              {next && <input type="hidden" name="next" value={next} />}
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="token">Verification code</Label>
                  <Input
                    id="token"
                    name="token"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    required
                  />
                </div>
                {verifyState.message && !verifyState.success && (
                  <div className="text-sm text-red-600">
                    {verifyState.message}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isVerifying}>
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </Button>
                <div className="text-center text-sm">
                  {resendCooldown > 0 ? (
                    <span className="text-muted-foreground">
                      Resend code in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isSending}
                      className="text-primary underline underline-offset-4"
                    >
                      {isSending ? 'Sending...' : 'Resend code'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in with your phone number</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="flex flex-col gap-4">
              <GoogleLoginButton next={next} />
            </div>
            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-card text-muted-foreground relative z-10 px-2">
                Or continue with
              </span>
            </div>
            <form action={handleSendOtp}>
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="phone">Phone number</Label>
                  <div className="flex gap-2" dir="ltr">
                    <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-medium">
                      +972
                    </div>
                    <Input
                      id="phone"
                      name="phone_local"
                      type="tel"
                      inputMode="numeric"
                      placeholder="501234567"
                      value={localPhone}
                      onChange={(e) => setLocalPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {sendState.message && !sendState.success && (
                  <div className="text-sm text-red-600">
                    {sendState.message}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isSending}>
                  {isSending ? 'Sending code...' : 'Send Code'}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{' '}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
