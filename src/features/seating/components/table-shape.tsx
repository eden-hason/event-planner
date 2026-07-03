'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { groupColor } from '../utils/group-color';
import { rsvpSortKey } from '../utils/occupancy';
import type { TableShape as TableShapeKind } from '../schemas';
import type { GuestWithGroupApp } from '@/features/guests/schemas';

interface TableShapeProps {
  shape: TableShapeKind;
  label: string | null;
  tableNumber: number;
  seatedHeadCount: number;
  capacity: number;
  guests: GuestWithGroupApp[];
  isOver?: boolean;
  highlightGroupId?: string | null;
  className?: string;
}

const SHAPE_DIMENSIONS: Record<TableShapeKind, { width: number; height: number }> = {
  round: { width: 180, height: 180 },
  square: { width: 180, height: 180 },
  rectangle: { width: 240, height: 130 },
};

const SEAT_SIZE = 22;
const SEAT_GAP = 8;

function getSeatPositions(
  shape: TableShapeKind,
  width: number,
  height: number,
  capacity: number,
): Array<{ x: number; y: number }> {
  const edgeDist = SEAT_GAP + SEAT_SIZE / 2;

  if (shape === 'round') {
    const ringRadius = Math.min(width, height) / 2 + edgeDist;
    const cx = width / 2;
    const cy = height / 2;
    return Array.from({ length: capacity }, (_, i) => {
      const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
      return {
        x: cx + ringRadius * Math.cos(angle),
        y: cy + ringRadius * Math.sin(angle),
      };
    });
  }

  const perimeter = 2 * (width + height);
  const topCount = Math.max(1, Math.round((capacity * width) / perimeter));
  const bottomCount = Math.max(1, Math.round((capacity * width) / perimeter));
  const remaining = capacity - topCount - bottomCount;
  const leftCount = Math.max(0, Math.floor(remaining / 2));
  const rightCount = Math.max(0, remaining - leftCount);

  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < topCount; i++)
    positions.push({ x: (width / (topCount + 1)) * (i + 1), y: -edgeDist });
  for (let i = 0; i < bottomCount; i++)
    positions.push({ x: (width / (bottomCount + 1)) * (i + 1), y: height + edgeDist });
  for (let i = 0; i < leftCount; i++)
    positions.push({ x: -edgeDist, y: (height / (leftCount + 1)) * (i + 1) });
  for (let i = 0; i < rightCount; i++)
    positions.push({ x: width + edgeDist, y: (height / (rightCount + 1)) * (i + 1) });

  return positions;
}

interface SeatOccupant {
  initial: string;
  bg: string;
  fg: string;
  groupId: string | null | undefined;
}

function buildSeatOccupants(guests: GuestWithGroupApp[]): SeatOccupant[] {
  const sorted = [...guests].sort(
    (a, b) =>
      rsvpSortKey(a.rsvpStatus) - rsvpSortKey(b.rsvpStatus) ||
      a.name.localeCompare(b.name),
  );
  const occupants: SeatOccupant[] = [];
  for (const g of sorted) {
    const color = groupColor(g.groupId);
    const initial = g.name.trim().charAt(0).toUpperCase();
    for (let i = 0; i < g.amount; i++) {
      occupants.push({ initial, bg: color.bg, fg: color.fg, groupId: g.groupId });
    }
  }
  return occupants;
}

function CapacityRing({ seated, capacity }: { seated: number; capacity: number }) {
  const size = 34;
  const radius = 13;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = capacity > 0 ? Math.min(1, seated / capacity) : 0;
  const isOver = seated > capacity;
  const isFull = !isOver && seated === capacity;
  const dashOffset = circumference * (1 - pct);
  const strokeColor = isOver ? '#ef4444' : isFull ? '#ec4899' : '#22c55e';

  return (
    <div
      className="absolute -left-3 -top-3 flex items-center justify-center rounded-full border bg-background shadow-sm"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={2.5}
        />
        {pct > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2.5}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        )}
      </svg>
      <span
        className="relative z-10 select-none font-semibold leading-none"
        style={{ fontSize: 7, color: strokeColor }}
      >
        {seated}/{capacity}
      </span>
    </div>
  );
}

export function TableShape({
  shape,
  label,
  tableNumber,
  seatedHeadCount,
  capacity,
  guests,
  isOver,
  highlightGroupId,
  className,
}: TableShapeProps) {
  const dims = SHAPE_DIMENSIONS[shape];
  const isOverCapacity = seatedHeadCount > capacity;
  const seatPositions = getSeatPositions(shape, dims.width, dims.height, capacity);
  const occupants = buildSeatOccupants(guests);

  return (
    <div
      className={cn('relative', className)}
      style={{ width: dims.width, height: dims.height }}
    >
      {/* Seat circles */}
      {seatPositions.map((pos, i) => {
        const occupant = occupants[i];
        const isOccupied = !!occupant;
        const isDimmed =
          !!highlightGroupId && isOccupied && occupant.groupId !== highlightGroupId;

        return (
          <div
            key={i}
            className={cn(
              'absolute flex items-center justify-center rounded-full border-2 text-[9px] font-bold transition-all select-none',
              !isOccupied && 'border-slate-200 bg-background',
            )}
            style={{
              width: SEAT_SIZE,
              height: SEAT_SIZE,
              left: pos.x - SEAT_SIZE / 2,
              top: pos.y - SEAT_SIZE / 2,
              backgroundColor: isOccupied ? occupant.bg : undefined,
              borderColor: isOccupied ? occupant.bg : undefined,
              color: isOccupied ? occupant.fg : undefined,
              opacity: isDimmed ? 0.25 : 1,
            }}
          >
            {isOccupied ? occupant.initial : null}
          </div>
        );
      })}

      {/* Table body */}
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center border-2 transition-colors',
          shape === 'round' && 'rounded-full',
          (shape === 'square' || shape === 'rectangle') && 'rounded-xl',
          isOver
            ? 'border-primary bg-amber-100 ring-2 ring-primary/40'
            : isOverCapacity
              ? 'border-red-300 bg-amber-100'
              : 'border-amber-300 bg-amber-100',
        )}
      >
        <div className="text-3xl font-bold leading-none text-foreground/80">
          {tableNumber}
        </div>
        {label && label.trim().length > 0 && (
          <div className="mt-1 max-w-full truncate px-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
        )}
      </div>

      {/* Capacity ring */}
      <CapacityRing seated={seatedHeadCount} capacity={capacity} />
    </div>
  );
}

export const TABLE_DIMENSIONS = SHAPE_DIMENSIONS;
