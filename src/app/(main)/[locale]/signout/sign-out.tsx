'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/components/layout/use-logout';

export function SignOut() {
  const t = useTranslations('auth.signOut');
  const logout = useLogout();
  const [failed, setFailed] = useState(false);
  // Strict Mode mounts effects twice in development; sign out once
  const started = useRef(false);

  const signOut = useCallback(async () => {
    setFailed(false);
    try {
      const result = await logout();
      if (result && !result.success) setFailed(true);
    } catch {
      setFailed(true);
    }
  }, [logout]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void signOut();
  }, [signOut]);

  return (
    // theme-locked-light: reachable while unauthenticated - see the comment
    // above `.theme-locked-light` in globals.css.
    <div className="theme-locked-light flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-4">
      {failed ? (
        <>
          <p className="text-muted-foreground text-sm">{t('signOutFailed')}</p>
          <Button onClick={() => void signOut()}>{t('tryAgain')}</Button>
        </>
      ) : (
        <>
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
          <p className="text-muted-foreground text-sm">{t('signingOut')}</p>
        </>
      )}
    </div>
  );
}
