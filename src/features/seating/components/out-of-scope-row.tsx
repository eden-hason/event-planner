'use client';

import { Lock } from 'lucide-react';
import { useSeatingCopy } from './use-seating-copy';

interface OutOfScopeRowProps {
  records: number;
  heads: number;
}

/**
 * What a scoped Seating Manager sees in place of guests they may not identify.
 *
 * ADR-0008 requires their seats to count against capacity so remaining places
 * are truthful, and requires their names never to appear. This row is the
 * whole of that compromise: a number, a lock, and no identities.
 */
export function OutOfScopeRow({ records, heads }: OutOfScopeRowProps) {
  const { t } = useSeatingCopy();
  if (records <= 0) return null;

  return (
    <div className="bg-muted/60 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm">
      <Lock className="text-muted-foreground size-3.5 shrink-0" />
      <span className="text-muted-foreground min-w-0 flex-1 truncate">
        {t('scope.outOfScope', { count: records })}
      </span>
      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{heads}</span>
    </div>
  );
}
