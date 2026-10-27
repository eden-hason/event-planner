'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { switchSignInMethod } from '../actions';
import { otherSignInMethod, type SignInMethod } from '../utils/sign-in-method';

/**
 * For a brand-new account that has just landed in onboarding: it may be an
 * Owner who opened their Event with the other Sign-in Method, on another device
 * (backlog 0029). Says which method they used and offers the other one, which
 * signs out of this account and goes straight there.
 */
export function OtherMethodPrompt({ usedMethod }: { usedMethod: SignInMethod }) {
  const t = useTranslations('auth.otherMethod');
  const other = otherSignInMethod(usedMethod);
  const [isSwitching, startSwitching] = useTransition();

  const handleSwitch = () => {
    startSwitching(async () => {
      try {
        await switchSignInMethod(other);
      } catch (error) {
        // Leaving for Google or /login surfaces here as a thrown NEXT_REDIRECT.
        if (error instanceof Error && error.message?.includes('NEXT_REDIRECT')) return;
        // The sign-out may have gone through; /login works either way.
        window.location.assign('/login');
      }
    });
  };

  return (
    <p className="mt-4 text-center text-[13.5px] text-pretty text-[var(--kt-ink-muted)]">
      {t(usedMethod)}{' '}
      <button
        type="button"
        onClick={handleSwitch}
        disabled={isSwitching}
        className="font-semibold text-[var(--kt-brand)] hover:text-[var(--kt-brand-deep)] disabled:cursor-wait"
      >
        {other === 'google' ? t('switchToGoogle') : t('switchToPhone')}
      </button>
    </p>
  );
}
