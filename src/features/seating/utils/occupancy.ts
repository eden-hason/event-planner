import type { GuestWithGroupApp } from '@/features/guests/schemas';
import type { SeatingProgressView, TableOccupancy, TableView } from '../types';

/**
 * Capacity is counted in people (ADR-0009). Plan readiness is counted both
 * ways: the headline percentage and completeness in Guest Records, the
 * supporting counts shown to the planner in guests. Everything in this file
 * keeps the units apart.
 */

/** Confirmed first, then pending, then everything else. */
export function rsvpSortKey(status: GuestWithGroupApp['rsvpStatus']): number {
  if (status === 'confirmed') return 0;
  if (status === 'pending') return 1;
  return 2;
}

export function headCount(guests: GuestWithGroupApp[]): number {
  return guests.reduce((total, guest) => total + (guest.amount ?? 1), 0);
}

/** Declined records do not participate in the plan and reserve nothing. */
export function participates(guest: GuestWithGroupApp): boolean {
  return guest.rsvpStatus !== 'declined';
}

export function splitHeads(guests: GuestWithGroupApp[]) {
  let confirmedHeads = 0;
  let pendingHeads = 0;

  for (const guest of guests) {
    if (guest.rsvpStatus === 'confirmed') confirmedHeads += guest.amount ?? 1;
    else if (guest.rsvpStatus === 'pending') pendingHeads += guest.amount ?? 1;
  }

  return { confirmedHeads, pendingHeads };
}

export function seatedHeads(occupancy: TableOccupancy): number {
  return occupancy.confirmedHeads + occupancy.pendingHeads;
}

export function freeSeats(capacity: number, occupancy: TableOccupancy): number {
  return Math.max(capacity - seatedHeads(occupancy), 0);
}

/**
 * Whether a party fits, measured against the Table's *total* occupancy rather
 * than the part of it the current collaborator can see. A scoped Seating
 * Manager who validated against visible guests alone would overbook the Table.
 */
export function fitsIn(table: TableView, partyHeads: number): boolean {
  return partyHeads <= table.freeSeats;
}

export function shortfall(table: TableView, partyHeads: number): number {
  return Math.max(partyHeads - table.freeSeats, 0);
}

/**
 * The guest-record and guest-head portion of plan progress.
 *
 * Split out from {@link composeProgress} because it is the one part that a
 * scoped Seating Manager cannot compute from what they can see: their guest
 * list is RLS-filtered, so counting confirmed records off it would report the
 * plan finished while out-of-scope records sit unseated. The Event-wide truth
 * comes from the `event_seating_progress` aggregate; this same shape is used
 * client-side to take a *delta* of the records the collaborator did move.
 */
export interface GuestProgressCounts {
  confirmedRecordsTotal: number;
  confirmedRecordsSeated: number;
  confirmedGuestsTotal: number;
  confirmedGuestsSeated: number;
  pendingGuestsUnseated: number;
}

export function guestProgressCounts(
  guests: GuestWithGroupApp[],
): GuestProgressCounts {
  const confirmed = guests.filter((g) => g.rsvpStatus === 'confirmed');
  const confirmedSeated = confirmed.filter((g) => g.tableId !== null);
  const pendingUnseated = guests.filter(
    (g) => g.rsvpStatus === 'pending' && g.tableId === null,
  );

  return {
    confirmedRecordsTotal: confirmed.length,
    confirmedRecordsSeated: confirmedSeated.length,
    confirmedGuestsTotal: headCount(confirmed),
    confirmedGuestsSeated: headCount(confirmedSeated),
    pendingGuestsUnseated: headCount(pendingUnseated),
  };
}

/**
 * The plan is complete when every confirmed Guest Record has a Table.
 * Unseated pending records are a visible provisional warning, never a blocker -
 * a couple should not be told their plan is unfinished because a cousin has yet
 * to reply.
 *
 * `seatedHeads` and `totalCapacity` are Table-derived and stay truthful on any
 * client, scoped or not, because {@link TableView.seatedHeads} already carries
 * out-of-scope heads. Only `counts` needs to come from the privileged aggregate.
 */
export function composeProgress(
  tables: TableView[],
  counts: GuestProgressCounts,
): SeatingProgressView {
  return {
    ...counts,
    seatedHeads: tables.reduce((total, t) => total + t.seatedHeads, 0),
    totalCapacity: tables.reduce((total, t) => total + t.table.capacity, 0),
    isComplete:
      counts.confirmedRecordsTotal > 0 &&
      counts.confirmedRecordsSeated === counts.confirmedRecordsTotal,
  };
}

export function computeProgress(
  tables: TableView[],
  guests: GuestWithGroupApp[],
): SeatingProgressView {
  return composeProgress(tables, guestProgressCounts(guests));
}

export function readyPercent(progress: SeatingProgressView): number {
  if (progress.confirmedRecordsTotal === 0) return 0;
  return Math.round(
    (progress.confirmedRecordsSeated / progress.confirmedRecordsTotal) * 100,
  );
}
