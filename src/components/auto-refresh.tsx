'use client';

import { useEffect, useTransition } from 'react';

import { useRouter } from '@/i18n/navigation';

/**
 * Re-renders the current route from the server on an interval, while `active`
 * and only while the browser tab is visible. The app has no live push, so a
 * screen that shows something still moving (schedule results, a call round
 * being worked) drops this in beside its Refresh button. Renders nothing.
 */
export function AutoRefresh({
  active = true,
  intervalMs = 30_000,
}: {
  active?: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible')
        startTransition(() => router.refresh());
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);

  return null;
}
