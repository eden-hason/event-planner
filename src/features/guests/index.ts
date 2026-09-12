// Components
export {
  GuestsPage,
  GuestForm,
  GuestDirectory,
  GuestSearch,
  GuestStats,
  RsvpPill,
  RsvpDot,
  GuestImportFlow,
} from './components';

// Actions (server-only)
export {
  upsertGuest,
  deleteGuest,
  importGuests,
  analyzeCsv,
  upsertGroup,
  deleteGroups,
  updateGroupMembers,
  type UpsertGuestState,
  type DeleteGuestState,
  type ImportGuestsState,
  type AnalyzeCsvMapping,
  type AnalyzeCsvResult,
  type AnalyzeCsvState,
  type UpsertGroupState,
  type DeleteGroupsState,
  type UpdateGroupMembersState,
} from './actions';

// Hooks (client)
export {
  useGuestFilters,
  useGuestsTable,
  type GuestSortKey,
} from './hooks';

// Utils
export {
  transformCsvRow,
  validateCsvRow,
  validateCsvRows,
  validateGuestData,
  normalizePhone,
  autoFixPhone,
  parseCSVFile,
  getSampleData,
  exportGuestsToIplan,
  rsvpPresentation,
  RSVP_STATUSES,
  RSVP_LABEL_NAMESPACE,
  DIETARY_PRESETS,
  type ValidatedRow,
  type FieldErrors,
  type ParsedCSV,
  type IplanScope,
  type RsvpStatus,
  type RsvpPresentation,
} from './utils';

// Schemas/Types
export {
  israeliMobilePhoneSchema,
  GuestAppSchema,
  GuestWithGroupAppSchema,
  GuestDbSchema,
  DbToAppTransformerSchema,
  GuestUpsertSchema,
  AppToDbTransformerSchema,
  GroupInfoSchema,
  GroupAppSchema,
  GroupWithGuestsAppSchema,
  GroupDbSchema,
  GroupDbToAppTransformerSchema,
  GroupUpsertSchema,
  GroupAppToDbTransformerSchema,
  ImportGuestSchema,
  normalizeSide,
  resolveImportErrorMessage,
  GROUP_ICONS,
  GROUP_SIDES,
  GROUP_SIDE_LABELS,
  IMPORT_ERROR_MESSAGES,
  type GuestApp,
  type GuestWithGroupApp,
  type GuestDb,
  type GuestUpsert,
  type GuestDbUpsert,
  type GroupInfo,
  type GroupApp,
  type GroupWithGuestsApp,
  type GroupDb,
  type GroupUpsert,
  type GroupDbUpsert,
  type GroupIcon,
  type GroupSide,
  type ImportGuestData,
} from './schemas';

// Note: getEventGuests, getEventGuestsWithGroups, getEventGuestPhones,
// getEventGroups, and getEventGroupsWithGuests are exported from
// '@/features/guests/queries' to avoid importing server-only code into client
// components
