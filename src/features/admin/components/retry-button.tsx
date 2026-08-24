'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/** Re-runs the failed band's server query without a full page reload. */
export function RetryButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      className="bg-card hover:bg-accent focus-visible:ring-ring shrink-0 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
    >
      {isPending ? 'Retrying' : 'Retry'}
    </button>
  );
}
