// Components
// Imported directly from its own file, not the ./components barrel - that
// barrel also exports SchedulesPage (a Server Component with a server-only
// queries/catalog.ts -> next/headers dependency chain), which would leak
// into any client bundle that imports anything from this root barrel.
export { SchedulesHeader } from './components/schedules-header';
export { GuestJourneySteps } from './components/guest-journey';
export { RESULT_TONE, type ResultTone } from './components/results-presentation';

// Actions
export {
  executeSchedule,
  type ExecuteScheduleResult,
  type WhatsAppSendResult,
  sendSelectedDeliveriesAdmin,
  type ManualSendResult,
  sendCatchUp,
  type CatchUpSendState,
} from './actions';

// Utils
export {
  filterGuestsByTarget,
  inAudience,
  audienceLabelKey,
  isMessageSchedule,
  validatePhoneNumber,
  classifyWhatsAppFailure,
  describeGuestLevelFailure,
  type WhatsAppFailureSide,
  isSmsFallbackTrigger,
  smsFallbackReason,
  deliveryFallbackReason,
  type SmsFallbackReason,
  buildCalendarEntry,
  toIcs,
  toGoogleCalendarUrl,
  type CalendarEntry,
  comparePlanOrder,
  numberPlan,
  planEntryFromRow,
  type PlanEntry,
  dueTimeIssue,
  type DueTimeIssue,
  lastDueDay,
  isFollowUpConfirmation,
  DEFAULT_SEND_TIME,
} from './utils';

export type { GuestInteractionRow } from './utils/delivery-outcome';

// Schemas/Types
export {
  type ScheduleApp,
  type ScheduleDb,
  type ScheduleTypeKey,
  type MessageTemplateApp,
  type WhatsAppTemplateApp,
  type MessageDeliveryApp,
  type DefaultScheduleApp,
  type ExecutionKind,
  SCHEDULE_TYPE_KEYS,
  SCHEDULE_TYPE_LABELS,
  SCHEDULE_STATUSES,
  EXECUTION_KINDS,
  DELIVERY_METHODS,
  DELIVERY_STATUSES,
} from './schemas';
