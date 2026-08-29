// Components
export { SeatingPage, TableSeatDiagram, OccupancyBar } from './components';

// Actions (server-only)
export {
  createTable,
  createTablesBatch,
  updateTable,
  deleteTable,
  updateTablePosition,
  assignGuestsToTable,
  type SeatingActionState,
  type SeatingFailure,
  type UpsertTableState,
  type BatchCreateTablesState,
  type DeleteTableState,
  type UpdatePositionState,
  type AssignGuestsState,
} from './actions';

// Schemas
export {
  TABLE_SHAPES,
  MIN_CAPACITY,
  MAX_CAPACITY,
  DEFAULT_CAPACITY,
  MAX_TABLE_NUMBER,
  TableAppSchema,
  TableDbSchema,
  TableDbToAppTransformerSchema,
  TableUpsertSchema,
  TableAppToDbTransformerSchema,
  TableBatchCreateSchema,
  TableWithGuestsAppSchema,
  type TableShape,
  type TableApp,
  type TableDb,
  type TableUpsert,
  type TableDbUpsert,
  type TableBatchCreate,
  type TableWithGuestsApp,
} from './schemas';

// Types
export type {
  SeatingPageData,
  SeatingProgressView,
  TableOccupancy,
  TableOption,
  TableView,
  DraggableGuestData,
  DraggableTableData,
  DraggableData,
  DroppableTableData,
  DroppableUnassignedData,
  DroppableData,
  SeatingPageProps,
} from './types';

// Utils (pure)
export {
  rsvpSortKey,
  headCount,
  splitHeads,
  freeSeats,
  computeProgress,
  readyPercent,
} from './utils/occupancy';
export { seatLayout, tableFootprint } from './utils/seat-layout';
export { groupColor, type SeatColor } from './utils/group-color';
export { nextFreePosition, batchPositions } from './utils/auto-place';

// Note: getEventTables, getEventTableOptions and getSeatingPageData are
// exported from '@/features/seating/queries' to avoid importing server-only
// code into client components
