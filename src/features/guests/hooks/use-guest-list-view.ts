'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GuestWithGroupApp } from '@/features/guests/schemas';
import {
  filterAndSortGuests,
  filterGuests,
  scopeToGuestIssue,
  type GuestFilterParams,
} from '@/features/guests/utils';
import type { GuestListParams } from '@/features/guests/utils/guest-list-params';
import { pruneSelection } from '@/features/guests/utils/guest-selection';
import { useRecordPackage } from '@/features/billing';
import { useGuestListParams } from './use-guest-list-params';
import { useDeferredDelete } from './use-deferred-delete';

const filterOf = (view: GuestListParams): GuestFilterParams => ({
  searchTerm: view.q,
  groupIds: view.groups,
  statuses: view.status ? [view.status] : [],
  sides: view.side ? [view.side] : [],
  noPhoneOnly: view.noPhone,
  sortKey: view.sort,
});

/**
 * The guest list's view, shared by the desktop table and the phone cards: the
 * URL's filters, the selection, the deferred delete, and the rows they leave.
 * Each surface keeps only its own layout and interactions.
 */
export function useGuestListView(allGuests: GuestWithGroupApp[], eventId: string) {
  const { params, update, reset } = useGuestListParams();
  const deferred = useDeferredDelete(eventId);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  // Narrows the list to the selection, from the "N hidden" link.
  const [selectionOnly, setSelectionOnly] = useState(false);

  // Rows waiting on the Undo toast are already gone as far as the Owner sees.
  const guests = useMemo(
    () => allGuests.filter((guest) => !deferred.hiddenIds.has(guest.id)),
    [allGuests, deferred.hiddenIds],
  );

  // Records that stop existing drop out of the selection.
  useEffect(() => {
    setSelected((prev) =>
      pruneSelection(
        prev,
        guests.map((guest) => guest.id),
      ),
    );
  }, [guests]);

  // The Record Package (ADR 0027): which records a Schedule would skip right now. The
  // filter only applies while the event has some - a stale `?package=outside` on a list
  // that fits again shows everyone rather than nothing.
  const { outsideIds } = useRecordPackage();
  const outsideCount = useMemo(
    () => guests.filter((guest) => outsideIds.has(guest.id)).length,
    [guests, outsideIds],
  );
  const outsideOnly = params.outside && outsideCount > 0;

  const scoped = useMemo(() => {
    const issueScoped = params.issue ? scopeToGuestIssue(guests, params.issue) : guests;
    return outsideOnly
      ? issueScoped.filter((guest) => outsideIds.has(guest.id))
      : issueScoped;
  }, [guests, params.issue, outsideOnly, outsideIds]);

  // Only a selection-only view reads `selected`; a tap must not re-sort the list.
  const selectionFilter = selectionOnly ? selected : null;
  const rows = useMemo(
    () =>
      selectionFilter
        ? guests.filter((guest) => selectionFilter.has(guest.id))
        : filterAndSortGuests(scoped, filterOf(params)),
    [selectionFilter, guests, scoped, params],
  );
  const visibleIds = useMemo(() => rows.map((guest) => guest.id), [rows]);

  const statusCounts = useMemo(() => {
    const counts = { all: guests.length, confirmed: 0, pending: 0, declined: 0 };
    for (const guest of guests) counts[guest.rsvpStatus]++;
    return counts;
  }, [guests]);

  /** Records a view would show - for previewing filters before applying them. */
  const countFor = useCallback(
    (view: GuestListParams) => filterGuests(scoped, filterOf(view)).length,
    [scoped],
  );

  const changeFilters: typeof update = (patch, mode) => {
    setSelectionOnly(false);
    update(patch, mode);
  };
  const resetFilters = () => {
    setSelectionOnly(false);
    reset();
  };

  /** Anything narrowing the list, so the count reads "N of M". */
  const filtered =
    selectionOnly ||
    rows.length !== guests.length ||
    !!params.q ||
    !!params.status ||
    params.groups.length > 0 ||
    !!params.side ||
    params.noPhone ||
    !!params.issue ||
    outsideOnly;

  /** Hides the records behind the Undo toast and drops them from the selection. */
  const startDelete = (ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    setSelectionOnly(false);
    deferred.start(ids);
  };

  return {
    params,
    changeFilters,
    resetFilters,
    deferred,
    startDelete,
    guests,
    scoped,
    rows,
    visibleIds,
    statusCounts,
    outsideIds,
    outsideCount,
    outsideOnly,
    filtered,
    countFor,
    selected,
    setSelected,
    selectionOnly,
    setSelectionOnly,
  };
}
