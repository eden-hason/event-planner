'use client';

import { useOptimistic, useTransition } from 'react';
import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setTestAccountsVisible } from '../actions/test-accounts';

/**
 * The one control for the test-account filter, in the top bar because it
 * changes what every Back Office page shows - a switch that lived on Events would
 * silently move the Overview's counts too.
 *
 * The whole capsule is the hit target, with the switch inside it as the state
 * readout. The track and knob are drawn here rather than taken from ui/switch:
 * that primitive is sized and coloured for the Owner app's forms, and its knob
 * does not paint at all in this shell.
 *
 * Optimistic, because the action revalidates the whole shell and that round
 * trip is long enough that a control waiting on it would read as unresponsive.
 */
export function TestAccountsToggle({ visible }: { visible: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(visible);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label="Test accounts"
      disabled={isPending}
      title={
        optimistic
          ? 'Test accounts are included across the Back Office'
          : 'Test accounts are hidden across the Back Office'
      }
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await setTestAccountsVisible(!optimistic);
        })
      }
      className={cn(
        'bg-card hover:bg-accent/50 focus-visible:ring-ring flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border pr-1.5 pl-3 transition-colors focus-visible:ring-2 focus-visible:outline-none',
        isPending && 'pointer-events-none opacity-60',
      )}
    >
      <FlaskConical
        className={cn('size-4', optimistic ? 'text-primary' : 'text-muted-foreground')}
      />
      <span className="text-[13px] font-medium">Test accounts</span>
      {/*
       * Absolute knob rather than a translated one: the offsets are the two
       * ends of the track, so the resting position cannot drift with the
       * writing direction the way a translate does.
       */}
      <span
        className={cn(
          'relative block h-[18px] w-8 rounded-full transition-colors',
          optimistic ? 'bg-primary' : 'bg-muted-foreground/20',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-3.5 rounded-full bg-background shadow-sm transition-all',
            optimistic ? 'left-[16px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}
