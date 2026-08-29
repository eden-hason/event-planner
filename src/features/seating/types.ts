import type { GuestWithGroupApp } from '@/features/guests/schemas';
import type { TableApp } from './schemas';

export type { TableApp, TableShape, TableWithGuestsApp } from './schemas';

/**
 * What one Table holds, in the two units ADR-0009 keeps apart.
 *
 * Heads are what capacity is measured in; records are what progress is
 * measured in. `visibleRecords` and `visibleHeads` cover only the Guest Records
 * the current collaborator may identify, so `records - visibleRecords` is the
 * anonymized "outside your scope" count. Every capacity check uses the totals.
 */
export interface TableOccupancy {
  confirmedHeads: number;
  pendingHeads: number;
  records: number;
  visibleRecords: number;
  visibleHeads: number;
}

export interface TableView {
  table: TableApp;
  /** Guest Records seated here that the current collaborator may identify. */
  guests: GuestWithGroupApp[];
  occupancy: TableOccupancy;
  /** Total heads reserved here, confirmed and provisional alike. */
  seatedHeads: number;
  /** Places left. Never negative: capacity is a hard invariant. */
  freeSeats: number;
  outOfScopeRecords: number;
  outOfScopeHeads: number;
  /** A Seating Manager may not delete a Table holding guests they cannot see. */
  canDelete: boolean;
}

/**
 * Plan readiness (ADR-0009).
 *
 * The headline percentage and completeness are counted in Guest Records, so one
 * large family cannot swing the number more than a dozen couples:
 * `confirmedRecordsSeated / confirmedRecordsTotal`. The supporting lines on the
 * bar are counted in guests (summed `amount`), because "8 guests still need a
 * seat" is what a planner acts on. Pending guests are reported beside the
 * confirmed count and never folded in, so a plan is not shown as incomplete
 * because someone has yet to reply.
 */
export interface SeatingProgressView {
  /** Confirmed Guest Records - drives the headline percentage and completeness. */
  confirmedRecordsTotal: number;
  confirmedRecordsSeated: number;
  /** Guests (summed `amount`) - drives the guest-count lines on the bar. */
  confirmedGuestsTotal: number;
  confirmedGuestsSeated: number;
  pendingGuestsUnseated: number;
  seatedHeads: number;
  totalCapacity: number;
  isComplete: boolean;
}

export interface SeatingPageData {
  tables: TableView[];
  guests: GuestWithGroupApp[];
  unassignedGuests: GuestWithGroupApp[];
  progress: SeatingProgressView;
}

/**
 * A Table reduced to what a picker needs. Carries the confirmed/provisional
 * split rather than guest rows, so the Guest Directory can show every Table's
 * true occupancy without loading the Seating Plan.
 */
export interface TableOption {
  id: string;
  tableNumber: number;
  label: string | null;
  capacity: number;
  confirmedHeads: number;
  pendingHeads: number;
}

export interface DraggableGuestData {
  type: 'guest';
  guestId: string;
  currentTableId: string | null;
}

export interface DraggableTableData {
  type: 'table';
  tableId: string;
  /** Current world position, so the snap modifier can quantize the drag. */
  positionX: number;
  positionY: number;
}

export type DraggableData = DraggableGuestData | DraggableTableData;

export interface DroppableTableData {
  type: 'table';
  tableId: string;
}

export interface DroppableUnassignedData {
  type: 'unassigned';
}

export type DroppableData = DroppableTableData | DroppableUnassignedData;

export type SeatingPageProps = SeatingPageData & {
  eventId: string;
  groups: Array<{ id: string; name: string; icon: string | null }>;
  /** Scoped collaborators get the board 1f treatment: full capacity, no names. */
  isScopedCollaborator: boolean;
};
