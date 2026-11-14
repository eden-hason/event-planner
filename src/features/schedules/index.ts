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
  updateMessageMedia,
  type UpdateMessageMediaState,
} from './actions';
export {
  messageMediaState,
  followUpAttachment,
  type MessageMediaState,
} from './utils/message-media';

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
  hasHandDelivery,
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

// The current Message Plan's messages (ADR 0055): pure, so the editor and the
// preview can use them in the browser. The send path imports
// './message-plan' directly; Meta's create payloads stay out of the barrel.
export {
  STAGES,
  STAGE_SCHEDULE_TYPE,
  stageOfScheduleType,
  isAskStage,
  templateNameFor,
  type Stage,
  type MessageShape,
  MESSAGE_FIELDS,
  messageFieldsFor,
  type MessageFieldKey,
  type MessageFieldDefinition,
  wrapperFor,
  PARAGRAPH_SEPARATOR,
  PERSONAL_TEXT_MAX_LENGTH,
  PERSONAL_TEXT_MAX_PARAGRAPHS,
  parsePersonalText,
  serialisePersonalText,
  normalisePersonalText,
  isBlankPersonalText,
  validatePersonalText,
  personalTextLength,
  type PersonalText,
  type PersonalTextError,
  composeMessage,
  buildMessageLinks,
  type ComposedMessage,
  type RenderRefusal,
  type MessagePlanEvent,
  type MessagePlanGuest,
  type MessagePlanSchedule,
  type MessageLinks,
} from './message-plan';

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
