'use client';

import * as React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableView } from '../types';
import { rsvpSortKey } from '../utils/occupancy';
import { OccupancyBar } from './occupancy-bar';
import { OutOfScopeRow } from './out-of-scope-row';
import { SeatedGuestChip } from './seated-guest-chip';
import { useSeatingCopy } from './use-seating-copy';

interface TableSummaryCardProps {
  view: TableView;
  onOpen: () => void;
  onUnassign?: (guestId: string) => void;
}

const VISIBLE_GUESTS = 3;

/**
 * A Table as a list row: the same facts the canvas node carries, in the shape
 * mobile and the scoped-collaborator view need. Number, optional label,
 * confirmed and provisional occupancy, remaining capacity, and who is seated.
 */
export function TableSummaryCard({ view, onOpen, onUnassign }: TableSummaryCardProps) {
  const { t, tableTitle, occupancyLine } = useSeatingCopy();
  const [expanded, setExpanded] = React.useState(false);

  const { table, occupancy, guests, freeSeats } = view;

  const sorted = React.useMemo(
    () =>
      [...guests].sort(
        (a, b) =>
          rsvpSortKey(a.rsvpStatus) - rsvpSortKey(b.rsvpStatus) ||
          a.name.localeCompare(b.name),
      ),
    [guests],
  );

  const shown = expanded ? sorted : sorted.slice(0, VISIBLE_GUESTS);
  const hidden = sorted.length - shown.length;

  return (
    <div className="bg-card border-border space-y-3 rounded-xl border p-4">
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 text-start">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{tableTitle(table)}</p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {occupancyLine(occupancy, table.capacity)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!view.canDelete && (
            <Lock
              className="text-muted-foreground size-3.5"
              aria-label={t('scope.deleteBlockedTooltip')}
            />
          )}
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              freeSeats === 0
                ? 'bg-muted text-muted-foreground'
                : 'bg-rsvp-confirmed/14 text-muted-foreground',
            )}
          >
            {freeSeats === 0 ? t('table.full') : t('table.left', { count: freeSeats })}
          </span>
        </div>
      </button>

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
            onUnassign={onUnassign ? () => onUnassign(guest.id) : undefined}
          />
        ))}

        <OutOfScopeRow records={view.outOfScopeRecords} heads={view.outOfScopeHeads} />

        {view.outOfScopeRecords > 0 && (
          <p className="text-muted-foreground text-xs">{t('scope.outOfScopeNote')}</p>
        )}

        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-muted-foreground hover:text-foreground w-full py-1 text-xs transition-colors"
          >
            {t('table.showMore', { count: hidden })}
          </button>
        )}

        {sorted.length === 0 && view.outOfScopeRecords === 0 && (
          <p className="text-muted-foreground py-3 text-center text-xs">
            {t('table.noOneSeated')}
          </p>
        )}
      </div>

      {!view.canDelete && (
        <p className="text-muted-foreground text-xs">{t('scope.deleteBlocked')}</p>
      )}
    </div>
  );
}
