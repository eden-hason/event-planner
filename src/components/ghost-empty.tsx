import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** The neutral bar a ghost draws text with. */
export const GHOST_BAR = 'bg-muted rounded-full';

/**
 * An empty card: a faded ghost of what the card will hold, with the
 * empty-state line and an icon fading in over its lower half.
 */
export function GhostEmpty({
  icon,
  message,
  overlayOffset,
  className,
  children,
}: {
  icon: ReactNode;
  message: string;
  /** Pushes the message down the ghost so it lands over the faded part. */
  overlayOffset: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('relative', className)}>
      {children}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent to-card to-66% p-4">
        <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center" style={{ marginTop: overlayOffset }}>
          <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full">
            {icon}
          </span>
          <span className="text-muted-foreground text-[13px] leading-normal text-pretty">{message}</span>
        </div>
      </div>
    </div>
  );
}
