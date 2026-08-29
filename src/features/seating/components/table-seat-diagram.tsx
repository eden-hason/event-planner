import { cn } from '@/lib/utils';
import type { TableRotation, TableShape } from '../schemas';
import {
  SEAT_RADIUS,
  SEAT_STROKE_WIDTH,
  TABLE_CORNER_RADIUS,
  TABLE_STROKE_WIDTH,
  rotatedFrame,
  seatLayout,
} from '../utils/seat-layout';

interface TableSeatDiagramProps {
  shape: TableShape;
  rotation?: TableRotation;
  capacity: number;
  confirmedHeads: number;
  pendingHeads: number;
  /** Highlighted while a guest is dragged over the table. */
  isDropTarget?: boolean;
  className?: string;
}

const SEAT_CLASS = {
  confirmed: 'fill-rsvp-confirmed stroke-transparent',
  pending: 'fill-rsvp-pending stroke-transparent',
  empty: 'fill-card stroke-border',
} as const;

/**
 * A Table drawn top-down, one seat per unit of capacity (ADR-0009).
 *
 * Seats fill confirmed first, then provisional, so occupancy reads as one
 * continuous arc rather than a scatter, and an almost-full table looks
 * almost full before anyone reads the numbers.
 */
export function TableSeatDiagram({
  shape,
  rotation = 0,
  capacity,
  confirmedHeads,
  pendingHeads,
  isDropTarget = false,
  className,
}: TableSeatDiagramProps) {
  const layout = seatLayout(shape, capacity, confirmedHeads, pendingHeads);
  const frame = rotatedFrame(layout, rotation);

  return (
    <svg
      viewBox={frame.viewBox}
      className={cn('block h-full w-full overflow-visible', className)}
      role="presentation"
      aria-hidden="true"
    >
      <g transform={frame.transform}>
        {layout.top.kind === 'circle' ? (
          <circle
            cx={layout.top.cx}
            cy={layout.top.cy}
            r={layout.top.r}
            strokeWidth={TABLE_STROKE_WIDTH}
            className={cn(
              'transition-colors',
              isDropTarget
                ? 'fill-primary/10 stroke-primary'
                : 'fill-card stroke-border',
            )}
          />
        ) : (
          <rect
            x={layout.top.x}
            y={layout.top.y}
            width={layout.top.width}
            height={layout.top.height}
            rx={TABLE_CORNER_RADIUS}
            strokeWidth={TABLE_STROKE_WIDTH}
            className={cn(
              'transition-colors',
              isDropTarget
                ? 'fill-primary/10 stroke-primary'
                : 'fill-card stroke-border',
            )}
          />
        )}

        {layout.seats.map((seat, index) => (
          <circle
            key={index}
            cx={seat.x}
            cy={seat.y}
            r={SEAT_RADIUS}
            strokeWidth={SEAT_STROKE_WIDTH}
            className={SEAT_CLASS[seat.fill]}
          />
        ))}
      </g>
    </svg>
  );
}
