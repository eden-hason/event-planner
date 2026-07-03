// Components
export { SeatingPage, SeatingMobilePlaceholder } from './components';

// Actions (server-only)
export {
  createTable,
  updateTable,
  deleteTable,
  updateTablePosition,
  assignGuestToTable,
  type UpsertTableState,
  type DeleteTableState,
  type UpdatePositionState,
  type AssignGuestState,
} from './actions';

// Schemas
export {
  TABLE_SHAPES,
  TableAppSchema,
  TableDbSchema,
  TableDbToAppTransformerSchema,
  TableUpsertSchema,
  TableAppToDbTransformerSchema,
  TableWithGuestsAppSchema,
  type TableShape,
  type TableApp,
  type TableDb,
  type TableUpsert,
  type TableDbUpsert,
  type TableWithGuestsApp,
} from './schemas';

// Types
export type {
  SeatingStatsView,
  SeatingPageData,
  TableOccupancy,
  DraggableGuestData,
  DraggableTableData,
  DraggableData,
  DroppableTableData,
  DroppableUnassignedData,
  DroppableData,
  SeatingPageProps,
  Table,
} from './types';

// Utils (pure)
export { tableOccupancy, rsvpSortKey } from './utils/occupancy';
export { groupColor, type SeatColor } from './utils/group-color';
export { nextFreePosition } from './utils/auto-place';

// Note: getEventTables and getSeatingPageData are exported from
// '@/features/seating/queries' to avoid importing server-only code into
// client components
