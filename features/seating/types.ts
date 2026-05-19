import type { GuestWithGroupApp } from '@/features/guests/schemas';
import type { TableApp, TableWithGuestsApp } from './schemas';

export type { TableApp, TableShape, TableWithGuestsApp } from './schemas';

export interface SeatingStatsView {
  totalGuests: number;
  totalHeadCount: number;
  seatedGuestCount: number;
  seatedHeadCount: number;
  totalCapacity: number;
  totalTables: number;
  fullTables: number;
}

export interface SeatingPageData {
  tables: TableWithGuestsApp[];
  guests: GuestWithGroupApp[];
  unassignedGuests: GuestWithGroupApp[];
  stats: SeatingStatsView;
}

export interface TableOccupancy {
  seatedHeadCount: number;
  capacity: number;
  isOverCapacity: boolean;
}

export interface DraggableGuestData {
  type: 'guest';
  guestId: string;
  currentTableId: string | null;
}

export interface DraggableTableData {
  type: 'table';
  tableId: string;
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
};

// Re-export TableApp for legacy import paths
export type Table = TableApp;
