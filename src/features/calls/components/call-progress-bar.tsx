import { cn } from '@/lib/utils';

import { roundProgress, type RoundCounts, type RoundSegmentKey } from '../utils/round-results';

// The hue of each outcome, as a fill. A "no answer" is grey rather than amber:
// on this bar it is the absence of an answer, and amber is what the RSVP
// column uses for a guest who is still pending.
const SEGMENT_FILL: Record<RoundSegmentKey, string> = {
  confirmed: 'bg-rsvp-confirmed',
  declined: 'bg-rsvp-declined',
  noAnswer: 'bg-muted-foreground/50',
  willUpdate: 'bg-outcome-will-update',
};

const SIZE = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3' } as const;

/**
 * How far a round has got, as one bar: a segment per outcome, and the track
 * showing through for the guests still waiting for a call.
 */
export function CallProgressBar({
  counts,
  size = 'sm',
  className,
}: {
  counts: RoundCounts;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const { segments } = roundProgress(counts);

  return (
    <div
      aria-hidden
      className={cn('bg-muted flex w-full overflow-hidden rounded-full', SIZE[size], className)}
    >
      {segments.map(({ key, percent }) => (
        <div key={key} className={SEGMENT_FILL[key]} style={{ width: `${percent}%` }} />
      ))}
    </div>
  );
}
