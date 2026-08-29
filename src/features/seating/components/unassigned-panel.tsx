'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GuestWithGroupApp } from '@/features/guests';
import type { TableView } from '../types';
import { groupGuests } from '../utils/grouping';
import { headCount } from '../utils/occupancy';
import { UnassignedGroupSection } from './unassigned-group-section';
import { UnassignedGuestRow } from './unassigned-guest-row';
import {
  UnassignedViewSwitch,
  type UnassignedView,
} from './unassigned-view-switch';
import { useSeatingCopy } from './use-seating-copy';

interface UnassignedPanelProps {
  unassigned: GuestWithGroupApp[];
  /** The Event's own group order, so sections read the same as the Directory. */
  groups: Array<{ id: string; name: string }>;
  /** Shared search state - the same query drives desktop and mobile. */
  query: string;
  onQueryChange: (query: string) => void;
  /** Seated records that match the query, so search never dead-ends on them. */
  seatedMatches: Array<{ guest: GuestWithGroupApp; view: TableView }>;
  onRevealGuest: (guestId: string) => void;
  selectedIds: string[];
  onToggleSelect: (guestId: string) => void;
  onSelectMany: (guestIds: string[]) => void;
  onClearSelection: () => void;
  onAssignOne: (guestId: string) => void;
  onAssignSelected: () => void;
  draggable?: boolean;
  className?: string;
}

export function matchesQuery(guest: GuestWithGroupApp, query: string): boolean {
  if (!query) return true;
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return (
    guest.name.toLowerCase().includes(term) ||
    (guest.group?.name ?? '').toLowerCase().includes(term)
  );
}

/**
 * Seated records that matched the search, rendered as tappable rows that open
 * the Table and highlight the guest. Shared verbatim by the desktop panel and
 * the mobile Unassigned tab so a seated hit behaves identically on both.
 */
export function SeatedSearchMatches({
  matches,
  onReveal,
  className,
}: {
  matches: Array<{ guest: GuestWithGroupApp; view: TableView }>;
  onReveal: (guestId: string) => void;
  className?: string;
}) {
  const { t, tableTitle } = useSeatingCopy();
  if (matches.length === 0) return null;

  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-muted-foreground text-xs">
        {t('unassigned.seatedMatchHeading', { count: matches.length })}
      </p>
      <div className="flex flex-col gap-1">
        {matches.map(({ guest, view }) => (
          <button
            key={guest.id}
            type="button"
            onClick={() => onReveal(guest.id)}
            className="bg-muted/60 hover:bg-muted flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-start text-sm transition-colors"
          >
            <span className="min-w-0 flex-1 truncate">{guest.name}</span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {tableTitle(view.table)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The Unassigned list, and the surface where search results land.
 *
 * The query itself lives in the shared workspace so desktop and mobile search
 * as one. Unassigned matches stay actionable in the list below; matches that
 * are already seated are surfaced as their own tappable block that opens the
 * Table and highlights the row - never a dead end on the empty state.
 */
export function UnassignedPanel({
  unassigned,
  groups,
  query,
  onQueryChange,
  seatedMatches,
  onRevealGuest,
  selectedIds,
  onToggleSelect,
  onSelectMany,
  onClearSelection,
  onAssignOne,
  onAssignSelected,
  draggable = false,
  className,
}: UnassignedPanelProps) {
  const { t } = useSeatingCopy();
  const [view, setView] = React.useState<UnassignedView>('guests');

  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-panel',
    data: { type: 'unassigned' },
  });

  const visible = React.useMemo(
    () => unassigned.filter((guest) => matchesQuery(guest, query)),
    [unassigned, query],
  );

  const searching = query.trim().length > 0;
  const noMatchesAnywhere =
    searching && visible.length === 0 && seatedMatches.length === 0;

  // Built from the filtered list, so search reaches into both views alike.
  const sections = React.useMemo(
    () => (view === 'groups' ? groupGuests(visible, groups) : []),
    [view, visible, groups],
  );

  const selectedGuests = unassigned.filter((guest) =>
    selectedIds.includes(guest.id),
  );
  const selectedHeads = headCount(selectedGuests);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'bg-card border-border flex min-h-0 flex-col rounded-xl border transition-colors',
        isOver && 'border-primary bg-primary/5',
        className,
      )}
    >
      <div className="border-border space-y-3 border-b p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{t('unassigned.title')}</h2>
          <span className="text-muted-foreground text-xs tabular-nums">
            {t('unassigned.countLine', {
              records: unassigned.length,
              heads: headCount(unassigned),
            })}
          </span>
        </div>

        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t('unassigned.searchPlaceholder')}
            className="ps-9"
          />
        </div>

        <UnassignedViewSwitch value={view} onChange={setView} />

        {searching && (
          <SeatedSearchMatches
            matches={seatedMatches}
            onReveal={onRevealGuest}
          />
        )}

        {noMatchesAnywhere && (
          <p className="text-muted-foreground text-xs">
            {t('unassigned.noMatches', { query: query.trim() })}
          </p>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="border-border bg-primary/5 space-y-2 border-b px-4 py-3">
          <p className="text-xs font-medium">
            {t('unassigned.selectionLine', {
              records: selectedIds.length,
              heads: selectedHeads,
            })}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={onAssignSelected}>
              {t('unassigned.assignSelected')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
            >
              {t('unassigned.clear')}
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {view === 'groups'
          ? sections.map((section) => (
              <UnassignedGroupSection
                key={section.id}
                section={section}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                onSelectAll={onSelectMany}
                onAssignOne={onAssignOne}
                draggable={draggable}
              />
            ))
          : visible.map((guest) => (
              <UnassignedGuestRow
                key={guest.id}
                guest={guest}
                selected={selectedIds.includes(guest.id)}
                onToggle={() => onToggleSelect(guest.id)}
                onAssign={() => onAssignOne(guest.id)}
                draggable={draggable}
              />
            ))}

        {visible.length === 0 && !searching && (
          <div className="text-muted-foreground px-3 py-10 text-center text-sm">
            <p>{t('unassigned.empty')}</p>
            <p className="mt-1 text-xs">{t('unassigned.emptyHint')}</p>
          </div>
        )}

        {visible.length === 0 && searching && !noMatchesAnywhere && (
          <p className="text-muted-foreground px-3 py-6 text-center text-xs">
            {t('unassigned.allMatchesSeated')}
          </p>
        )}
      </div>
    </div>
  );
}
