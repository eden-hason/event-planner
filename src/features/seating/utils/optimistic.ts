import type { GuestWithGroupApp } from '@/features/guests';
import type { TableApp, TableOccupancy, TableView } from '../types';

/**
 * Local echoes of a mutation, applied while the Server Action is in flight.
 *
 * These adjust a Table's counters by the delta of the records that actually
 * moved rather than recomputing it from its guests, so a concurrent change the
 * server has already counted is never dropped.
 */

const headsOf = (guest: GuestWithGroupApp) => guest.amount ?? 1;

function withGuest(
  occupancy: TableOccupancy,
  guest: GuestWithGroupApp,
  direction: 1 | -1,
): TableOccupancy {
  const heads = headsOf(guest) * direction;
  const isPending = guest.rsvpStatus === 'pending';

  return {
    confirmedHeads: occupancy.confirmedHeads + (isPending ? 0 : heads),
    pendingHeads: occupancy.pendingHeads + (isPending ? heads : 0),
    records: occupancy.records + direction,
  };
}

function rebuild(
  table: TableApp,
  guests: GuestWithGroupApp[],
  occupancy: TableOccupancy,
): TableView {
  const seatedHeads = occupancy.confirmedHeads + occupancy.pendingHeads;

  return {
    table,
    guests,
    occupancy,
    seatedHeads,
    freeSeats: Math.max(table.capacity - seatedHeads, 0),
  };
}

export interface SeatingState {
  tables: TableView[];
  guests: GuestWithGroupApp[];
}

/**
 * Moves whole Guest Records between Tables. A record is never split: every
 * person it represents goes to the same Table or none (ADR-0008).
 * A null `tableId` unassigns.
 */
export function applyAssignment(
  state: SeatingState,
  guestIds: string[],
  tableId: string | null,
): SeatingState {
  const ids = new Set(guestIds);
  const moving = state.guests.filter((guest) => ids.has(guest.id));
  if (moving.length === 0) return state;

  const guests = state.guests.map((guest) =>
    ids.has(guest.id) ? { ...guest, tableId } : guest,
  );

  const tables = state.tables.map((view) => {
    const leaving = view.guests.filter((guest) => ids.has(guest.id));
    // Every mover is added back to the destination, including one that was
    // already sitting there: it is subtracted as `leaving` and re-added here,
    // which nets to zero. Filtering it out instead would delete it.
    const arriving = view.table.id === tableId ? moving : [];

    if (leaving.length === 0 && arriving.length === 0) return view;

    let occupancy = view.occupancy;
    for (const guest of leaving) occupancy = withGuest(occupancy, guest, -1);
    for (const guest of arriving) occupancy = withGuest(occupancy, guest, 1);

    const remaining = view.guests.filter((guest) => !ids.has(guest.id));
    const next = [...remaining, ...arriving.map((g) => ({ ...g, tableId }))];

    return rebuild(view.table, next, occupancy);
  });

  return { tables, guests };
}

/**
 * Reverse an optimistic assignment by returning each record to the Table it
 * came from, applied as a delta on the *current* state rather than by restoring
 * a snapshot. A snapshot rollback would also undo any later mutation that
 * succeeded on other records; this only touches the records that actually moved.
 */
export function revertAssignment(
  state: SeatingState,
  origins: Array<{ id: string; tableId: string | null }>,
): SeatingState {
  const byOrigin = new Map<string | null, string[]>();
  for (const { id, tableId } of origins) {
    const bucket = byOrigin.get(tableId);
    if (bucket) bucket.push(id);
    else byOrigin.set(tableId, [id]);
  }

  let next = state;
  for (const [tableId, ids] of byOrigin) {
    next = applyAssignment(next, ids, tableId);
  }
  return next;
}

/**
 * Re-insert a Table an optimistic removal took out, and return to it any of its
 * Guest Records still sitting in Unassigned. Applied as a delta so a concurrent
 * successful mutation is preserved. A no-op if the Table is already back.
 */
export function restoreRemovedTable(
  state: SeatingState,
  view: TableView,
  guestIds: string[],
): SeatingState {
  if (state.tables.some((v) => v.table.id === view.table.id)) return state;

  const ids = new Set(guestIds);
  return {
    tables: [...state.tables, view].sort(
      (a, b) => a.table.tableNumber - b.table.tableNumber,
    ),
    guests: state.guests.map((guest) =>
      ids.has(guest.id) && guest.tableId === null
        ? { ...guest, tableId: view.table.id }
        : guest,
    ),
  };
}

/** Canvas position, which carries no capacity meaning and so touches nothing else. */
export function applyPosition(
  state: SeatingState,
  tableId: string,
  positionX: number,
  positionY: number,
): SeatingState {
  return {
    ...state,
    tables: state.tables.map((view) =>
      view.table.id === tableId
        ? { ...view, table: { ...view.table, positionX, positionY } }
        : view,
    ),
  };
}

/** Shape or capacity changed. Occupancy is untouched; only free seats move. */
export function applyTableUpdate(
  state: SeatingState,
  table: TableApp,
): SeatingState {
  return {
    ...state,
    tables: state.tables
      .map((view) =>
        view.table.id === table.id
          ? rebuild(table, view.guests, view.occupancy)
          : view,
      )
      // Tables are canonically ordered by ascending number (ADR-0008), so an
      // edited number re-sorts the lists without moving anything on the canvas.
      .sort((a, b) => a.table.tableNumber - b.table.tableNumber),
  };
}

/** Deleting a Table returns its Guest Records to Unassigned; it deletes none of them. */
export function applyTableRemoval(state: SeatingState, tableId: string): SeatingState {
  return {
    tables: state.tables.filter((view) => view.table.id !== tableId),
    guests: state.guests.map((guest) =>
      guest.tableId === tableId ? { ...guest, tableId: null } : guest,
    ),
  };
}
