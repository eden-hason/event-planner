import { cn } from '@/lib/utils';

interface OccupancyBarProps {
  confirmedHeads: number;
  pendingHeads: number;
  capacity: number;
  className?: string;
}

/**
 * Confirmed and provisional places, shown apart but measured against one
 * capacity - which is exactly how ADR-0008 says they behave. A pending
 * assignment holds its seats just as firmly as a confirmed one; it is only
 * drawn differently so a planner can see what is still soft.
 */
export function OccupancyBar({
  confirmedHeads,
  pendingHeads,
  capacity,
  className,
}: OccupancyBarProps) {
  const safeCapacity = Math.max(capacity, 1);
  const confirmedWidth = Math.min((confirmedHeads / safeCapacity) * 100, 100);
  const pendingWidth = Math.min(
    (pendingHeads / safeCapacity) * 100,
    Math.max(100 - confirmedWidth, 0),
  );

  return (
    <div className={cn('bg-muted flex h-1.5 w-full overflow-hidden rounded-full', className)}>
      <div
        className="bg-rsvp-confirmed h-full transition-[width]"
        style={{ width: `${confirmedWidth}%` }}
      />
      <div
        className="bg-rsvp-pending h-full transition-[width]"
        style={{ width: `${pendingWidth}%` }}
      />
    </div>
  );
}
