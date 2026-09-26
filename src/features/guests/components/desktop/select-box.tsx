'use client';

import type { MouseEvent } from 'react';
import { IconCheck, IconMinus } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/**
 * The list's selection checkbox. A plain button rather than the shadcn
 * `Checkbox`, because selection needs the raw click (shift-click selects a
 * range) and a third, "some" state for the header.
 */
export function SelectBox({
  state,
  label,
  onClick,
  className,
}: {
  state: 'all' | 'some' | 'none';
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}) {
  const on = state !== 'none';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'some' ? 'mixed' : on}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      className={cn(
        'flex h-full w-full items-center justify-center outline-none',
        'focus-visible:[&>span]:ring-ring/50 focus-visible:[&>span]:ring-[3px]',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-4 items-center justify-center rounded-[4px] border-[1.5px] transition-colors',
          on
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/45 bg-card',
        )}
      >
        {state === 'all' && <IconCheck size={12} stroke={3} />}
        {state === 'some' && <IconMinus size={12} stroke={3} />}
      </span>
    </button>
  );
}
