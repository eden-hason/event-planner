'use client';

import { useEffect, useState } from 'react';
import { UNDO_WINDOW_MS } from '@/features/guests/hooks/use-deferred-commit';

const RING = 2 * Math.PI * 10;

/**
 * The seconds left on an Undo, as a draining ring around the count - the one
 * the guest and group undo toasts both show. Owns its own tick, so the toast
 * around it does not re-render every 200ms.
 */
export function CountdownRing({ expiresAt }: { expiresAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(tick);
  }, [expiresAt]);

  const left = Math.max(0, expiresAt - now);

  return (
    <span
      className="relative flex size-[26px] shrink-0 items-center justify-center"
      aria-hidden
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx="13"
          cy="13"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth="2.5"
        />
        <circle
          cx="13"
          cy="13"
          r="10"
          fill="none"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={RING}
          strokeDashoffset={RING * (1 - left / UNDO_WINDOW_MS)}
        />
      </svg>
      <span className="text-background/70 relative text-[11px] font-bold tabular-nums">
        {Math.ceil(left / 1000)}
      </span>
    </span>
  );
}
