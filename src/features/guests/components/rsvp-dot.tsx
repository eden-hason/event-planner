import { cn } from '@/lib/utils';
import { rsvpPresentation, type RsvpStatus } from '../utils/rsvp-presentation';

/**
 * The RSVP as a bare colour dot. Decorative by design: it is `aria-hidden`, so
 * every caller has to render the label next to it. Pass `className` for size
 * only - the colour is not the caller's decision.
 */
export function RsvpDot({
  status,
  className,
}: {
  status: RsvpStatus;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        rsvpPresentation(status).solid,
        className,
      )}
    />
  );
}
