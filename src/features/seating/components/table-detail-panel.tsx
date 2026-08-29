'use client';

import * as React from 'react';
import { Minus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  MAX_CAPACITY,
  MIN_CAPACITY,
  TABLE_SHAPES,
  type TableRotation,
  type TableShape,
} from '../schemas';
import type { TableView } from '../types';
import { rsvpSortKey } from '../utils/occupancy';
import { OccupancyBar } from './occupancy-bar';
import { OutOfScopeRow } from './out-of-scope-row';
import { SeatedGuestChip } from './seated-guest-chip';
import { useSeatingCopy } from './use-seating-copy';

interface TableDetailPanelProps {
  view: TableView;
  onClose: () => void;
  onUnassign: (guestId: string) => void;
  onShapeChange: (shape: TableShape) => void;
  /**
   * Omitted on mobile. Rotation only means something against the canvas, which
   * ADR-0009 keeps a desktop affordance - so on mobile the row is not rendered
   * rather than rendered as a control that changes nothing a planner can see.
   */
  onRotationChange?: (rotation: TableRotation) => void;
  onCapacityChange: (capacity: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  /** A record surfaced by search - highlighted here, and revealed even if it was in the overflow. */
  highlightGuestId?: string | null;
  className?: string;
}

const VISIBLE_GUESTS = 3;

/**
 * Only a long table has an orientation worth choosing: a round or square
 * footprint is symmetric, so a quarter turn changes nothing a planner can see.
 * Two states rather than four turns, because the other two are the same two
 * pictures (ADR-0009).
 */
const ORIENTATIONS = [
  { key: 'horizontal', rotation: 0 },
  { key: 'vertical', rotation: 90 },
] as const satisfies ReadonlyArray<{ key: string; rotation: TableRotation }>;

function isUpright(rotation: TableRotation) {
  return rotation === 0 || rotation === 180;
}

export function TableDetailPanel({
  view,
  onClose,
  onUnassign,
  onShapeChange,
  onRotationChange,
  onCapacityChange,
  onEdit,
  onDelete,
  highlightGuestId,
  className,
}: TableDetailPanelProps) {
  const { t, tableTitle, occupancyLine } = useSeatingCopy();
  const [expanded, setExpanded] = React.useState(false);

  const { table, occupancy, guests, seatedHeads } = view;

  const sorted = React.useMemo(
    () =>
      [...guests].sort(
        (a, b) =>
          rsvpSortKey(a.rsvpStatus) - rsvpSortKey(b.rsvpStatus) ||
          a.name.localeCompare(b.name),
      ),
    [guests],
  );

  // A highlighted record that sits past the fold forces the list open, so a
  // search result is never hidden behind "Show more".
  const highlightHidden =
    !expanded &&
    sorted.findIndex((guest) => guest.id === highlightGuestId) >= VISIBLE_GUESTS;

  React.useEffect(() => {
    if (highlightHidden) setExpanded(true);
  }, [highlightHidden]);

  const shown = expanded ? sorted : sorted.slice(0, VISIBLE_GUESTS);
  const hidden = sorted.length - shown.length;

  // Capacity can never be dragged below what is already seated (ADR-0008); the
  // stepper stops rather than offering a value the save would reject.
  const canShrink = table.capacity > Math.max(MIN_CAPACITY, seatedHeads);
  const canGrow = table.capacity < MAX_CAPACITY;

  return (
    <div
      className={cn(
        'bg-card border-border w-80 space-y-4 rounded-xl border p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{tableTitle(table)}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {occupancyLine(occupancy, table.capacity)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('table.close')}
          className="text-muted-foreground hover:bg-muted hover:text-foreground -me-1 -mt-1 rounded p-1 transition-colors"
        >
          <X className="size-3.5" strokeWidth={2.5} />
        </button>
      </div>

      <OccupancyBar
        confirmedHeads={occupancy.confirmedHeads}
        pendingHeads={occupancy.pendingHeads}
        capacity={table.capacity}
      />

      <div className="space-y-1.5">
        {shown.map((guest) => (
          <SeatedGuestChip
            key={guest.id}
            guest={guest}
            highlighted={guest.id === highlightGuestId}
            onUnassign={() => onUnassign(guest.id)}
          />
        ))}

        <OutOfScopeRow
          records={view.outOfScopeRecords}
          heads={view.outOfScopeHeads}
        />

        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-muted-foreground hover:text-foreground w-full py-1 text-xs transition-colors"
          >
            {t('table.showMore', { count: hidden })}
          </button>
        )}

        {expanded && sorted.length > VISIBLE_GUESTS && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-muted-foreground hover:text-foreground w-full py-1 text-xs transition-colors"
          >
            {t('table.showLess')}
          </button>
        )}

        {sorted.length === 0 && view.outOfScopeRecords === 0 && (
          <div className="text-muted-foreground py-6 text-center text-xs">
            <p>{t('table.noOneSeated')}</p>
            <p className="mt-1">{t('table.noOneSeatedHint')}</p>
          </div>
        )}
      </div>

      <div className="border-border space-y-3 border-t pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">
            {t('table.shape')}
          </span>
          <div className="bg-muted flex rounded-lg p-0.5">
            {TABLE_SHAPES.map((shape) => (
              <button
                key={shape}
                type="button"
                onClick={() => onShapeChange(shape)}
                aria-pressed={table.shape === shape}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs transition-colors',
                  table.shape === shape
                    ? 'bg-card text-foreground font-medium'
                    : 'text-muted-foreground',
                )}
              >
                {t(`shapes.${shape}`)}
              </button>
            ))}
          </div>
        </div>

        {onRotationChange && table.shape === 'rectangle' && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-xs">
              {t('table.orientation')}
            </span>
            <div className="bg-muted flex rounded-lg p-0.5">
              {ORIENTATIONS.map(({ key, rotation }) => {
                const isActive = isUpright(table.rotation) === (rotation === 0);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onRotationChange(rotation)}
                    aria-pressed={isActive}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs transition-colors',
                      isActive
                        ? 'bg-card text-foreground font-medium'
                        : 'text-muted-foreground',
                    )}
                  >
                    {t(`orientations.${key}`)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">
            {t('table.seats')}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7"
              disabled={!canShrink}
              aria-label={t('table.fewerSeats')}
              onClick={() => onCapacityChange(table.capacity - 1)}
            >
              <Minus className="size-3" strokeWidth={2.5} />
            </Button>
            <span className="w-6 text-center text-sm font-medium tabular-nums">
              {table.capacity}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7"
              disabled={!canGrow}
              aria-label={t('table.moreSeats')}
              onClick={() => onCapacityChange(table.capacity + 1)}
            >
              <Plus className="size-3" strokeWidth={2.5} />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
            {t('table.editNumberAndLabel')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hover:border-destructive hover:text-destructive size-8"
            aria-label={t('table.deleteTable')}
            title={view.canDelete ? undefined : t('scope.deleteBlockedTooltip')}
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        {!view.canDelete && (
          <p className="text-muted-foreground text-xs">
            {t('scope.deleteBlocked')}
          </p>
        )}
      </div>
    </div>
  );
}
