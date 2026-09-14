import { cn } from '@/lib/utils';
import type { GuestStats } from '../../types';

/** Confirmed · pending · declined as one segmented bar on the track colour. */
export function RsvpTriBar({ counts, className }: { counts: GuestStats; className?: string }) {
  const width = (n: number) => (counts.total > 0 ? `${(n / counts.total) * 100}%` : '0%');
  return (
    <div className={cn('bg-muted flex gap-0.5 overflow-hidden rounded-full', className)}>
      {counts.confirmed > 0 && <div className="bg-rsvp-confirmed" style={{ width: width(counts.confirmed) }} />}
      {counts.pending > 0 && <div className="bg-rsvp-pending" style={{ width: width(counts.pending) }} />}
      {counts.declined > 0 && <div className="bg-rsvp-declined" style={{ width: width(counts.declined) }} />}
    </div>
  );
}
