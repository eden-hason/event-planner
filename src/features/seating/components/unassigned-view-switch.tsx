'use client';

import { cn } from '@/lib/utils';
import { useSeatingCopy } from './use-seating-copy';

export type UnassignedView = 'guests' | 'groups';

interface UnassignedViewSwitchProps {
  value: UnassignedView;
  onChange: (view: UnassignedView) => void;
  className?: string;
}

/**
 * Flat list or grouped list, on both surfaces.
 *
 * Shared rather than written twice: desktop and mobile show the same two views
 * of the same records, and a switch that drifts between them is a switch that
 * means something different depending on where you are standing.
 */
export function UnassignedViewSwitch({
  value,
  onChange,
  className,
}: UnassignedViewSwitchProps) {
  const { t } = useSeatingCopy();

  return (
    <div className={cn('bg-muted flex rounded-lg p-0.5', className)}>
      {(['guests', 'groups'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={cn(
            'flex-1 rounded-md px-2.5 py-1.5 text-sm transition-colors',
            value === option
              ? 'bg-card text-foreground font-medium'
              : 'text-muted-foreground',
          )}
        >
          {t(
            option === 'guests'
              ? 'unassigned.viewGuests'
              : 'unassigned.viewGroups',
          )}
        </button>
      ))}
    </div>
  );
}
