'use client';

import { useTranslations } from 'next-intl';
import type { SeatingFailure } from '../actions';
import type { TableOccupancy, TableView } from '../types';

type TableIdentity = { tableNumber: number; label?: string | null };

/**
 * Every string the Seating Plan says about a Table, in one place.
 *
 * The same phrases appear on the canvas, in the picker, in the mobile list and
 * in toasts, and they carry the numbers a planner acts on - so getting them
 * from one source is what stops a table reading "2 places left" in one surface
 * and "8 of 10" in another.
 */
export function useSeatingCopy() {
  const t = useTranslations('seating');

  const tableTitle = (table: TableIdentity) =>
    table.label
      ? t('tableTitle', { number: table.tableNumber, label: table.label })
      : t('tableNumber', { number: table.tableNumber });

  const occupancyLine = (occupancy: TableOccupancy, capacity: number) => {
    if (occupancy.confirmedHeads + occupancy.pendingHeads === 0) {
      return t('table.emptyWithPlaces', { capacity });
    }
    return occupancy.pendingHeads > 0
      ? t('table.occupancyWithPending', {
          confirmed: occupancy.confirmedHeads,
          pending: occupancy.pendingHeads,
          capacity,
        })
      : t('table.occupancy', { confirmed: occupancy.confirmedHeads, capacity });
  };

  const remainingPill = (free: number) =>
    free === 0 ? t('table.full') : t('table.placesLeft', { count: free });

  /**
   * Turns a refusal from the database into the sentence the design specifies:
   * the party size, the places left, and the shortfall, every time. Never a
   * bare "something went wrong" when the numbers are known.
   */
  const failureMessage = (
    failure: SeatingFailure | undefined,
    context: { name?: string; table?: TableIdentity; fallback?: string } = {},
  ): string => {
    const tableName = context.table ? tableTitle(context.table) : '';

    switch (failure?.kind) {
      case 'overCapacity':
        return failure.records > 1
          ? t('errors.overCapacityBulk', {
              records: failure.records,
              party: failure.party,
              table: tableName,
              free: failure.free,
              shortfall: failure.shortfall,
            })
          : t('errors.overCapacitySingle', {
              name: context.name ?? '',
              party: failure.party,
              table: tableName,
              free: failure.free,
              shortfall: failure.shortfall,
            });
      case 'capacityBelowOccupancy':
        return t('errors.capacityBelowOccupancy', {
          table: tableName,
          occupancy: failure.occupancy,
        });
      case 'duplicateNumbers':
        return failure.numbers.length === 1
          ? t('errors.duplicateNumber', { number: failure.numbers[0] })
          : t('errors.duplicateNumbers', { numbers: failure.numbers.join(', ') });
      case 'deleteOutOfScope':
        return t('errors.deleteOutOfScope');
      case 'tableNotFound':
        return t('errors.tableNotFound');
      case 'nothingAssignable':
        return t('errors.nothingAssignable');
      default:
        return context.fallback ?? t('errors.assignFailed');
    }
  };

  /** The option sub-line in every Assign picker. */
  const fitLine = (table: TableView, partyHeads: number) => {
    const base = occupancyLine(table.occupancy, table.table.capacity);
    const fits = partyHeads <= table.freeSeats;
    const suffix = fits
      ? t('assignDialog.freePlaces', { count: table.freeSeats })
      : t('assignDialog.short', { count: partyHeads - table.freeSeats });
    return `${base} · ${suffix}`;
  };

  return { t, tableTitle, occupancyLine, remainingPill, failureMessage, fitLine };
}
